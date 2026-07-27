"""
AI agent module for Edyfra.

Handles heavy AI compute tasks: student insight generation,
challenge creation, session summaries, and vector-based retrieval.
"""

import json
import os
from typing import Any

from openai import AsyncOpenAI


# ─── Client ────────────────────────────────────────────────────────────────────

_openai: AsyncOpenAI | None = None


def _get_client() -> AsyncOpenAI:
    global _openai
    if _openai is None:
        api_key = os.getenv("OPENAI_API_KEY") or os.getenv("OPENROUTER_API_KEY")
        base_url = "https://openrouter.ai/api/v1" if os.getenv("OPENROUTER_API_KEY") else None
        _openai = AsyncOpenAI(api_key=api_key, base_url=base_url)
    return _openai


async def _call_model(
    system_prompt: str,
    user_prompt: str,
    model: str = "openai/gpt-4o-mini",
    json_mode: bool = False,
) -> str:
    client = _get_client()
    kwargs: dict[str, Any] = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "max_tokens": 1024,
    }
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}

    resp = await client.chat.completions.create(**kwargs)
    return resp.choices[0].message.content or ""


# ─── Student Insights ──────────────────────────────────────────────────────────

STUDENT_INSIGHT_SYSTEM = """You are an academic analyst for an Edyfra institution.
You receive a student's performance data and must produce a concise 3-sentence insight:
1) What they're strongest at
2) What they need to improve
3) A recommended coaching focus for the holiday.
Be specific. Use the actual subject names and marks."""


async def generate_student_insight(
    student_name: str,
    subject_scores: list[dict[str, Any]],
    attendance_rate: float | None = None,
) -> str:
    scores_text = "\n".join(
        f"- {s.get('subject', 'Unknown')}: {s.get('marks', 'N/A')}%"
        for s in subject_scores
    )
    attendance = f"\nAttendance rate: {attendance_rate:.0f}%" if attendance_rate else ""

    prompt = f"""Student: {student_name}
Recent scores:
{scores_text}{attendance}

Generate a 3-sentence academic insight."""
    return await _call_model(STUDENT_INSIGHT_SYSTEM, prompt)


# ─── Challenge Generator ───────────────────────────────────────────────────────

CHALLENGE_SYSTEM = """You are a challenge generator for Kenyan high school students.
Generate a single academic challenge question with 4 multiple-choice answers.
Output JSON: {{"question": "...", "options": ["A. ...", "B. ...", "C. ...", "D. ..."], "answer": "A", "explanation": "..."}}"""


async def generate_challenge(subject: str, topic: str | None = None) -> dict[str, Any]:
    topic_str = f" on {topic}" if topic else ""
    prompt = f"Generate a {subject}{topic_str} challenge for Form 3 level."

    raw = await _call_model(CHALLENGE_SYSTEM, prompt, json_mode=True)
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {
            "question": f"Sample {subject} question",
            "options": ["A. Option 1", "B. Option 2", "C. Option 3", "D. Option 4"],
            "answer": "A",
            "explanation": "This is a fallback challenge (AI unavailable).",
        }


# ─── Session Summary ───────────────────────────────────────────────────────────

SESSION_SUMMARY_SYSTEM = """You are a session summarizer for an online tutoring platform.
Summarize what was covered, the student's engagement, and any homework given.
Keep it under 100 words. Use simple English."""


async def generate_session_summary(
    transcript: str,
    subject: str,
    duration_min: int,
) -> str:
    prompt = f"""Subject: {subject}
Duration: {duration_min} minutes
Transcript:
{transcript[:4000]}

Summarize this tutoring session."""
    return await _call_model(SESSION_SUMMARY_SYSTEM, prompt)
