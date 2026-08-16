from fastapi import APIRouter, Request, Query, HTTPException
from typing import Optional
from utils.supabase import supabase, execute_async
from models.responses import StandardResponse, ResponseMeta

router = APIRouter(prefix="/v1/study-rooms", tags=["Study Rooms"])

@router.get("", response_model=StandardResponse)
async def get_study_rooms(
    request: Request,
    subject: Optional[str] = None,
    is_live: Optional[bool] = None,
    level: Optional[str] = None
):
    """
    Returns active (live) and upcoming study sessions.
    Scope required: rooms.read
    """
    try:
        rooms = []
        
        # 1. Fetch active sessions (live rooms) from "Session" table
        if is_live is None or is_live is True:
            # Query active sessions
            sess_res = await execute_async(
                supabase.table("Session")
                .select("*, student:User!Session_studentId_fkey(name), partner:User!Session_partnerId_fkey(name)")
                .eq("status", "ACTIVE")
            )
            
            for s in sess_res.data or []:
                if subject and subject.lower() not in s.get("subject", "").lower():
                    continue
                
                host_name = "Edyfra Teacher"
                if s.get("partner"):
                    host_name = s["partner"].get("name", host_name)
                elif s.get("student"):
                    host_name = s["student"].get("name", host_name)
                    
                rooms.append({
                    "id": s["id"],
                    "title": s.get("topic") or f"{s.get('subject')} Session",
                    "subject": s.get("subject"),
                    "host_name": host_name,
                    "participant_count": 2, # Standard 1-on-1 session has 2 participants
                    "max_participants": 2,
                    "starts_at": s.get("startedAt"),
                    "is_live": True
                })

        # 2. Fetch upcoming confirmed bookings from "bookings" table
        if is_live is None or is_live is False:
            book_res = await execute_async(
                supabase.table("bookings")
                .select("*, tutor:User!bookings_tutor_id_fkey(name)")
                .eq("status", "confirmed")
            )
            
            for b in book_res.data or []:
                if subject and subject.lower() not in b.get("subject", "").lower():
                    continue
                    
                host_name = "Edyfra Teacher"
                if b.get("tutor"):
                    host_name = b["tutor"].get("name", host_name)
                    
                starts_at = f"{b.get('date')}T{b.get('start_time')}:00"
                rooms.append({
                    "id": b["id"],
                    "title": b.get("topic") or f"{b.get('subject')} Session",
                    "subject": b.get("subject"),
                    "host_name": host_name,
                    "participant_count": 0,
                    "max_participants": 2,
                    "starts_at": starts_at,
                    "is_live": False
                })

        rate_remaining = getattr(request.state, "rate_limit_remaining", 0)
        return StandardResponse(
            data=rooms,
            meta=ResponseMeta(rate_limit_remaining=rate_remaining)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch study rooms: {str(e)}")

@router.get("/{room_id}", response_model=StandardResponse)
async def get_room_details(room_id: str, request: Request):
    """
    Returns specific study room details, including deep link join URL if live.
    Scope required: rooms.read
    """
    try:
        # First check "Session" table for active sessions
        sess_res = await execute_async(
            supabase.table("Session")
            .select("*, student:User!Session_studentId_fkey(name), partner:User!Session_partnerId_fkey(name)")
            .eq("id", room_id)
        )
        
        if sess_res.data:
            s = sess_res.data[0]
            host_name = "Edyfra Teacher"
            if s.get("partner"):
                host_name = s["partner"].get("name", host_name)
            elif s.get("student"):
                host_name = s["student"].get("name", host_name)
                
            is_live = s.get("status") == "ACTIVE"
            join_url = f"https://edyfra-v2.vercel.app/rooms/{room_id}" if is_live else None
            
            room_detail = {
                "id": s["id"],
                "title": s.get("topic") or f"{s.get('subject')} Session",
                "subject": s.get("subject"),
                "host_name": host_name,
                "participant_count": 2,
                "max_participants": 2,
                "starts_at": s.get("startedAt"),
                "is_live": is_live,
                "join_url": join_url
            }
            
            rate_remaining = getattr(request.state, "rate_limit_remaining", 0)
            return StandardResponse(
                data=room_detail,
                meta=ResponseMeta(rate_limit_remaining=rate_remaining)
            )

        # Then check "bookings" table
        book_res = await execute_async(
            supabase.table("bookings")
            .select("*, tutor:User!bookings_tutor_id_fkey(name)")
            .eq("id", room_id)
        )
        
        if book_res.data:
            b = book_res.data[0]
            host_name = "Edyfra Teacher"
            if b.get("tutor"):
                host_name = b["tutor"].get("name", host_name)
                
            starts_at = f"{b.get('date')}T{b.get('start_time')}:00"
            is_live = b.get("status") == "active"  # or active session room matching it
            
            room_detail = {
                "id": b["id"],
                "title": b.get("topic") or f"{b.get('subject')} Session",
                "subject": b.get("subject"),
                "host_name": host_name,
                "participant_count": 0,
                "max_participants": 2,
                "starts_at": starts_at,
                "is_live": is_live,
                "join_url": f"https://edyfra-v2.vercel.app/rooms/{room_id}" if is_live else None
            }
            
            rate_remaining = getattr(request.state, "rate_limit_remaining", 0)
            return StandardResponse(
                data=room_detail,
                meta=ResponseMeta(rate_limit_remaining=rate_remaining)
            )

        raise HTTPException(status_code=404, detail="Study room not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch study room details: {str(e)}")
