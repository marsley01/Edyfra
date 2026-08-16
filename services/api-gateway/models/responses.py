from pydantic import BaseModel, Field
from typing import Any
from datetime import datetime

def utc_timestamp() -> str:
    return datetime.utcnow().isoformat() + "Z"

class ResponseMeta(BaseModel):
    timestamp: str = Field(default_factory=utc_timestamp)
    version: str = "1.0"
    rate_limit_remaining: int = 0

class StandardResponse(BaseModel):
    success: bool = True
    data: Any
    meta: ResponseMeta = Field(default_factory=ResponseMeta)

class ErrorDetail(BaseModel):
    code: str
    message: str

class ErrorResponse(BaseModel):
    success: bool = False
    error: ErrorDetail
