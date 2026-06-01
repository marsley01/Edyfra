import os
import sys
import numpy as np
from fastapi import FastAPI, HTTPException
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from shared.db import fetch_all
from shared.models import RecommendationRequest, RecommendationResponse

app = FastAPI(title="Edyfra Recommendations Service", version="1.0.0")

model = None

def get_model():
    global model
    if model is None:
        model = SentenceTransformer("all-MiniLM-L6-v2")
    return model


@app.post("/health")
def health():
    return {"status": "ok"}


@app.post("/recommend/tutors", response_model=RecommendationResponse)
def recommend_tutors(req: RecommendationRequest):
    embedder = get_model()

    tutors = fetch_all(
        """SELECT u.id, u.name, u."educationLevel", tp.subjects, tp.bio,
                  tp.rating, tp."hourlyRate", tp."isVerified"
           FROM "User" u
           JOIN "TutorProfile" tp ON tp."userId" = u.id
           WHERE tp."isVerified" = true
           AND u.id != :user_id""",
        {"user_id": req.user_id},
    )

    if not tutors:
        return RecommendationResponse(recommendations=[])

    user = fetch_one(
        """SELECT name, "educationLevel", subjects FROM "User" WHERE id = :id""",
        {"id": req.user_id},
    )

    user_context = f"{user.get('name', '')} {user.get('educationLevel', '')} {req.subject or ''}"
    user_embedding = embedder.encode(user_context)

    scored = []
    for t in tutors:
        tutor_text = f"{t['name']} {' '.join(t['subjects'] or [])} {t['bio'] or ''} {t.get('educationLevel', '')}"
        tutor_embedding = embedder.encode(tutor_text)
        sim = float(cosine_similarity([user_embedding], [tutor_embedding])[0][0])
        rating_boost = (t["rating"] or 0) / 10.0
        scored.append({
            "id": t["id"],
            "name": t["name"],
            "subjects": t["subjects"],
            "bio": t["bio"],
            "rating": t["rating"],
            "hourlyRate": t["hourlyRate"],
            "score": round(sim * 0.7 + rating_boost * 0.3, 4),
        })

    scored.sort(key=lambda x: x["score"], reverse=True)
    return RecommendationResponse(recommendations=scored[: req.limit])


@app.post("/recommend/resources", response_model=RecommendationResponse)
def recommend_resources(req: RecommendationRequest):
    embedder = get_model()

    resources = fetch_all(
        """SELECT id, title, description, subject, level, type, price, rating
           FROM "Resource"
           WHERE status = 'approved'""",
    )

    if not resources:
        return RecommendationResponse(recommendations=[])

    user_context = req.subject or ""
    user_embedding = embedder.encode(user_context)

    scored = []
    for r in resources:
        resource_text = f"{r['title']} {r['description'] or ''} {r['subject'] or ''} {r['level'] or ''}"
        resource_embedding = embedder.encode(resource_text)
        sim = float(cosine_similarity([user_embedding], [resource_embedding])[0][0])
        scored.append({
            "id": r["id"],
            "title": r["title"],
            "subject": r["subject"],
            "type": r["type"],
            "price": r["price"],
            "rating": r["rating"],
            "score": round(sim, 4),
        })

    scored.sort(key=lambda x: x["score"], reverse=True)
    return RecommendationResponse(recommendations=scored[: req.limit])


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)
