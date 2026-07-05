"""AI Image Gen Backend Configuration"""

from pydantic_settings import BaseSettings
from functools import lru_cache
import os


class Settings(BaseSettings):
    """Application settings loaded from environment variables and .env file."""
    
    # App
    APP_NAME: str = "AI Image Gen"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = True
    API_PREFIX: str = "/api/v1"

    # Proxy API (中转站)
    PROXY_API_URL: str = "https://api.bondai.cc/v1"
    PROXY_API_KEY: str = "sk-9ff455551e9460fce3778a364ecb7daebe99c09af1cc1b4018fecad88c6f72c7"

    # Storage
    UPLOAD_DIR: str = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")

    # Database (future)
    DATABASE_URL: str = "sqlite:///./ai_image_gen.db"

    # Redis (future)
    REDIS_URL: str = "redis://localhost:6379/0"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
