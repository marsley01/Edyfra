from fastapi import APIRouter, Request, HTTPException

from utils.supabase import supabase, execute_async
from models.responses import StandardResponse, ResponseMeta
from models.requests import WebhookResourceViewedRequest, WebhookSubscribeRequest, WebhookTestRequest
import secrets
from utils.webhook_dispatcher import _send_webhook
import json
from datetime import datetime, timezone
import asyncio

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


@router.post("/subscribe", response_model=StandardResponse)
async def subscribe_webhook(payload: WebhookSubscribeRequest, request: Request):
    """
    Registers a new webhook endpoint to receive real-time Edyfra events.
    Scope required: webhooks.send
    """
    try:
        api_key = request.state.api_key
        # Generate a strong signing secret
        secret = secrets.token_hex(32)

        res = await execute_async(
            supabase.table("webhook_subscriptions")
            .insert({
                "api_key_id": api_key["id"],
                "endpoint_url": payload.endpoint_url,
                "events": payload.events,
                "secret": secret
            })
            .select()
        )
        sub = res.data[0]

        rate_remaining = getattr(request.state, "rate_limit_remaining", 0)
        return StandardResponse(
            data={
                "id": sub["id"],
                "endpoint_url": sub["endpoint_url"],
                "events": sub["events"],
                "secret": secret
            },
            meta=ResponseMeta(rate_limit_remaining=rate_remaining)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create subscription: {str(e)}")


@router.get("", response_model=StandardResponse)
async def list_webhooks(request: Request):
    """
    Lists all active webhook subscriptions for this API key.
    Scope required: webhooks.send
    """
    try:
        api_key = request.state.api_key
        res = await execute_async(
            supabase.table("webhook_subscriptions")
            .select("id, endpoint_url, events, is_active, created_at, last_fired_at")
            .eq("api_key_id", api_key["id"])
            .eq("is_active", True)
        )

        rate_remaining = getattr(request.state, "rate_limit_remaining", 0)
        return StandardResponse(
            data=res.data or [],
            meta=ResponseMeta(rate_limit_remaining=rate_remaining)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list subscriptions: {str(e)}")


@router.delete("/{sub_id}", response_model=StandardResponse)
async def delete_webhook(sub_id: str, request: Request):
    """
    Removes a webhook subscription.
    Scope required: webhooks.send
    """
    try:
        api_key = request.state.api_key
        # Ensure we only delete subscriptions belonging to this API key
        await execute_async(
            supabase.table("webhook_subscriptions")
            .delete()
            .eq("id", sub_id)
            .eq("api_key_id", api_key["id"])
        )

        rate_remaining = getattr(request.state, "rate_limit_remaining", 0)
        return StandardResponse(
            data={"success": True, "deleted_id": sub_id},
            meta=ResponseMeta(rate_limit_remaining=rate_remaining)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete subscription: {str(e)}")


@router.post("/test", response_model=StandardResponse)
async def test_webhook(payload: WebhookTestRequest, request: Request):
    """
    Fires a test ping event to the specified subscription endpoint.
    Scope required: webhooks.send
    """
    try:
        api_key = request.state.api_key
        
        # Verify ownership and get secret
        res = await execute_async(
            supabase.table("webhook_subscriptions")
            .select("endpoint_url, secret")
            .eq("id", payload.subscription_id)
            .eq("api_key_id", api_key["id"])
            .single()
        )
        
        if not res.data:
            raise HTTPException(status_code=404, detail="Subscription not found")
            
        sub = res.data
        body = {
            "event": "ping",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "data": {"message": "Test ping from Edyfra"}
        }
        
        # Fire in background
        asyncio.create_task(_send_webhook(sub["endpoint_url"], json.dumps(body), sub["secret"]))

        rate_remaining = getattr(request.state, "rate_limit_remaining", 0)
        return StandardResponse(
            data={"success": True, "message": "Test ping dispatched"},
            meta=ResponseMeta(rate_limit_remaining=rate_remaining)
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to test subscription: {str(e)}")