import time
import threading
from typing import Any, Optional

class InMemoryCache:
    def __init__(self):
        self._cache = {}
        self._lock = threading.Lock()

    def get(self, key: str) -> Optional[Any]:
        with self._lock:
            if key not in self._cache:
                return None
            item = self._cache[key]
            if time.time() > item["expires_at"]:
                del self._cache[key]
                return None
            return item["value"]

    def set(self, key: str, value: Any, ttl_seconds: int) -> None:
        with self._lock:
            self._cache[key] = {
                "value": value,
                "expires_at": time.time() + ttl_seconds
            }

    def delete(self, key: str) -> None:
        with self._lock:
            if key in self._cache:
                del self._cache[key]

cache = InMemoryCache()
