from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from uuid import UUID

class APIKeyBase(BaseModel):
    name: str
    app_name: str
    scopes: List[str] = []
    rate_limit_per_hour: int = 200
    monthly_call_limit: int = 20000
    expires_at: Optional[datetime] = None

class APIKeyCreate(APIKeyBase):
    pass

class APIKeyInDB(APIKeyBase):
    id: UUID
    key_hash: str
    key_prefix: str
    is_active: bool = True
    calls_this_month: int = 0
    last_used_at: Optional[datetime] = None
    created_by: Optional[UUID] = None
    created_at: datetime
    rotating_from: Optional[str] = None
    rotation_grace_until: Optional[datetime] = None
