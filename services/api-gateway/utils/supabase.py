from fastapi.concurrency import run_in_threadpool
from supabase import create_client, Client
from config import settings

# Initialize the Supabase Client using the service role key for direct access bypass
supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

async def execute_async(query_builder_callable):
    """
    Executes a Supabase query builder (e.g. supabase.table(...).select(...)) 
    asynchronously using FastAPI's run_in_threadpool to prevent blocking the event loop.
    """
    return await run_in_threadpool(query_builder_callable.execute)
