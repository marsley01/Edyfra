from fastapi import APIRouter, Request, HTTPException

from utils.supabase import supabase, execute_async
from models.responses import StandardResponse, ResponseMeta
from models.requests import WebhookResourceViewedRequest

router = APIRouter(prefix="/v1/webhooks", tags=["Webhooks"])


@router.post("/resource-viewed", response_model=StandardResponse)
async def webhook_resource_viewed(payload: WebhookResourceViewedRequest, request: Request):
    """
    Logs an external student resource-view event for analytics and follow-up.
    Scope required: webhooks.send
    """
    try:
        api_key = request.state.api_key
        event_payload = {
            "resource_id": payload.resource_id,
            "resource_title": payload.resource_title,
            "subject_id": payload.subject_id,
            "student_ref": payload.student_ref,
        }

        await execute_async(
            supabase.table("api_webhooks")
            .insert({
                "api_key_id": api_key["id"],
                "event_type": "resource_viewed",
                "payload": event_payload,
            })
        )

        rate_remaining = getattr(request.state, "rate_limit_remaining", 0)
        return StandardResponse(
            data={
                "received": True,
                "event_type": "resource_viewed",
                "resource_id": payload.resource_id,
            },
            meta=ResponseMeta(rate_limit_remaining=rate_remaining)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to log webhook event: {str(e)}")