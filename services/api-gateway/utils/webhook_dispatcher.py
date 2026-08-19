import httpx
import hmac
import hashlib
import json
import asyncio
from datetime import datetime, timezone
from utils.supabase import supabase, execute_async
import logging

logger = logging.getLogger(__name__)

async def _send_webhook(url: str, payload_str: str, secret: str):
    """
    Sends the webhook to the endpoint. Retries once on failure with a 2s delay.
    """
    signature = hmac.new(secret.encode('utf-8'), payload_str.encode('utf-8'), hashlib.sha256).hexdigest()
    headers = {
        "Content-Type": "application/json",
        "X-Edyfra-Signature": f"sha256={signature}"
    }
    
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(url, content=payload_str, headers=headers, timeout=5.0)
            resp.raise_for_status()
            logger.info("Webhook delivered successfully", extra={"url": url})
            return True
        except Exception as e:
            logger.warning("Webhook delivery failed, retrying in 2s", extra={"url": url, "error": str(e)})
            await asyncio.sleep(2)
            try:
                resp = await client.post(url, content=payload_str, headers=headers, timeout=5.0)
                resp.raise_for_status()
                logger.info("Webhook delivered successfully on retry", extra={"url": url})
                return True
            except Exception as e2:
                logger.error("Webhook delivery failed on retry", extra={"url": url, "error": str(e2)})
                return False

async def dispatch_event(event_type: str, payload: dict, api_key_id: str):
    """
    Looks up all active webhook subscriptions for the given api_key_id and event_type,
    and fires the payload to each endpoint in the background.
    """
    try:
        # Get active subscriptions for this API key
        res = await execute_async(
            supabase.table("webhook_subscriptions")
            .select("*")
            .eq("api_key_id", api_key_id)
            .eq("is_active", True)
        )
        
        subs = res.data or []
        if not subs:
            return

        now_iso = datetime.now(timezone.utc).isoformat()
        body = {
            "event": event_type,
            "timestamp": now_iso,
            "data": payload
        }
        payload_str = json.dumps(body)

        for sub in subs:
            # Check if this subscription wants this event
            if event_type in sub.get("events", []):
                # Fire and forget
                asyncio.create_task(_send_webhook(sub["endpoint_url"], payload_str, sub["secret"]))
                
                # Update last_fired_at in background
                asyncio.create_task(
                    execute_async(
                        supabase.table("webhook_subscriptions")
                        .update({"last_fired_at": now_iso})
                        .eq("id", sub["id"])
                    )
                )
                
    except Exception as e:
        logger.exception("dispatch_event failed", extra={"event_type": event_type, "api_key_id": api_key_id})
