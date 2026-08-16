from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from middleware.auth import APIKeyAuthMiddleware
from middleware.rate_limit import RateLimitMiddleware
from middleware.logging import RequestLoggingMiddleware
from routes import subjects, tutors, study_rooms, sessions, resources, ai, institutions, analytics, webhooks

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