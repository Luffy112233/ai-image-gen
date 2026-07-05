"""Response caching for API endpoints."""

import functools
from typing import Any, Dict
from fastapi import Request
from fastapi.responses import JSONResponse


class SimpleCache:
    """Simple in-memory cache with TTL."""
    
    def __init__(self, ttl: int = 300):
        self.ttl = ttl
        self._cache: Dict[str, tuple] = {}
    
    def get(self, key: str) -> Any | None:
        if key in self._cache:
            value, timestamp = self._cache[key]
            import time
            if time.time() - timestamp < self.ttl:
                return value
            del self._cache[key]
        return None
    
    def set(self, key: str, value: Any) -> None:
        self._cache[key] = (value, __import__('time').time())


# Global cache instance
cache = SimpleCache(ttl=300)


def cached(max_size: int = 100):
    """Decorator to cache function results."""
    def decorator(func):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            key = f"{func.__name__}:{str(args)}:{str(kwargs)}"
            cached_value = cache.get(key)
            if cached_value is not None:
                return cached_value
            
            result = await func(*args, **kwargs)
            if len(cache._cache) < max_size:
                cache.set(key, result)
            return result
        return wrapper
    return decorator
