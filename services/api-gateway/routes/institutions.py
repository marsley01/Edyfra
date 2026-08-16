from fastapi import APIRouter, Request, HTTPException

from utils.supabase import supabase, execute_async
from models.responses import StandardResponse, ResponseMeta

router = APIRouter(prefix="/v1/institutions", tags=["Institutions"])


@router.get("/{institution_id}", response_model=StandardResponse)
async def get_institution_details(institution_id: str, request: Request):
    """
    Returns public details for a custom institution.
    Scope required: institutions.read
    """
    try:
        res = await execute_async(
            supabase.table("Institution")
            .select("id, name, type, code, logo, description, location, email, phone, website, county, subCounty, curriculum, motto, isActive, plan")
            .eq("id", institution_id)
        )
        if not res.data:
            raise HTTPException(status_code=404, detail="Institution not found")

        inst = res.data[0]
        rate_remaining = getattr(request.state, "rate_limit_remaining", 0)
        return StandardResponse(
            data={
                "id": inst["id"],
                "name": inst.get("name"),
                "type": inst.get("type"),
                "code": inst.get("code"),
                "logo": inst.get("logo"),
                "description": inst.get("description"),
                "location": inst.get("location"),
                "email": inst.get("email"),
                "phone": inst.get("phone"),
                "website": inst.get("website"),
                "county": inst.get("county"),
                "sub_county": inst.get("subCounty"),
                "curriculum": inst.get("curriculum"),
                "motto": inst.get("motto"),
                "is_active": inst.get("isActive", True),
                "plan": inst.get("plan"),
            },
            meta=ResponseMeta(rate_limit_remaining=rate_remaining)
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch institution: {str(e)}")