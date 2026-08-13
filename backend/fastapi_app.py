"""
Edyfra Python Backend — FastAPI server.

Handles heavy compute: matching algorithm, analytics aggregation,
and AI agent inference. Called by Next.js via the /api/python/* proxy.
"""

import os
from contextlib import asynccontextmanager
from dataclasses import dataclass
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from db import close_pool, query, query_one
from matching import (
    execute_smart_matching,
    find_tier1_match,
    find_tier2_match,
    find_active_group_session,
    sweep_and_ai_fallback,
)
from analytics import (
    institution_overview,
    performance_trend,
    flagged_students,
    student_full_profile,
)
from ai import (
    generate_student_insight,
    generate_challenge,
    generate_session_summary,
)
from bookings import (
    get_tutor_availability,
    save_tutor_availability,
    get_verified_tutors,
    search_tutors,
    get_tutors_by_subject,
    get_incoming_requests,
    get_upcoming_tutor_bookings,
    get_upcoming_student_bookings,
    create_booking,
    update_booking_status,
    get_booking_session_data,
    convert_booking_to_mash_ai,
    expire_pending_bookings,
    get_expired_bookings_with_students,
    get_tutor_stats,
    get_booking_by_id,
    get_booking_for_status_update,
    update_booking_meeting_url,
    create_booking_reminders,
)

load_dotenv()


# ─── Lifecycle ─────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await close_pool()


app = FastAPI(
    title="Edyfra Python Engine",
    version="0.1.0",
    lifespan=lifespan,
)

# Allowed origins: local dev + all production Vercel deployments + custom domain.
# Add any new preview/staging URLs here or set CORS_ORIGINS env var (comma-separated).
_extra_origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://edyfra-v2.vercel.app",
        "https://edyfra.com",
        "https://www.edyfra.com",
        *_extra_origins,
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Health ───────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "service": "edyfra-python-engine"}


# ─── Matching ──────────────────────────────────────────────────────────────────

class MatchRequestPayload(BaseModel):
    matchRequestId: str
    skipAI: bool = False


class MatchQueryPayload(BaseModel):
    studentId: str
    subject: str
    educationLevel: str | None = None


class Tier2Payload(BaseModel):
    studentId: str
    subjects: list[str]


@app.post("/matching/execute")
async def api_execute_smart_matching(payload: MatchRequestPayload):
    result = await execute_smart_matching(payload.matchRequestId, payload.skipAI)
    return result


@app.post("/matching/tier1")
async def api_find_tier1(payload: MatchQueryPayload):
    partner_id = await find_tier1_match(
        payload.studentId,
        payload.subject,
        payload.educationLevel,
    )
    return {"partnerId": partner_id}


@app.post("/matching/tier2")
async def api_find_tier2(payload: Tier2Payload):
    partner_id = await find_tier2_match(payload.studentId, payload.subjects)
    return {"partnerId": partner_id}


@app.get("/matching/group/{subject}")
async def api_find_group(subject: str, educationLevel: str | None = None):
    result = await find_active_group_session(subject, educationLevel)
    if not result:
        raise HTTPException(status_code=404, detail="No active group session found")
    return result


@app.post("/matching/sweep")
async def api_sweep():
    return await sweep_and_ai_fallback()


# ─── Analytics ─────────────────────────────────────────────────────────────────

@app.get("/analytics/institution/{institution_id}/overview")
async def api_institution_overview(institution_id: str):
    return await institution_overview(institution_id)


@app.get("/analytics/institution/{institution_id}/trend")
async def api_performance_trend(institution_id: str):
    return await performance_trend(institution_id)


@app.get("/analytics/institution/{institution_id}/flagged")
async def api_flagged_students(
    institution_id: str,
    term: str,
    year: int,
    threshold: float = 50.0,
):
    return await flagged_students(institution_id, term, year, threshold)


@app.get("/analytics/student/{student_user_id}/profile")
async def api_student_profile(institution_id: str, student_user_id: str):
    return await student_full_profile(institution_id, student_user_id)


# ─── AI ────────────────────────────────────────────────────────────────────────

class InsightPayload(BaseModel):
    studentName: str
    subjectScores: list[dict[str, Any]]
    attendanceRate: float | None = None


class ChallengePayload(BaseModel):
    subject: str
    topic: str | None = None


class SummaryPayload(BaseModel):
    transcript: str
    subject: str
    durationMin: int


@app.post("/ai/student-insight")
async def api_student_insight(payload: InsightPayload):
    insight = await generate_student_insight(
        payload.studentName,
        payload.subjectScores,
        payload.attendanceRate,
    )
    return {"insight": insight}


@app.post("/ai/generate-challenge")
async def api_generate_challenge(payload: ChallengePayload):
    return await generate_challenge(payload.subject, payload.topic)


@app.post("/ai/session-summary")
async def api_session_summary(payload: SummaryPayload):
    summary = await generate_session_summary(
        payload.transcript,
        payload.subject,
        payload.durationMin,
    )
    return {"summary": summary}


# ─── Bookings ─────────────────────────────────────────────────────────────────

VALID_TRANSITIONS: dict[str, list[str]] = {
    "pending": ["confirmed", "declined", "expired"],
    "confirmed": ["active", "cancelled"],
    "active": ["completed", "student_no_show", "tutor_no_show"],
}


class CreateBookingPayload(BaseModel):
    tutorId: str
    subject: str
    topic: str | None = None
    educationLevel: str | None = None
    date: str
    startTime: str
    durationMinutes: int


class UpdateStatusPayload(BaseModel):
    status: str
    reason: str | None = None


class SaveAvailabilitySlot(BaseModel):
    day_of_week: int
    start_time: str
    end_time: str
    is_recurring: bool = True
    is_blocked: bool = False


class SaveAvailabilityPayload(BaseModel):
    tutorId: str
    slots: list[SaveAvailabilitySlot]


# ConvertToMashAI uses only the user context header (X-User-Id) and booking_id path param


class ReminderRow(BaseModel):
    userId: str
    reminderType: str
    scheduledFor: str


class CreateRemindersPayload(BaseModel):
    bookingId: str
    reminders: list[ReminderRow]


@dataclass
class UserContext:
    user_id: str | None = None


def get_user_context(request: Request) -> UserContext:
    uid = request.headers.get("X-User-Id")
    return UserContext(user_id=uid)


@app.get("/bookings/availability/{tutor_id}")
async def api_get_availability(tutor_id: str):
    rows = await get_tutor_availability(tutor_id)
    return {"availability": rows}


@app.post("/bookings/availability")
async def api_save_availability(payload: SaveAvailabilityPayload, request: Request):
    ctx = get_user_context(request)
    if not ctx.user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return await save_tutor_availability(payload.tutorId, [s.model_dump() for s in payload.slots])


@app.get("/bookings/tutors")
async def api_get_tutors(level: str | None = None):
    tutors = await get_verified_tutors(level)
    return {"tutors": tutors}


@app.get("/bookings/tutors/search")
async def api_search_tutors(q: str = ""):
    tutors = await search_tutors(q)
    return {"tutors": tutors}


@app.get("/bookings/tutors/by-subject/{subject}")
async def api_tutors_by_subject(subject: str, level: str | None = None):
    tutors = await get_tutors_by_subject(subject, level)
    return {"tutors": tutors}


@app.get("/bookings/incoming/{tutor_id}")
async def api_incoming_requests(tutor_id: str, request: Request):
    ctx = get_user_context(request)
    if not ctx.user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    requests = await get_incoming_requests(tutor_id)
    return {"requests": requests}


@app.get("/bookings/upcoming/tutor/{tutor_id}")
async def api_upcoming_tutor_bookings(tutor_id: str, request: Request):
    ctx = get_user_context(request)
    if not ctx.user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    bookings = await get_upcoming_tutor_bookings(tutor_id)
    return {"bookings": bookings}


@app.get("/bookings/upcoming/student/{student_id}")
async def api_upcoming_student_bookings(student_id: str, request: Request):
    ctx = get_user_context(request)
    if not ctx.user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    bookings = await get_upcoming_student_bookings(student_id)
    return {"bookings": bookings}


@app.post("/bookings")
async def api_create_booking(payload: CreateBookingPayload, request: Request):
    ctx = get_user_context(request)
    if not ctx.user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    result = await create_booking(
        student_id=ctx.user_id,
        tutor_id=payload.tutorId,
        subject=payload.subject,
        topic=payload.topic,
        date_str=payload.date,
        start_time=payload.startTime,
        duration_minutes=payload.durationMinutes,
        education_level=payload.educationLevel,
    )
    if not result:
        raise HTTPException(status_code=500, detail="Failed to create booking")
    return {"success": True, "bookingId": result["id"], "booking": result}


@app.put("/bookings/{booking_id}/status")
async def api_update_status(booking_id: str, payload: UpdateStatusPayload, request: Request):
    ctx = get_user_context(request)
    if not ctx.user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    booking = await get_booking_for_status_update(booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking["tutor_id"] != ctx.user_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    current = booking["status"]
    allowed = VALID_TRANSITIONS.get(current, [])
    if payload.status not in allowed:
        raise HTTPException(status_code=400, detail=f"Cannot transition from {current} to {payload.status}")

    updated = await update_booking_status(booking_id, payload.status, payload.reason)
    return {"success": True, "booking": updated}


class UpdateMeetingUrlPayload(BaseModel):
    meetingUrl: str | None = None


@app.put("/bookings/{booking_id}/meeting-url")
async def api_update_meeting_url(booking_id: str, payload: UpdateMeetingUrlPayload, request: Request):
    ctx = get_user_context(request)
    if not ctx.user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    booking = await get_booking_for_status_update(booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking["student_id"] != ctx.user_id and booking["tutor_id"] != ctx.user_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    await update_booking_meeting_url(booking_id, payload.meetingUrl)
    return {"success": True}


@app.get("/bookings/{booking_id}/session-data")
async def api_booking_session_data(booking_id: str):
    data = await get_booking_session_data(booking_id)
    if not data:
        raise HTTPException(status_code=404, detail="Booking not found")
    return data


@app.post("/bookings/{booking_id}/convert-to-ai")
async def api_convert_to_mash(booking_id: str, request: Request):
    ctx = get_user_context(request)
    if not ctx.user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")

    booking = await get_booking_by_id(booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking["student_id"] != ctx.user_id:
        raise HTTPException(status_code=403, detail="Forbidden")

    result = await convert_booking_to_mash_ai(booking_id, ctx.user_id)
    if not result:
        raise HTTPException(status_code=500, detail="Failed to convert")
    return {"success": True, "sessionId": result["sessionId"], "roomId": result["roomId"]}


@app.post("/bookings/expire")
async def api_expire_bookings():
    count = await expire_pending_bookings()
    expired_rows = await get_expired_bookings_with_students()
    return {"success": True, "expired": count, "expiredBookings": expired_rows}


@app.post("/bookings/reminders")
async def api_create_reminders(payload: CreateRemindersPayload):
    await create_booking_reminders(payload.bookingId, [r.model_dump() for r in payload.reminders])
    return {"success": True}


@app.get("/tutor/stats/{tutor_id}")
async def api_tutor_stats(tutor_id: str, request: Request):
    ctx = get_user_context(request)
    if not ctx.user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    stats = await get_tutor_stats(tutor_id)
    return stats


# ─── Raw DB Access (for ad-hoc heavy queries) ─────────────────────────────────

class SqlQueryPayload(BaseModel):
    sql: str
    params: list[Any] = []


@app.post("/db/query")
async def api_db_query(payload: SqlQueryPayload):
    try:
        rows = await query(payload.sql, *payload.params)
        return {"rows": rows, "count": len(rows)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ─── Entrypoint (for `python backend/fastapi_app.py`) ──────────────────────────

if __name__ == "__main__":
    import uvicorn
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("fastapi_app:app", host=host, port=port, reload=True)
