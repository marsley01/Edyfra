import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from middleware.auth import APIKeyAuthMiddleware
from middleware.rate_limit import RateLimitMiddleware
from middleware.logging import RequestLoggingMiddleware
from routes import subjects, tutors, study_rooms, sessions, resources, ai, institutions, analytics, webhooks
from utils.supabase import supabase, execute_async

logger = logging.getLogger(__name__)

app = FastAPI(
    title="Edyfra External API Gateway",
    description="Rate-limited, scoped REST API exposing Edyfra data to external platforms.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Middleware order (outermost -> innermost):
# 1. CORS
# 2. RequestLoggingMiddleware  - logs every authenticated call
# 3. APIKeyAuthMiddleware      - validates key, scopes, quotas, sets request.state.api_key
# 4. RateLimitMiddleware       - sliding window per key (plus 20/hr AI cap)
# Middleware added last runs first, so register in reverse execution order.
app.add_middleware(RateLimitMiddleware)
app.add_middleware(APIKeyAuthMiddleware)
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(subjects.router)
app.include_router(tutors.router)
app.include_router(study_rooms.router)
app.include_router(sessions.router)
app.include_router(resources.router)
app.include_router(ai.router)
app.include_router(institutions.router)
app.include_router(analytics.router)
app.include_router(webhooks.router)


@app.get("/health", tags=["Health"])
async def health():
    """
    Liveness probe used by Railway's health check.
    """
    return {"status": "ok", "service": "edyfra-api-gateway", "version": "1.0.0"}


@app.get("/api/v1/health", tags=["Health"])
async def deep_health():
    """
    Deep health check for KLS and other consumers.
    Verifies Supabase connectivity and confirms the api_keys table exists
    before returning. Safe to call without an API key.
    """
    supabase_connected = False
    api_keys_table_exists = False

    try:
        # A minimal SELECT that succeeds even if the table is empty.
        # Using limit(1) keeps the payload tiny.
        res = await execute_async(
            supabase.table("api_keys").select("id").limit(1)
        )
        supabase_connected = True
        # If we reach here without an exception, the table exists.
        api_keys_table_exists = True
    except Exception as e:
        logger.exception("deep_health.supabase_check failed")
        # Try to distinguish a missing-table error from a connectivity error.
        err_str = str(e).lower()
        if "does not exist" in err_str or "relation" in err_str or "42p01" in err_str:
            # Connected but table is absent — root cause #1.
            supabase_connected = True
            api_keys_table_exists = False
        # else: supabase_connected stays False (network / auth error)

    status = "ok" if (supabase_connected and api_keys_table_exists) else "degraded"
    return {
        "status": status,
        "supabase_connected": supabase_connected,
        "api_keys_table_exists": api_keys_table_exists,
    }