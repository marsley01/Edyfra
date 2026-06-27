import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "")
if not DATABASE_URL:
    load_dotenv(dotenv_path="../.env")
    DATABASE_URL = os.getenv("DATABASE_URL", "")

engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_size=5, max_overflow=10)
SessionLocal = sessionmaker(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _make_params_safe(params: dict | None) -> dict:
    """Sanitize parameter values to prevent NoSQL-style injection."""
    if params is None:
        return {}
    safe = {}
    for k, v in params.items():
        if isinstance(v, str):
            safe[k] = v.replace("\x00", "")
        else:
            safe[k] = v
    return safe


def execute_query(query: str, params: dict = None):
    with engine.connect() as conn:
        result = conn.execute(text(query), _make_params_safe(params))
        conn.commit()
        return result


def fetch_all(query: str, params: dict = None):
    with engine.connect() as conn:
        result = conn.execute(text(query), _make_params_safe(params))
        rows = result.fetchall()
        return [dict(row._mapping) for row in rows]


def fetch_one(query: str, params: dict = None):
    with engine.connect() as conn:
        result = conn.execute(text(query), _make_params_safe(params))
        row = result.fetchone()
        return dict(row._mapping) if row else None
