import os
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware


class ServiceAuthMiddleware(BaseHTTPMiddleware):
    """Simple API key authentication for internal microservices.

    If SERVICE_API_KEY is set in the environment, all requests must include
    an Authorization: Bearer <key> header matching it.  When the variable is
    unset (e.g. local development), auth is skipped.
    """

    def __init__(self, app):
        super().__init__(app)
        self.api_key = os.getenv("SERVICE_API_KEY", "")

    async def dispatch(self, request: Request, call_next):
        if self.api_key:
            auth_header = request.headers.get("Authorization", "")
            if not auth_header.startswith("Bearer ") or auth_header.removeprefix("Bearer ") != self.api_key:
                raise HTTPException(status_code=401, detail="Unauthorized")
        return await call_next(request)
