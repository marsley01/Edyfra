import time
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.background import BackgroundTasks
from utils.supabase import supabase, execute_async

async def write_usage_log(
    api_key_id: str,
    app_name: str,
    endpoint: str,
    method: str,
    status_code: int,
    response_time_ms: int,
    ip_address: str
):
    """Inserts a new usage log entry into Supabase asynchronously."""
    try:
        await execute_async(
            supabase.table("api_usage_logs")
            .insert({
                "api_key_id": api_key_id,
                "app_name": app_name,
                "endpoint": endpoint,
                "method": method,
                "status_code": status_code,
                "response_time_ms": response_time_ms,
                "ip_address": ip_address
            })
        )
    except Exception as e:
        print(f"[logging-middleware] Failed to write usage log: {e}")

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        start_time = time.time()
        
        response = await call_next(request)
        
        # Only log requests that were authenticated (have api_key injected)
        api_key = getattr(request.state, "api_key", None)
        if api_key:
            response_time_ms = int((time.time() - start_time) * 1000)
            
            api_key_id = api_key["id"]
            app_name = api_key.get("app_name", "Unknown")
            endpoint = request.url.path
            method = request.method
            status_code = response.status_code
            ip_address = request.client.host if request.client else "Unknown"

            # Register database insert as a background task
            if not response.background:
                response.background = BackgroundTasks()
                
            response.background.add_task(
                write_usage_log,
                api_key_id=api_key_id,
                app_name=app_name,
                endpoint=endpoint,
                method=method,
                status_code=status_code,
                response_time_ms=response_time_ms,
                ip_address=ip_address
            )
            
        return response
