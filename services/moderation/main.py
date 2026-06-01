import os
import sys
import uuid
from datetime import datetime
from fastapi import FastAPI
from better_profanity import profanity

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from shared.db import execute_query, fetch_one
from shared.models import ModerationRequest, ModerationResponse

app = FastAPI(title="Edyfra Content Moderation Service", version="1.0.0")

TOXIC_PATTERNS = [
    r"\b(hate|kill|die|attack|violence|terror)\b",
    r"\b(bully|harass|abuse|threat)\b",
    r"\b(discriminat|racist|sexist|homophobe)\b",
    r"\b(spam|scam|fraud|cheat)\b",
]

profanity.load_censor_words()

CATEGORY_KEYWORDS = {
    "profanity": [
        "fuck", "shit", "ass", "bitch", "damn", "crap", "dick", "piss",
        "bastard", "slut", "whore", "damn", "hell",
    ],
    "hate_speech": [
        "hate", "kill", "die", "murder", "terror", "attack",
    ],
    "harassment": [
        "bully", "harass", "threat", "abuse", "creep", "stalk",
    ],
    "spam": [
        "click here", "free money", "earn quick", "buy now", "limited offer",
        "act now", "congratulation you won",
    ],
    "cheating": [
        "cheat", "plagiarize", "copy my work", "do my homework", "write my essay",
        "pay someone", "fake result",
    ],
}


def check_toxicity(text: str) -> tuple[float, list[str], list[str]]:
    text_lower = text.lower()
    flagged_words = []
    categories = []
    total_score = 0.0

    if profanity.contains_profanity(text):
        for word in text_lower.split():
            if profanity.contains_profanity(word):
                flagged_words.append(word)
        categories.append("profanity")
        total_score += 0.4

    for cat, keywords in CATEGORY_KEYWORDS.items():
        matches = [kw for kw in keywords if kw in text_lower]
        if matches:
            categories.append(cat)
            flagged_words.extend(matches)
            total_score += 0.3

    total_score = min(total_score, 1.0)
    return total_score, list(set(flagged_words)), list(set(categories))


def create_admin_report(user_id: str, text: str, score: float, categories: list[str]):
    report_id = str(uuid.uuid4())
    execute_query(
        """INSERT INTO "Report" (id, "reporterId", "reportedUserId", "contentType", "contentId", reason, status, "createdAt")
           VALUES (:id, 'moderation-bot', :user_id, 'message', NULL, :reason, 'pending', :now)""",
        {
            "id": report_id,
            "user_id": user_id,
            "reason": f"Auto-flagged: {', '.join(categories)} (score: {score:.2f})",
            "now": datetime.utcnow(),
        },
    )

    execute_query(
        """INSERT INTO "Notification" (id, "userId", type, title, body, "createdAt")
           SELECT :nid, u.id, 'MODERATION_ALERT', 'Content Flagged',
                  :body, :now
           FROM "User" u
           WHERE u.role = 'ADMIN'""",
        {
            "nid": str(uuid.uuid4()),
            "body": f"User {user_id} sent flagged content ({', '.join(categories)}). Review needed.",
            "now": datetime.utcnow(),
        },
    )


@app.post("/health")
def health():
    return {"status": "ok"}


@app.post("/moderate", response_model=ModerationResponse)
def moderate_content(req: ModerationRequest):
    score, flagged_words, categories = check_toxicity(req.text)

    should_report = score >= 0.6 or "hate_speech" in categories or "harassment" in categories

    if should_report:
        try:
            create_admin_report(req.user_id, req.text, score, categories)
        except Exception as e:
            print(f"Failed to create report: {e}")

    return ModerationResponse(
        is_toxic=score >= 0.3,
        toxicity_score=round(score, 4),
        flagged_words=flagged_words,
        categories=categories,
        should_report=should_report,
    )


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", 8003))
    uvicorn.run(app, host="0.0.0.0", port=port)
