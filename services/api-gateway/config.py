import os
from typing import List
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    SUPABASE_URL: str
    SUPABASE_SERVICE_ROLE_KEY: str
    GEMINI_API_KEY: str
    RESEND_API_KEY: str

    # Set IS_DEV=true in your local .env to expose full error details in responses.
    # Must be explicitly opted-in; defaults to False (production-safe).
    IS_DEV: bool = False

    # Comma-separated allowed origins. Defaults to the live domain plus the
    # apex/www pair — browsers treat those as distinct origins, so both are
    # listed; override via ALLOWED_ORIGINS for staging deployments.
    ALLOWED_ORIGINS: str = (
        "https://www.edyfra.online,https://edyfra.online,https://kenyalibrary.app"
    )
    
    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]

    # Public origin used to build user-facing deep links (profile URLs, room
    # join links, booking links). Kept separate from ALLOWED_ORIGINS because
    # this one is a single origin, not an access-control list.
    SITE_URL: str = "https://www.edyfra.online"

    @property
    def site_url(self) -> str:
        return self.SITE_URL.rstrip("/")

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
