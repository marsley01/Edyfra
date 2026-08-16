from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class TutorMatchRequest(BaseModel):
    subject_id: str
    topic: Optional[str] = None
    student_level: str
    preferred_time: Optional[str] = None

class SessionBookRequest(BaseModel):
    tutor_id: str
    subject_id: str
    topic: Optional[str] = None
    preferred_datetime: datetime
    student_external_id: str
    student_name: str
    student_email: str
    source_platform: str
    source_resource_id: Optional[str] = None

class AiAskRequest(BaseModel):
    question: str
    subject_id: str
    context: Optional[str] = None
    student_level: str

class AiSummarizeRequest(BaseModel):
    resource_url: str
    resource_title: str
    subject_id: str

class WebhookResourceViewedRequest(BaseModel):
    resource_id: str
    resource_title: str
    subject_id: str
    student_ref: str
