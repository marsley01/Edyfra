import os
import sys
import hashlib
import numpy as np
from fastapi import FastAPI
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from shared.db import fetch_all, execute_query
from shared.models import PlagiarismRequest, PlagiarismResponse

app = FastAPI(title="Edyfra Plagiarism Detection Service", version="1.0.0")

model = None
content_cache = []

def get_model():
    global model
    if model is None:
        model = SentenceTransformer("all-MiniLM-L6-v2")
    return model


def load_content_cache():
    global content_cache
    rows = fetch_all(
        """SELECT id, content, "sessionId", "isMash", "createdAt"
           FROM "Message"
           WHERE "isMash" = false
           ORDER BY "createdAt" DESC
           LIMIT 10000"""
    )
    content_cache = [
        {"id": r["id"], "content": r["content"], "session_id": r["sessionId"]}
        for r in rows
        if r["content"] and len(r["content"]) > 50
    ]


@app.post("/health")
def health():
    return {"status": "ok", "cached_documents": len(content_cache)}


@app.post("/check", response_model=PlagiarismResponse)
def check_plagiarism(req: PlagiarismRequest):
    if len(req.text.strip()) < 30:
        return PlagiarismResponse(
            is_plagiarized=False,
            similarity_score=0.0,
            matches=[],
        )

    embedder = get_model()
    load_content_cache()

    if not content_cache:
        return PlagiarismResponse(
            is_plagiarized=False,
            similarity_score=0.0,
            matches=[],
        )

    query_embedding = embedder.encode(req.text)
    stored_texts = [c["content"] for c in content_cache]
    stored_embeddings = embedder.encode(stored_texts)

    similarities = cosine_similarity([query_embedding], stored_embeddings)[0]
    max_sim = float(np.max(similarities))
    max_idx = int(np.argmax(similarities))

    threshold = 0.75
    matches = []
    if max_sim >= threshold:
        match = content_cache[max_idx]
        matches.append({
            "matched_content_id": match["id"],
            "session_id": match["session_id"],
            "similarity": round(max_sim, 4),
            "snippet": match["content"][:200],
        })

    return PlagiarismResponse(
        is_plagiarized=max_sim >= threshold,
        similarity_score=round(max_sim, 4),
        matches=matches,
    )


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", 8002))
    uvicorn.run(app, host="0.0.0.0", port=port)
