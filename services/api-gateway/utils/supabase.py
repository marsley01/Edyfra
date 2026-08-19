import logging
import os

from fastapi.concurrency import run_in_threadpool
from supabase import create_client, Client
from config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Startup env-var validation — fail fast with a clear message rather than
# allowing a cryptic error to surface later during the first request.
# ---------------------------------------------------------------------------
_missing: list[str] = []
if not settings.SUPABASE_URL:
    _missing.append("SUPABASE_URL")
if not settings.SUPABASE_SERVICE_ROLE_KEY:
    _missing.append("SUPABASE_SERVICE_ROLE_KEY")

if _missing:
    raise RuntimeError(
        f"[supabase] Missing required environment variable(s): {', '.join(_missing)}. "
        "Set them in Railway → Variables before deploying."
    )

logger.info(
    "supabase.client initialised",
    extra={"supabase_url": settings.SUPABASE_URL},
)

# Initialize the Supabase Client using the service role key for direct access bypass
supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)


async def execute_async(query_builder_callable):
    """
    Executes a Supabase query builder (e.g. supabase.table(...).select(...))
    asynchronously using FastAPI's run_in_threadpool to prevent blocking the event loop.
    """
    return await run_in_threadpool(query_builder_callable.execute)
