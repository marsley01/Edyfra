import time
import logging
from datetime import datetime, timezone
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.background import BackgroundTasks

from config import settings
from utils.crypto import hash_key
from utils.supabase import supabase, execute_async
from models.responses import ErrorResponse, ErrorDetail

logger = logging.getLogger(__name__)

# Routes that do not require API Key authentication
BYPASS_ROUTES = {
    "/health",
    "/api/v1/health",
    "/docs",
    "/redoc",
    "/openapi.json"
}


def get_required_scopes(path: str, method: str) -> list[str]:
    """Maps request path to required scopes."""
    path = path.rstrip("/")
    if path.startswith("/v1/subjects"):
        return ["subjects.read"]
    elif path == "/v1/tutors/match":
        return ["tutors.match"]
    elif path.startswith("/v1/tutors"):
        return ["tutors.read"]
    elif path.startswith("/v1/study-rooms"):
        return ["rooms.read"]
    elif path.startswith("/v1/sessions"):
        return ["sessions.book"]
    elif path.startswith("/v1/resources"):
        return ["resources.read"]
    elif path.startswith("/v1/ai"):
        return ["ai.query"]
    elif path.startswith("/v1/institutions"):
        return ["institutions.read"]
    elif path.startswith("/v1/analytics"):
        return ["analytics.read"]
    elif path.startswith("/v1/webhooks"):
        return ["webhooks.send"]
    return []

async def increment_api_call_count(key_id: str):
    """Asynchronous background task to update usage metrics in Supabase."""
    try:
        now_iso = datetime.now(timezone.utc).isoformat()
        # Fetch current calls_this_month first, then increment
        res = await execute_async(
            supabase.table("api_keys")
            .select("calls_this_month")
            .eq("id", key_id)
            .single()
        )
        if res.data:
            current_calls = res.data.get("calls_this_month", 0)
            await execute_async(
                supabase.table("api_keys")
                .update({
                    "calls_this_month": current_calls + 1,
                    "last_used_at": now_iso
                })
                .eq("id", key_id)
            )
    except Exception:
        logger.warning("auth.increment_api_call_count failed", extra={"key_id": key_id}, exc_info=True)

class APIKeyAuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        # 1. Bypass check
        if request.url.path in BYPASS_ROUTES or request.url.path.rstrip("/") == "":
            return await call_next(request)

        # 2. Extract Bearer token
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            error_resp = ErrorResponse(
                error=ErrorDetail(code="UNAUTHORIZED", message="Missing or invalid Authorization header. Use Bearer token format.")
            )
            return JSONResponse(status_code=401, content=error_resp.model_dump())

        raw_key = auth_header.split(" ")[1]
        key_hash = hash_key(raw_key)

        # 3. Look up key in Supabase
        try:
            res = await execute_async(
                supabase.table("api_keys")
                .select("*")
                .eq("key_hash", key_hash)
            )
            if not res.data:
                # Check if this might be a key currently undergoing rotation
                # If so, the hashed old key is matched by searching rotating_from
                res = await execute_async(
                    supabase.table("api_keys")
                    .select("*")
                    .eq("rotating_from", key_hash)
                )
                
            if not res.data:
                error_resp = ErrorResponse(
                    error=ErrorDetail(code="UNAUTHORIZED", message="API key is invalid or does not exist.")
                )
                return JSONResponse(status_code=401, content=error_resp.model_dump())

            api_key = res.data[0]
        except Exception as e:
            # Log full stack trace so Railway surfaces the real Supabase error.
            logger.exception(
                "auth.db_lookup failed",
                extra={"key_hash_prefix": key_hash[:8] + "..."},
            )
            error_message = "Failed to authenticate request."
            if settings.IS_DEV:
                # Expose the raw exception in dev mode to speed up diagnosis.
                error_message = f"Failed to authenticate request. Detail: {e}"
            error_resp = ErrorResponse(
                error=ErrorDetail(code="INTERNAL_SERVER_ERROR", message=error_message)
            )
            return JSONResponse(status_code=500, content=error_resp.model_dump())

        # 4. Check active status
        if not api_key.get("is_active", True):
            error_resp = ErrorResponse(
                error=ErrorDetail(code="FORBIDDEN", message="API key has been deactivated.")
            )
            return JSONResponse(status_code=403, content=error_resp.model_dump())

        # 5. Check expiration
        now = datetime.now(timezone.utc)
        expires_at_str = api_key.get("expires_at")
        if expires_at_str:
            expires_at = datetime.fromisoformat(expires_at_str.replace("Z", "+00:00"))
            if now > expires_at:
                error_resp = ErrorResponse(
                    error=ErrorDetail(code="FORBIDDEN", message="API key has expired.")
                )
                return JSONResponse(status_code=403, content=error_resp.model_dump())

        # 6. Check rotation grace period (if using the old key)
        rotation_grace_until_str = api_key.get("rotation_grace_until")
        if rotation_grace_until_str and api_key.get("rotating_from") == key_hash:
            grace_until = datetime.fromisoformat(rotation_grace_until_str.replace("Z", "+00:00"))
            if now > grace_until:
                error_resp = ErrorResponse(
                    error=ErrorDetail(code="UNAUTHORIZED", message="Old API key rotation grace period has expired.")
                )
                return JSONResponse(status_code=401, content=error_resp.model_dump())

        # 7. Check monthly call limit
        monthly_limit = api_key.get("monthly_call_limit", 20000)
        calls_this_month = api_key.get("calls_this_month", 0)
        if calls_this_month >= monthly_limit:
            error_resp = ErrorResponse(
                error=ErrorDetail(code="TOO_MANY_REQUESTS", message="Monthly call quota exceeded for this API key.")
            )
            return JSONResponse(status_code=429, content=error_resp.model_dump())

        # 8. Check scopes
        required_scopes = get_required_scopes(request.url.path, request.method)
        key_scopes = api_key.get("scopes", [])
        if required_scopes and not any(scope in key_scopes for scope in required_scopes):
            error_resp = ErrorResponse(
                error=ErrorDetail(
                    code="FORBIDDEN", 
                    message=f"Insufficient scopes. Required: {required_scopes}. Key contains: {key_scopes}"
                )
            )
            return JSONResponse(status_code=403, content=error_resp.model_dump())

        # 9. Inject metadata into request.state
        request.state.api_key = api_key

        # 10. Call next handler and attach background task to increment call usage
        response = await call_next(request)
        
        # Initialize background tasks if not present
        if not response.background:
            response.background = BackgroundTasks()
        
        # Only increment calls on successful response codes (not client errors)
        if 200 <= response.status_code < 400:
            response.background.add_task(increment_api_call_count, api_key["id"])

        return response
