import time
import threading
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from models.responses import ErrorResponse, ErrorDetail

class RateLimitMiddleware(BaseHTTPMiddleware):
    # AI endpoints are resource-intensive; cap them at 20 calls/hour per key.
    AI_RATE_LIMIT_PER_HOUR = 20

    def __init__(self, app):
        super().__init__(app)
        self._windows = {}  # maps window_key -> list of float timestamps
        self._lock = threading.Lock()

    def _window_key(self, key_id: str, path: str) -> str:
        if path.startswith("/v1/ai"):
            return f"ai:{key_id}"
        return key_id

    def _limit_for(self, path: str, key_limit: int) -> int:
        if path.startswith("/v1/ai"):
            return min(self.AI_RATE_LIMIT_PER_HOUR, key_limit)
        return key_limit

    async def dispatch(self, request: Request, call_next) -> Response:
        # Check if auth middleware injected the api_key
        api_key = getattr(request.state, "api_key", None)
        if not api_key:
            # Bypass rate limit if route is bypassed (or auth failed earlier)
            return await call_next(request)

        key_id = api_key["id"]
        path = request.url.path
        window_key = self._window_key(key_id, path)
        rate_limit_per_hour = self._limit_for(path, api_key.get("rate_limit_per_hour", 200))

        now = time.time()
        one_hour_ago = now - 3600

        with self._lock:
            if window_key not in self._windows:
                self._windows[window_key] = []

            # Filter timestamps to keep only those within the last 1 hour
            self._windows[window_key] = [t for t in self._windows[window_key] if t > one_hour_ago]
            window = self._windows[window_key]

            # Calculate remaining limit
            remaining = rate_limit_per_hour - len(window)

            if remaining <= 0:
                # Rate limit exceeded
                oldest_request = window[0]
                retry_after_seconds = int(3600 - (now - oldest_request))
                reset_timestamp = int(oldest_request + 3600)

                error_resp = ErrorResponse(
                    error=ErrorDetail(code="TOO_MANY_REQUESTS", message=f"Rate limit exceeded. Limit is {rate_limit_per_hour} requests per hour.")
                )
                return JSONResponse(
                    status_code=429,
                    content=error_resp.model_dump(),
                    headers={
                        "Retry-After": str(retry_after_seconds),
                        "X-RateLimit-Limit": str(rate_limit_per_hour),
                        "X-RateLimit-Remaining": "0",
                        "X-RateLimit-Reset": str(reset_timestamp)
                    }
                )

            # Valid request: record timestamp
            window.append(now)
            remaining_after = rate_limit_per_hour - len(window)
            reset_timestamp = int(window[0] + 3600) if window else int(now + 3600)

        # Call the next middleware/handler
        response = await call_next(request)

        # Add headers to response
        response.headers["X-RateLimit-Limit"] = str(rate_limit_per_hour)
        response.headers["X-RateLimit-Remaining"] = str(remaining_after)
        response.headers["X-RateLimit-Reset"] = str(reset_timestamp)

        return response
