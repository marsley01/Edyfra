from fastapi import APIRouter, Request, HTTPException

from utils.supabase import supabase, execute_async
from utils.cache import cache
from models.responses import StandardResponse, ResponseMeta

router = APIRouter(prefix="/v1/analytics", tags=["Analytics"])


@router.get("/platform", response_model=StandardResponse)
async def platform_analytics(request: Request):
    """
    Returns aggregated platform analytics (cached for 1 hour).
    Scope required: analytics.read
    """
    cached = cache.get("platform_analytics")
    if cached:
        rate_remaining = getattr(request.state, "rate_limit_remaining", 0)
        return StandardResponse(
            data=cached,
            meta=ResponseMeta(rate_limit_remaining=rate_remaining)
        )

    try:
        # Counts per collection. Keep queries defensive so a missing table
        # cannot take the whole endpoint down.
        def count_all(table: str) -> int:
            try:
                return supabase.table(table).select("id", count="exact").execute().count or 0
            except Exception:
                return 0

        stats = {
            "total_users": count_all("User"),
            "total_tutors": count_all("TutorProfile"),
            "total_resources": count_all("resources"),
            "total_bookings": count_all("bookings"),
            "total_sessions": count_all("Session"),
        }

        cache.set("platform_analytics", stats, 3600)

        rate_remaining = getattr(request.state, "rate_limit_remaining", 0)
        return StandardResponse(
            data=stats,
            meta=ResponseMeta(rate_limit_remaining=rate_remaining)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch platform analytics: {str(e)}")