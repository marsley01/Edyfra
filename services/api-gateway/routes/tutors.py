from fastapi import APIRouter, Request, HTTPException
from typing import Optional
from utils.supabase import supabase, execute_async
from models.responses import StandardResponse, ResponseMeta
from models.requests import TutorMatchRequest

router = APIRouter(prefix="/v1/tutors", tags=["Tutors"])

@router.get("", response_model=StandardResponse)
async def get_tutors(
    request: Request,
    subject: Optional[str] = None,
    level: Optional[str] = None,
    available_now: Optional[bool] = None,
    min_rating: Optional[float] = None,
    page: int = 1,
    limit: int = 10
):
    """
    Returns a paginated list of verified tutors.
    Scope required: tutors.read
    """
    try:
        res = await execute_async(
            supabase.table("User")
            .select("id, name, avatar, TutorProfile!inner(*)")
        )
        
        tutors = []
        for u in res.data or []:
            tp = u.get("TutorProfile")
            if not tp or not tp.get("isVerified", False):
                continue
                
            if subject and subject.lower() not in [s.lower() for s in tp.get("subjects", [])]:
                continue
                
            if level and level.upper() not in [lvl.upper() for lvl in tp.get("levelsTaught", [])]:
                continue
                
            rating = tp.get("rating", 0.0)
            if min_rating and rating < min_rating:
                continue
                
            availability = tp.get("availability") or {}
            is_online = availability.get("isOnline", False)
            
            if available_now is not None and available_now != is_online:
                continue
                
            tutors.append({
                "id": u["id"],
                "display_name": u["name"],
                "subjects": tp.get("subjects", []),
                "rating": rating,
                "hourly_rate_kes": tp.get("hourlyRate", 0),
                "is_available": is_online,
                "avatar_url": u.get("avatar")
            })
            
        start = (page - 1) * limit
        end = start + limit
        paginated_tutors = tutors[start:end]
        
        rate_remaining = getattr(request.state, "rate_limit_remaining", 0)
        return StandardResponse(
            data={
                "tutors": paginated_tutors,
                "total": len(tutors),
                "page": page,
                "limit": limit
            },
            meta=ResponseMeta(rate_limit_remaining=rate_remaining)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch tutors: {str(e)}")

@router.get("/{tutor_id}", response_model=StandardResponse)
async def get_tutor_profile(tutor_id: str, request: Request):
    """
    Returns public profile of a single tutor.
    Scope required: tutors.read
    """
    try:
        res = await execute_async(
            supabase.table("User")
            .select("id, name, avatar, TutorProfile(*)")
            .eq("id", tutor_id)
            .single()
        )
        
        if not res.data:
            raise HTTPException(status_code=404, detail="Tutor not found")
            
        u = res.data
        tp = u.get("TutorProfile")
        if not tp or not tp.get("isVerified", False):
            raise HTTPException(status_code=404, detail="Tutor not found or not verified")
            
        availability = tp.get("availability") or {}
        profile = {
            "id": u["id"],
            "display_name": u["name"],
            "subjects": tp.get("subjects", []),
            "rating": tp.get("rating", 0.0),
            "hourly_rate_kes": tp.get("hourlyRate", 0),
            "is_available": availability.get("isOnline", False),
            "avatar_url": u.get("avatar"),
            "bio": tp.get("bio", ""),
            "levels_taught": tp.get("levelsTaught", []),
            "total_sessions": tp.get("totalSessions", 0)
        }
        
        rate_remaining = getattr(request.state, "rate_limit_remaining", 0)
        return StandardResponse(
            data=profile,
            meta=ResponseMeta(rate_limit_remaining=rate_remaining)
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch tutor profile: {str(e)}")

@router.post("/match", response_model=StandardResponse)
async def match_tutors(payload: TutorMatchRequest, request: Request):
    """
    Matches and returns top 3 tutors based on a load-balancing scoring heuristic.
    Scope required: tutors.match
    """
    try:
        res = await execute_async(
            supabase.table("User")
            .select("id, name, avatar, TutorProfile!inner(*)")
        )
        
        matched_tutors = []
        for u in res.data or []:
            tp = u.get("TutorProfile")
            if not tp or not tp.get("isVerified", False):
                continue
                
            subjects = [s.lower() for s in tp.get("subjects", [])]
            if payload.subject_id.lower() not in subjects:
                continue
                
            score = 0
            
            # Rating contribution (max 50 points)
            rating = tp.get("rating", 0.0)
            score += int(rating * 10)
            
            # Online status contribution (max 20 points)
            availability = tp.get("availability") or {}
            if availability.get("isOnline", False):
                score += 20
            else:
                score += 5
                
            # Experience contribution (max 15 points)
            total_sessions = tp.get("totalSessions", 0)
            score += min(total_sessions // 5, 15)
            
            # Load balancing contribution (max 15 points)
            current_active = tp.get("currentActiveSessions", 0)
            max_concurrent = tp.get("maxConcurrentSessions", 3)
            if current_active < max_concurrent:
                score += 15 - int((current_active / max_concurrent) * 10)
                
            score = min(score, 100)
            
            matched_tutors.append({
                "tutor": {
                    "id": u["id"],
                    "display_name": u["name"],
                    "rating": rating,
                    "hourly_rate_kes": tp.get("hourlyRate", 0),
                    "avatar_url": u.get("avatar"),
                    "bio": tp.get("bio", "")
                },
                "match_score": score
            })
            
        matched_tutors.sort(key=lambda x: x["match_score"], reverse=True)
        top_matches = matched_tutors[:3]
        
        rate_remaining = getattr(request.state, "rate_limit_remaining", 0)
        return StandardResponse(
            data=top_matches,
            meta=ResponseMeta(rate_limit_remaining=rate_remaining)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to match tutors: {str(e)}")
