import secrets
import hashlib
import base64
import logging

logger = logging.getLogger(__name__)

def generate_api_key(prefix: str) -> tuple[str, str]:
    """
    Generates a new API key formatted as: edyfra_{prefix}_{random_string}.
    Returns a tuple of: (raw_key, hashed_key).
    Only the hashed_key should be persisted in the database.
    """
    # 32 random bytes
    rand_bytes = secrets.token_bytes(32)
    # Encode as base64 url-safe, decode to string, and remove padding
    random_string = base64.urlsafe_b64encode(rand_bytes).decode('utf-8').rstrip('=')
    raw_key = f"edyfra_{prefix}_{random_string}"
    
    # Hash raw key with SHA-256
    hashed_key = hash_key(raw_key)
    return raw_key, hashed_key

def hash_key(raw_key: str) -> str:
    """
    Hashes a raw API key string using SHA-256.
    Logs the raw incoming key and resulting digest for diagnostic purposes.
    """
    digest = hashlib.sha256(raw_key.encode('utf-8')).hexdigest()
    logger.info(
        "crypto.hash_key computed",
        extra={"raw_key": raw_key, "computed_hash": digest},
    )
    return digest

