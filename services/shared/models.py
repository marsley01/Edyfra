from pydantic import BaseModel
from typing import Optional


class ModerationRequest(BaseModel):
    text: str
    user_id: str
    source: str = "message"
    session_id: Optional[str] = None


class ModerationResponse(BaseModel):
    is_toxic: bool
    toxicity_score: float
    flagged_words: list[str]
    categories: list[str]
    should_report: bool


class PlagiarismRequest(BaseModel):
    text: str
    user_id: str
    session_id: Optional[str] = None
    subject: Optional[str] = None


class PlagiarismResponse(BaseModel):
    is_plagiarized: bool
    similarity_score: float
    matches: list[dict]


class RecommendationRequest(BaseModel):
    user_id: str
    role: str = "student"
    subject: Optional[str] = None
    limit: int = 10


class RecommendationResponse(BaseModel):
    recommendations: list[dict]
