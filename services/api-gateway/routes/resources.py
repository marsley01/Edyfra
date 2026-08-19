from fastapi import APIRouter, Request, HTTPException, Query
from typing import Optional
from datetime import datetime, timezone
import urllib.parse

from utils.supabase import supabase, execute_async
from models.responses import StandardResponse, ResponseMeta
from models.requests import BookMatchRequest
from routes.ai import ask_gemini
from utils.cache import cache


router = APIRouter(prefix="/v1/resources", tags=["Resources"])


@router.get("", response_model=StandardResponse)
async def search_resources(
    request: Request,
    subject: Optional[str] = None,
    level: Optional[str] = None,
    resource_type: Optional[str] = None,
    q: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50)
):
    """
    Searches the approved resource library.
    Scope required: resources.read
    """
    try:
        query = (
            supabase.table("resources")
            .select("id, title, subject, education_level, resource_type, topic, description, price, rating, downloads")
            .eq("status", "approved")
        )
        if subject:
            query = query.ilike("subject", f"%{subject}%")
        if level:
            query = query.eq("education_level", level)
        if resource_type:
            query = query.eq("resource_type", resource_type)
        if q:
            query = query.ilike("title", f"%{q}%")

        res = await execute_async(query.order("created_at", desc=True))
        items = res.data or []

        start = (page - 1) * limit
        paginated = items[start:start + limit]

        rate_remaining = getattr(request.state, "rate_limit_remaining", 0)
        return StandardResponse(
            data={
                "resources": paginated,
                "total": len(items),
                "page": page,
                "limit": limit,
            },
            meta=ResponseMeta(rate_limit_remaining=rate_remaining)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch resources: {str(e)}")


@router.get("/daily-challenge", response_model=StandardResponse)
async def get_daily_challenge(request: Request):
    """
    Returns today's Daily Challenge question.
    Scope required: resources.read
    """
    try:
        res = await execute_async(
            supabase.table("DailyChallenge")
            .select("id, subject, level, question, options, answer, explanation")
            .eq("date", datetime.now(timezone.utc).date().isoformat())
        )
        if not res.data:
            raise HTTPException(status_code=404, detail="No daily challenge available for today.")

        challenge = res.data[0]
        rate_remaining = getattr(request.state, "rate_limit_remaining", 0)
        return StandardResponse(
            data={
                "id": challenge["id"],
                "subject": challenge["subject"],
                "level": challenge["level"],
                "question": challenge["question"],
                "options": challenge.get("options", []),
                "answer": challenge.get("answer"),
                "explanation": challenge.get("explanation"),
            },
            meta=ResponseMeta(rate_limit_remaining=rate_remaining)
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch daily challenge: {str(e)}")


@router.post("/match")
async def match_resources(payload: BookMatchRequest, request: Request):
    """
    Returns matched tutors, an AI summary, and related study rooms for a book.
    Scope required: resources.read
    """
    try:
        cache_key = f"match_{payload.subject}_{payload.grade_level}"
        cached_data = cache.get(cache_key)
        
        if cached_data:
            return cached_data

        # 1. AI Summary
        prompt = (
            f"You are an academic assistant. Generate a 2-sentence summary of what studying "
            f"the subject '{payload.subject}' at the '{payload.grade_level}' level covers, "
            f"specifically related to the book '{payload.book_title}'. Keep it under 60 words."
        )
        ai_summary = await ask_gemini(prompt)

        # 2. Tutors
        tutors = []
        try:
            tutors_res = await execute_async(
                supabase.table("profiles")
                .select("id, name, avatar_url, rating, hourly_rate_kes, subjects, next_available_slot")
                .eq("is_verified", True)
                .eq("is_available", True)
                .contains("subjects", [payload.subject])
                .order("rating", desc=True)
                .limit(3)
            )
            
            for t in (tutors_res.data or []):
                tutors.append({
                    "id": t["id"],
                    "name": t.get("name"),
                    "avatar_url": t.get("avatar_url"),
                    "rating": t.get("rating"),
                    "hourly_rate_kes": t.get("hourly_rate_kes"),
                    "subjects": t.get("subjects"),
                    "next_available_slot": t.get("next_available_slot"),
                    "profile_url": f"https://edyfra-v2.vercel.app/tutors/{t['id']}"
                })
        except Exception:
            # If Supabase profile query fails, graceful fallback to empty tutors list
            pass

        # 3. Deep link
        base_url = "https://edyfra-v2.vercel.app/book-match"
        params = {
            "subject": payload.subject,
            "source": "kls",
            "utm_source": "kls",
            "utm_medium": "api",
            "utm_campaign": "book-match"
        }
        deep_link = f"{base_url}?{urllib.parse.urlencode(params)}"

        # 4. Study rooms
        study_rooms = []
        try:
            sess_res = await execute_async(
                supabase.table("Session")
                .select("id, topic, subject, startedAt")
                .eq("status", "ACTIVE")
                .ilike("subject", f"%{payload.subject}%")
                .limit(3)
            )
            
            for s in (sess_res.data or []):
                study_rooms.append({
                    "id": s["id"],
                    "name": s.get("topic") or f"{s.get('subject')} Session",
                    "active_members": 2, # standard 1-on-1 session active size
                    "join_url": f"https://edyfra-v2.vercel.app/rooms/{s['id']}"
                })
        except Exception:
            pass

        data = {
            "tutors": tutors,
            "ai_summary": ai_summary,
            "deep_link": deep_link,
            "study_rooms": study_rooms
        }

        # Cache for 5 minutes (300 seconds)
        cache.set(cache_key, data, ttl_seconds=300)

        return data

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to match resources: {str(e)}")