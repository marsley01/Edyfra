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

    # Comma-separated allowed origins
    ALLOWED_ORIGINS: str = "https://edyfra-v2.vercel.app,https://kenyalibrary.app"
    
    @property
    def cors_origins(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
