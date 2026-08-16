from fastapi import APIRouter, Request, HTTPException
import google.generativeai as genai

from config import settings
from models.responses import StandardResponse, ResponseMeta
from models.requests import AiAskRequest, AiSummarizeRequest
from utils.supabase import supabase, execute_async

router = APIRouter(prefix="/v1/ai", tags=["AI"])

genai.configure(api_key=settings.GEMINI_API_KEY)
MODEL_NAME = "gemini-1.5-flash"

CURRICULUM_CONTEXT = (
    "You are Edyfra AI, a study assistant for Kenyan CBC students (Junior School, "
    "Senior School) and university learners. Answer curriculum-aligned, grade-appropriate "
    "explanations. Be concise, encouraging, and Kenyan-context aware. "
    "If the question is off-topic, politely redirect to the student's curriculum."
)

SUBJECT_CONTEXT = {
    "math": "Respond with step-by-step mathematical reasoning and worked examples.",
    "mathematics": "Respond with step-by-step mathematical reasoning and worked examples.",
    "english": "Respond with grammar rules, vocabulary building, and comprehension techniques.",
    "kiswahili": "Respond with Kiswahili grammar, sarufi, and composition guidance.",
    "science": "Respond with scientific method-aligned explanations and real-world examples.",
    "biology": "Respond with clear biological concepts and Kenyan ecosystem examples.",
    "chemistry": "Respond with chemical principles, reactions, and lab-safety awareness.",
    "physics": "Respond with physical laws, formulas, and practical demonstrations.",
    "history": "Respond with Kenyan and world history context, dates, and civic knowledge.",
    "geography": "Respond with Kenyan geography, climate, and map-reading skills.",
    "computer": "Respond with computing fundamentals, programming basics, and digital literacy.",
}


def build_ai_prompt(question: str, subject_id: str, student_level: str, context: str | None) -> str:
    subject_hint = SUBJECT_CONTEXT.get(subject_id.strip().lower(), "Respond clearly and helpfully.")
    return (
        f"{CURRICULUM_CONTEXT}\n\n"
        f"Student level: {student_level}\n"
        f"Subject guidance: {subject_hint}\n"
        f"Extra context from the caller: {context or 'none'}\n\n"
        f"Student question: {question}"
    )


async def ask_gemini(prompt: str) -> str:
    """Calls Gemini asynchronously and returns the generated text."""
    model = genai.GenerativeModel(MODEL_NAME)
    response = await model.generate_content_async(prompt)
    return response.text


@router.post("/ask", response_model=StandardResponse)
async def ai_ask(payload: AiAskRequest, request: Request):
    """
    Answers a curriculum question using Gemini with CBC context.
    Scope required: ai.query (limited to 20 calls/hour per key)
    """
    try:
        prompt = build_ai_prompt(payload.question, payload.subject_id, payload.student_level, payload.context)
        answer = await ask_gemini(prompt)

        rate_remaining = getattr(request.state, "rate_limit_remaining", 0)
        return StandardResponse(
            data={
                "answer": answer,
                "subject_id": payload.subject_id,
                "level": payload.student_level,
                "model": MODEL_NAME,
            },
            meta=ResponseMeta(rate_limit_remaining=rate_remaining)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI service failed: {str(e)}")


@router.post("/summarize", response_model=StandardResponse)
async def ai_summarize(payload: AiSummarizeRequest, request: Request):
    """
    Summarizes a resource for quick preview.
    Scope required: ai.query (limited to 20 calls/hour per key)
    """
    try:
        prompt = (
            f"{CURRICULUM_CONTEXT}\n\n"
            f"Summarize the following resource for a student. Keep it under 150 words, "
            f"highlight key takeaways, and note the difficulty level.\n"
            f"Resource title: {payload.resource_title}\n"
            f"Subject: {payload.subject_id}\n"
            f"Resource URL: {payload.resource_url}"
        )
        summary = await ask_gemini(prompt)

        rate_remaining = getattr(request.state, "rate_limit_remaining", 0)
        return StandardResponse(
            data={
                "resource_title": payload.resource_title,
                "subject_id": payload.subject_id,
                "summary": summary,
                "model": MODEL_NAME,
            },
            meta=ResponseMeta(rate_limit_remaining=rate_remaining)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI summarizer failed: {str(e)}")