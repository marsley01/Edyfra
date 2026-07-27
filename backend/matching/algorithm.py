"""
Smart matching engine for Edyfra's "Find Me" section.

Port of src/app/actions/match-algorithm.ts with load-balanced fairness
scoring, tier progression (group -> tutor -> peer -> AI), and atomic
session commits via direct PostgreSQL queries.
"""

import os
import secrets
import math
from datetime import datetime, timezone, timedelta
from typing import Any

from db import query, query_one, execute


SESSION_MATCH_TIMEOUT_MS = 65_000


# ─── Helpers ───────────────────────────────────────────────────────────────────

def _room_id() -> str:
    return f"room-{secrets.token_hex(8)}"


def _mash_room_id() -> str:
    return f"mash-{secrets.token_hex(8)}"


def _now() -> datetime:
    return datetime.now(timezone.utc)


# ─── Tier 0: Group Join ────────────────────────────────────────────────────────

async def find_active_group_session(
    requested_subject: str,
    education_level: str | None = None,
) -> dict[str, Any] | None:
    ten_minutes_ago = _now() - timedelta(minutes=10)

    session = await query_one(
        """
        SELECT id, "roomId", "partnerId", "startedAt"
        FROM "Session"
        WHERE tier = 'TUTOR'
          AND subject = $1
          AND status = 'ACTIVE'
          AND "startedAt" >= $2
          AND "partnerId" IS NOT NULL
        ORDER BY "startedAt" DESC
        LIMIT 1
        """,
        requested_subject, ten_minutes_ago,
    )
    if not session or not session["partnerId"]:
        return None

    tutor = await query_one(
        """
        SELECT availability, "currentActiveSessions", "maxConcurrentSessions"
        FROM "TutorProfile"
        WHERE "userId" = $1
        """,
        session["partnerId"],
    )
    if not tutor:
        return None

    availability = tutor.get("availability") or {}
    is_online = availability.get("isOnline") is True
    has_capacity = tutor["currentActiveSessions"] < tutor["maxConcurrentSessions"]

    if not is_online or not has_capacity:
        return None

    return {
        "sessionId": session["id"],
        "roomId": session["roomId"],
        "tutorId": session["partnerId"],
        "startedAt": session["startedAt"],
    }


async def _try_join_group_session(
    student_id: str,
    match_request_id: str,
    requested_subject: str,
) -> dict[str, Any] | None:
    group = await find_active_group_session(requested_subject)
    if not group:
        return None

    existing = await query_one(
        'SELECT 1 FROM "Message" WHERE "sessionId" = $1 AND "senderId" = $2 LIMIT 1',
        group["sessionId"], student_id,
    )
    if existing:
        return None

    resolved_at = _now()
    await execute(
        """
        INSERT INTO "MatchRequest" ("id", "studentId", "subject", "sessionId", "resolvedAs", "resolvedAt", "createdAt")
        VALUES (gen_random_uuid()::text, $1, $2, $3, 'TUTOR', $4, $4)
        """,
        student_id, requested_subject, group["sessionId"], resolved_at,
    )
    await execute(
        'UPDATE "MatchRequest" SET "sessionId" = $1, "resolvedAs" = \'TUTOR\', "resolvedAt" = $2 WHERE id = $3',
        group["sessionId"], resolved_at, match_request_id,
    )

    return {
        "sessionId": group["sessionId"],
        "roomId": group["roomId"],
        "tutorId": group["tutorId"],
    }


# ─── Tier 1: Tutor Match (Load-Balanced) ──────────────────────────────────────

async def find_tier1_match(
    student_id: str,
    requested_subject: str,
    education_level: str | None = None,
) -> str | None:
    level = education_level or "HIGH_SCHOOL"

    tutors = await query(
        """
        SELECT u.id, tp.*
        FROM "User" u
        JOIN "TutorProfile" tp ON tp."userId" = u.id
        WHERE u.id != $1
          AND u.role = 'TUTOR'
          AND tp.subjects @> ARRAY[$2]::text[]
          AND tp."isVerified" = true
          AND tp."levelsTaught" @> ARRAY[$3]::text[]
          AND NOT EXISTS (
            SELECT 1 FROM "Session" s
            WHERE s."partnerId" = u.id AND s.status = 'ACTIVE'
          )
        ORDER BY tp.rating DESC, u."createdAt" ASC
        LIMIT 20
        """,
        student_id, requested_subject, level,
    )

    eligible = []
    for t in tutors:
        availability = t.get("availability") or {}
        is_online = availability.get("isOnline") is True
        has_capacity = t["currentActiveSessions"] < t["maxConcurrentSessions"]
        if is_online and has_capacity:
            eligible.append(t)

    if not eligible:
        return None

    # Fairness scoring – same logic as TS version
    eligible.sort(key=lambda t: (
        t["currentActiveSessions"],                          # 1. Fewer active sessions first
        0 if t["lastAssignedAt"] is None else 1,             # 2. Never-assigned tutors first
        t.get("lastAssignedAt") or datetime.min.replace(tzinfo=timezone.utc),  # 2b. Earliest assigned first
        -t["rating"],                                         # 3. Higher rating
        t["totalAssignmentsToday"],                           # 4. Fewer assignments today
        secrets.randbits(32),                                 # 5. Random tiebreaker
    ))

    return eligible[0]["id"] if eligible else None


# ─── Tier 2: Peer Match ────────────────────────────────────────────────────────

async def find_tier2_match(
    student_id: str,
    subjects: list[str],
) -> str | None:
    for query_subjects in [subjects, []]:
        peer = await query_one(
            """
            SELECT u.id
            FROM "User" u
            LEFT JOIN "StudentProfile" sp ON sp."userId" = u.id
            WHERE u.id != $1
              AND u.role = 'STUDENT'
              AND ($2::text[] = '{}' OR sp.subjects @> $2::text[])
              AND NOT EXISTS (
                SELECT 1 FROM "Session" s
                WHERE s."studentId" = u.id AND s.status = 'ACTIVE'
              )
            ORDER BY u."streakDays" DESC, u.points DESC, u."createdAt" ASC
            LIMIT 1
            """,
            student_id, query_subjects,
        )
        if peer:
            return peer["id"]

    return None


# ─── Tier 3: AI Fallback ───────────────────────────────────────────────────────

async def create_ai_session(
    match_request_id: str,
    student_id: str,
    subject: str,
    topic: str | None = None,
) -> dict[str, str]:
    room_id = _mash_room_id()
    now = _now()

    session = await query_one(
        """
        INSERT INTO "Session" ("id", "studentId", "partnerId", tier, subject, topic, status, "roomId", "startedAt")
        VALUES (gen_random_uuid()::text, $1, NULL, 'MASH', $2, $3, 'ACTIVE', $4, $5)
        RETURNING id
        """,
        student_id, subject, topic or "General Discussion", room_id, now,
    )
    session_id = session["id"]

    await execute(
        'UPDATE "MatchRequest" SET "sessionId" = $1, "resolvedAs" = \'MASH\', "resolvedAt" = $2 WHERE id = $3',
        session_id, now, match_request_id,
    )

    return {"sessionId": session_id, "roomId": room_id}


# ─── Main Matching Engine ──────────────────────────────────────────────────────

async def execute_smart_matching(
    match_request_id: str,
    skip_ai: bool = False,
) -> dict[str, Any]:
    try:
        match_request = await query_one(
            'SELECT * FROM "MatchRequest" WHERE id = $1',
            match_request_id,
        )
        if not match_request:
            return {"success": False, "error": "Match request not found"}

        if match_request.get("sessionId"):
            return {
                "success": True,
                "sessionId": match_request["sessionId"],
                "tier": match_request.get("resolvedAs"),
            }

        student = await query_one(
            'SELECT * FROM "User" WHERE id = $1',
            match_request["studentId"],
        )
        if not student:
            return {"success": False, "error": "Student not found"}

        student_profile = await query_one(
            'SELECT * FROM "StudentProfile" WHERE "userId" = $1',
            match_request["studentId"],
        )

        # Count available tutors & peers for debug
        available_tutors = await query_one(
            """
            SELECT COUNT(*) as cnt FROM "User" u
            JOIN "TutorProfile" tp ON tp."userId" = u.id
            WHERE u.id != $1
              AND u.role = 'TUTOR'
              AND tp.subjects @> ARRAY[$2]::text[]
              AND NOT EXISTS (
                SELECT 1 FROM "Session" s WHERE s."partnerId" = u.id AND s.status = 'ACTIVE'
              )
            """,
            match_request["studentId"], match_request["subject"],
        )
        available_peers = await query_one(
            """
            SELECT COUNT(*) as cnt FROM "User" u
            JOIN "StudentProfile" sp ON sp."userId" = u.id
            WHERE u.id != $1
              AND u.role = 'STUDENT'
              AND sp.subjects @> ARRAY[$2]::text[]
              AND NOT EXISTS (
                SELECT 1 FROM "Session" s WHERE s."studentId" = u.id AND s.status = 'ACTIVE'
              )
            """,
            match_request["studentId"], match_request["subject"],
        )

        debug_info = {
            "availableTutors": available_tutors["cnt"] if available_tutors else 0,
            "availablePeers": available_peers["cnt"] if available_peers else 0,
            "studentLevel": student.get("educationLevel") or "UNKNOWN",
            "requestedSubject": match_request["subject"],
        }

        elapsed_ms = (_now() - match_request["createdAt"].replace(tzinfo=timezone.utc)).total_seconds() * 1000
        try_tutor = True
        try_peer = elapsed_ms >= 30_000
        try_ai = elapsed_ms >= 55_000 and not skip_ai

        partner_id: str | None = None
        tier: str = "MASH"

        # Step 0: Group session
        if try_tutor:
            group_result = await _try_join_group_session(
                match_request["studentId"],
                match_request_id,
                match_request["subject"],
            )
            if group_result:
                return {
                    "success": True,
                    "partnerId": group_result["tutorId"],
                    "sessionId": group_result["sessionId"],
                    "roomId": group_result["roomId"],
                    "tier": "GROUP",
                    "debug": debug_info,
                }

        # Step 1: Tutor
        if try_tutor:
            tier1 = await find_tier1_match(
                match_request["studentId"],
                match_request["subject"],
                student.get("educationLevel"),
            )
            if tier1:
                partner_id = tier1
                tier = "TUTOR"

        # Step 2: Peer
        if not partner_id and try_peer:
            peer_subjects = (student_profile.get("subjects") or []) if student_profile else [match_request["subject"]]
            tier2 = await find_tier2_match(
                match_request["studentId"],
                peer_subjects,
            )
            if tier2:
                partner_id = tier2
                tier = "PEER"

        # Step 3: AI
        if not partner_id and not try_ai:
            return {"success": False, "error": "Searching for human match...", "debug": debug_info}

        if not partner_id:
            ai_session = await create_ai_session(
                match_request_id,
                match_request["studentId"],
                match_request["subject"],
                match_request.get("topic"),
            )
            return {
                "success": True,
                "sessionId": ai_session["sessionId"],
                "roomId": ai_session["roomId"],
                "tier": "MASH",
                "debug": debug_info,
            }

        # Commit match
        started_at = _now()
        room_id = _room_id()
        session = await query_one(
            """
            INSERT INTO "Session" ("id", "studentId", "partnerId", tier, subject, topic, status, "roomId", "startedAt")
            VALUES (gen_random_uuid()::text, $1, $2, $3::text, $4, $5, 'ACTIVE', $6, $7)
            RETURNING id
            """,
            match_request["studentId"], partner_id, tier,
            match_request["subject"], match_request.get("topic"),
            room_id, started_at,
        )
        session_id = session["id"]

        await execute(
            'UPDATE "MatchRequest" SET "sessionId" = $1, "resolvedAs" = $2::text, "resolvedAt" = $3 WHERE id = $4',
            session_id, tier, started_at, match_request_id,
        )

        if tier == "TUTOR":
            await execute(
                """
                UPDATE "TutorProfile"
                SET "currentActiveSessions" = "currentActiveSessions" + 1,
                    "lastAssignedAt" = $1,
                    "totalAssignmentsToday" = "totalAssignmentsToday" + 1,
                    "sessionsAssigned" = "sessionsAssigned" + 1
                WHERE "userId" = $2
                """,
                started_at, partner_id,
            )

        return {
            "success": True,
            "partnerId": partner_id,
            "sessionId": session_id,
            "roomId": room_id,
            "tier": tier,
            "debug": debug_info,
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "debug": {"availableTutors": 0, "availablePeers": 0, "studentLevel": "UNKNOWN", "requestedSubject": "UNKNOWN"},
        }


# ─── Housekeeping ──────────────────────────────────────────────────────────────

async def sweep_and_ai_fallback() -> dict[str, Any]:
    timeout = _now() - timedelta(milliseconds=SESSION_MATCH_TIMEOUT_MS)

    unmatched = await query(
        'SELECT id FROM "MatchRequest" WHERE "sessionId" IS NULL AND "createdAt" < $1',
        timeout,
    )

    converted = 0
    for req in unmatched:
        result = await execute_smart_matching(req["id"])
        if result.get("success"):
            converted += 1

    return {"success": True, "converted": converted, "total": len(unmatched)}
