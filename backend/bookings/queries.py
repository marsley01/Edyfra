import uuid
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from typing import Any

from db import execute, query, query_one


def _new_id() -> str:
    return uuid.uuid4().hex[:24]


async def get_tutor_availability(tutor_id: str) -> list[dict[str, Any]]:
    rows = await query(
        "SELECT * FROM tutor_availability WHERE tutor_id = $1 ORDER BY day_of_week, start_time",
        tutor_id,
    )
    return rows


async def save_tutor_availability(tutor_id: str, slots: list[dict[str, Any]]) -> dict[str, bool]:
    await execute("DELETE FROM tutor_availability WHERE tutor_id = $1 AND is_recurring = true", tutor_id)
    for slot in slots:
        await execute(
            """
            INSERT INTO tutor_availability (id, tutor_id, day_of_week, start_time, end_time, is_recurring, is_blocked)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            """,
            _new_id(),
            tutor_id,
            slot.get("day_of_week", 0),
            slot.get("start_time", "09:00"),
            slot.get("end_time", "17:00"),
            slot.get("is_recurring", True),
            slot.get("is_blocked", False),
        )
    return {"success": True}


async def get_verified_tutors(level: str | None = None) -> list[dict[str, Any]]:
    sql = """
        SELECT
            u.id, u.name, u.avatar, u.role, u.county, u.bio, u.points,
            tp.*
        FROM "User" u
        INNER JOIN "TutorProfile" tp ON tp.user_id = u.id
        WHERE u.role = 'TUTOR'
    """
    params: list[Any] = []
    if level:
        sql += " AND (tp.levels_taught @> ARRAY[$1] OR tp.levels_taught = ARRAY[]::text[])"
        params.append(level)
    sql += " ORDER BY u.created_at DESC"
    return await query(sql, *params)


async def search_tutors(query_str: str) -> list[dict[str, Any]]:
    if not query_str or len(query_str) < 2:
        return []
    q = query_str.strip().lower()
    return await query(
        """
        SELECT u.id, u.name, u.avatar, u.role, u.county, u.bio, u.points, tp.*
        FROM "User" u
        INNER JOIN "TutorProfile" tp ON tp.user_id = u.id
        WHERE u.role = 'TUTOR'
          AND (LOWER(u.name) LIKE $1 OR LOWER(u.bio) LIKE $1
               OR LOWER(u.county) LIKE $1
               OR EXISTS (SELECT 1 FROM unnest(tp.subjects) s WHERE LOWER(s) LIKE $1))
        ORDER BY tp.rating DESC, u.created_at DESC
        LIMIT 20
        """,
        f"%{q}%",
    )


async def get_tutors_by_subject(subject: str, level: str | None = None) -> list[dict[str, Any]]:
    sql = """
        SELECT u.id, u.name, u.avatar, u.role, u.county, u.bio, u.points, tp.*
        FROM "User" u
        INNER JOIN "TutorProfile" tp ON tp.user_id = u.id
        WHERE u.role = 'TUTOR'
          AND $1 = ANY(tp.subjects)
    """
    params: list[Any] = [subject]
    if level:
        sql += " AND $2 = ANY(tp.levels_taught)"
        params.append(level)
    sql += " ORDER BY tp.rating DESC, u.created_at DESC LIMIT 50"
    return await query(sql, *params)


async def get_incoming_requests(tutor_id: str) -> list[dict[str, Any]]:
    rows = await query(
        """
        SELECT b.*, u.name AS student_name, u.avatar AS student_avatar
        FROM bookings b
        INNER JOIN "User" u ON u.id = b.student_id
        WHERE b.tutor_id = $1
          AND b.status = 'pending'
          AND b.date >= CURRENT_DATE
        ORDER BY b.created_at DESC
        """,
        tutor_id,
    )

    result = []
    for r in rows:
        result.append({
            "id": r["id"],
            "studentId": r["student_id"],
            "tutorId": r["tutor_id"],
            "subject": r["subject"],
            "topic": r["topic"],
            "educationLevel": r.get("education_level"),
            "date": str(r["date"]) if r.get("date") else None,
            "startTime": r["start_time"],
            "endTime": r["end_time"],
            "durationMinutes": r["duration_minutes"],
            "status": r["status"],
            "amount": r.get("amount", 0),
            "paystackReference": r.get("paystack_reference"),
            "declineReason": r.get("decline_reason"),
            "meetingUrl": r.get("meeting_url"),
            "createdAt": str(r["created_at"]) if r.get("created_at") else None,
            "updatedAt": str(r["updated_at"]) if r.get("updated_at") else None,
            "student": {
                "id": r["student_id"],
                "name": r.get("student_name", "Student"),
                "avatar": r.get("student_avatar", ""),
            },
        })
    return result


async def get_upcoming_tutor_bookings(tutor_id: str) -> list[dict[str, Any]]:
    rows = await query(
        """
        SELECT b.*, u.name AS student_name, u.avatar AS student_avatar
        FROM bookings b
        INNER JOIN "User" u ON u.id = b.student_id
        WHERE b.tutor_id = $1
          AND b.status = 'confirmed'
          AND b.date >= CURRENT_DATE
        ORDER BY b.date ASC, b.start_time ASC
        """,
        tutor_id,
    )

    result = []
    for r in rows:
        result.append({
            "id": r["id"],
            "studentId": r["student_id"],
            "tutorId": r["tutor_id"],
            "subject": r["subject"],
            "topic": r["topic"],
            "date": str(r["date"]) if r.get("date") else None,
            "startTime": r["start_time"],
            "endTime": r["end_time"],
            "durationMinutes": r["duration_minutes"],
            "status": r["status"],
            "meetingUrl": r.get("meeting_url"),
            "student": {
                "id": r["student_id"],
                "name": r.get("student_name", "Student"),
                "avatar": r.get("student_avatar", ""),
            },
        })
    return result


async def get_upcoming_student_bookings(student_id: str) -> list[dict[str, Any]]:
    rows = await query(
        """
        SELECT b.*, u.name AS tutor_name, u.avatar AS tutor_avatar
        FROM bookings b
        INNER JOIN "User" u ON u.id = b.tutor_id
        WHERE b.student_id = $1
          AND b.status IN ('confirmed', 'pending')
          AND b.date >= CURRENT_DATE
        ORDER BY b.date ASC, b.start_time ASC
        """,
        student_id,
    )

    result = []
    for r in rows:
        result.append({
            "id": r["id"],
            "studentId": r["student_id"],
            "tutorId": r["tutor_id"],
            "subject": r["subject"],
            "topic": r["topic"],
            "date": str(r["date"]) if r.get("date") else None,
            "startTime": r["start_time"],
            "endTime": r["end_time"],
            "durationMinutes": r["duration_minutes"],
            "status": r["status"],
            "meetingUrl": r.get("meeting_url"),
            "tutor": {
                "id": r["tutor_id"],
                "name": r.get("tutor_name", "Tutor"),
                "avatar": r.get("tutor_avatar", ""),
            },
        })
    return result


async def create_booking(
    student_id: str,
    tutor_id: str,
    subject: str,
    topic: str | None,
    date_str: str,
    start_time: str,
    duration_minutes: int,
    education_level: str | None = None,
) -> dict[str, Any] | None:
    hours, minutes = (int(x) for x in start_time.split(":"))
    end_total = hours * 60 + minutes + duration_minutes
    end_h = (end_total // 60) % 24
    end_m = end_total % 60
    end_time = f"{end_h:02d}:{end_m:02d}"

    booking_id = _new_id()
    row = await query_one(
        """
        INSERT INTO bookings (id, student_id, tutor_id, status, subject, topic, education_level, date, start_time, end_time, duration_minutes)
        VALUES ($1, $2, $3, 'pending', $4, $5, $6, $7::date, $8, $9, $10)
        RETURNING id, student_id, tutor_id, status, subject, topic, date, start_time, end_time, duration_minutes, created_at
        """,
        booking_id,
        student_id,
        tutor_id,
        subject,
        topic,
        education_level,
        date_str,
        start_time,
        end_time,
        duration_minutes,
    )
    if not row:
        return None
    return {
        "id": row["id"],
        "studentId": row["student_id"],
        "tutorId": row["tutor_id"],
        "status": row["status"],
        "subject": row["subject"],
        "topic": row["topic"],
        "date": str(row["date"]) if row.get("date") else None,
        "startTime": row["start_time"],
        "endTime": row["end_time"],
        "durationMinutes": row["duration_minutes"],
        "createdAt": str(row["created_at"]) if row.get("created_at") else None,
    }


async def get_booking_by_id(booking_id: str) -> dict[str, Any] | None:
    return await query_one("SELECT * FROM bookings WHERE id = $1", booking_id)


async def get_booking_for_status_update(booking_id: str) -> dict[str, Any] | None:
    return await query_one(
        """
        SELECT b.*, stu.name AS student_name, tut.name AS tutor_name
        FROM bookings b
        LEFT JOIN "User" stu ON stu.id = b.student_id
        LEFT JOIN "User" tut ON tut.id = b.tutor_id
        WHERE b.id = $1
        """,
        booking_id,
    )


async def update_booking_status(booking_id: str, new_status: str, reason: str | None = None) -> dict[str, Any] | None:
    if reason:
        await execute(
            "UPDATE bookings SET status = $1, decline_reason = $2, updated_at = NOW() WHERE id = $3",
            new_status, reason, booking_id,
        )
    else:
        await execute(
            "UPDATE bookings SET status = $1, updated_at = NOW() WHERE id = $2",
            new_status, booking_id,
        )
    return await get_booking_by_id(booking_id)


async def update_booking_meeting_url(booking_id: str, meeting_url: str | None) -> None:
    await execute(
        "UPDATE bookings SET meeting_url = $1, updated_at = NOW() WHERE id = $2",
        meeting_url, booking_id,
    )


async def get_booking_session_data(booking_id: str) -> dict[str, Any] | None:
    row = await query_one(
        """
        SELECT
            b.*,
            stu.name AS student_name, stu.avatar AS student_avatar,
            tut.name AS tutor_name, tut.avatar AS tutor_avatar
        FROM bookings b
        LEFT JOIN "User" stu ON stu.id = b.student_id
        LEFT JOIN "User" tut ON tut.id = b.tutor_id
        WHERE b.id = $1
        """,
        booking_id,
    )
    if not row:
        return None

    start_hours, start_minutes = (int(x) for x in row["start_time"].split(":"))
    period = "PM" if start_hours >= 12 else "AM"
    display_h = start_hours % 12 or 12
    start_time_eat = f"{display_h}:{start_minutes:02d} {period} EAT"

    return {
        "id": row["id"],
        "tier": "TUTOR",
        "subject": row["subject"],
        "topic": row["topic"],
        "status": "ACTIVE" if row["status"] == "confirmed" else row["status"],
        "studentId": row["student_id"],
        "partnerId": row["tutor_id"],
        "student": {"name": row.get("student_name"), "avatar": row.get("student_avatar")},
        "partner": {"name": row.get("tutor_name"), "avatar": row.get("tutor_avatar")},
        "roomId": row["id"],
        "startTimeEAT": start_time_eat,
        "meetingUrl": row.get("meeting_url"),
    }


async def _decrement_tutor_active_sessions(tutor_id: str) -> None:
    row = await query_one(
        """SELECT current_active_sessions, sessions_responded, sessions_assigned, response_rate
           FROM "TutorProfile" WHERE user_id = $1""",
        tutor_id,
    )
    if not row:
        return
    new_count = max(0, row["current_active_sessions"] - 1)
    new_responded = row["sessions_responded"] + 1
    new_rate = (
        round((new_responded) / max(row["sessions_assigned"] + 1, 1) * 100)
        if new_count == 0
        else row["response_rate"]
    )
    await execute(
        """
        UPDATE "TutorProfile"
        SET current_active_sessions = $1, sessions_responded = $2, response_rate = $3
        WHERE user_id = $4
        """,
        new_count, new_responded, new_rate, tutor_id,
    )


async def convert_booking_to_mash_ai(booking_id: str, student_id: str) -> dict[str, Any] | None:
    booking = await get_booking_by_id(booking_id)
    if not booking:
        return None

    tutor_id = booking["tutor_id"]
    subject = booking["subject"]
    topic = booking.get("topic")

    flag_id = _new_id()
    await execute(
        """
        INSERT INTO session_flags (id, tutor_id, flag_type, booking_id)
        VALUES ($1, $2, 'no_show', $3)
        """,
        flag_id, tutor_id, booking_id,
    )

    await execute(
        "UPDATE bookings SET status = 'tutor_no_show', updated_at = NOW() WHERE id = $1",
        booking_id,
    )

    await _decrement_tutor_active_sessions(tutor_id)

    session_id = _new_id()
    room_id = f"mash-{uuid.uuid4().hex[:16]}"
    await execute(
        """
        INSERT INTO "Session" (id, student_id, partner_id, tier, subject, topic, status, room_id, started_at)
        VALUES ($1, $2, NULL, 'MASH', $3, $4, 'ACTIVE', $5, NOW())
        """,
        session_id, student_id, subject, topic, room_id,
    )

    return {"sessionId": session_id, "roomId": room_id}


async def expire_pending_bookings() -> int:
    two_hours_ago = datetime.utcnow() - timedelta(hours=2)
    result = await execute(
        "UPDATE bookings SET status = 'expired', updated_at = NOW() WHERE status = 'pending' AND created_at < $1",
        two_hours_ago.isoformat(),
    )
    count = int(result.split()[-1]) if result else 0
    return count


async def get_expired_bookings_with_students() -> list[dict[str, Any]]:
    two_hours_ago = datetime.utcnow() - timedelta(hours=2)
    return await query(
        """
        SELECT b.id, b.student_id, b.tutor_id, u.name AS tutor_name
        FROM bookings b
        LEFT JOIN "User" u ON u.id = b.tutor_id
        WHERE b.status = 'expired' AND b.created_at < $1
        """,
        two_hours_ago.isoformat(),
    )


async def get_tutor_stats(tutor_id: str) -> dict[str, Any]:
    active = await query_one(
        """SELECT COUNT(*) AS cnt FROM "Session" WHERE partner_id = $1 AND status = 'ACTIVE'""",
        tutor_id,
    )
    completed = await query_one(
        """SELECT COUNT(*) AS cnt FROM "Session" WHERE partner_id = $1 AND status = 'COMPLETED'""",
        tutor_id,
    )
    earnings = await query_one(
        """SELECT COALESCE(SUM(price_ksh), 0) AS total FROM "Session" WHERE partner_id = $1 AND status = 'COMPLETED'""",
        tutor_id,
    )

    return {
        "activeSessions": active["cnt"] if active else 0,
        "completedSessions": completed["cnt"] if completed else 0,
        "totalEarnings": earnings["total"] if earnings else 0,
    }


async def create_booking_reminders(booking_id: str, reminders: list[dict[str, Any]]) -> None:
    for r in reminders:
        await execute(
            """
            INSERT INTO booking_reminders (id, booking_id, user_id, reminder_type, scheduled_for, channel)
            VALUES ($1, $2, $3, $4, $5, 'inapp')
            """,
            _new_id(),
            booking_id,
            r["userId"],
            r["reminderType"],
            r["scheduledFor"],
        )
