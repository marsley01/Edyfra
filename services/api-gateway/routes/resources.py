from fastapi import APIRouter, Request, HTTPException, Query
from typing import Optional
from datetime import datetime, timezone

from utils.supabase import supabase, execute_async
from models.responses import StandardResponse, ResponseMeta

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