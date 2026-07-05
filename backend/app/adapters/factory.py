"""Model adapter factory."""

from app.adapters.proxy_api import ProxyApiAdapter
from app.adapters.base import BaseImageAdapter
from app.core.config import get_settings


# Registry of available adapters
ADAPTERS: dict[str, BaseImageAdapter] = {}


def init_adapters():
    """Initialize all adapters from config."""
    settings = get_settings()
    
    # Proxy API (中转站)
    ADAPTERS["proxy"] = ProxyApiAdapter(
        api_url=settings.PROXY_API_URL,
        api_key=settings.PROXY_API_KEY,
    )
    
    # Future adapters (uncomment when keys available):
    # ADAPTERS["fal"] = FalAiAdapter(api_key=settings.FAL_API_KEY)
    # ADAPTERS["replicate"] = ReplicateAdapter(api_key=settings.REPLICATE_API_KEY)
    # ADAPTERS["stability"] = StabilityAiAdapter(api_key=settings.STABILITY_AI_KEY)
    # ADAPTERS["openai"] = OpenAiAdapter(api_key=settings.OPENAI_API_KEY)


def get_adapter(provider: str = "proxy") -> BaseImageAdapter:
    """Get an adapter by name."""
    if provider not in ADAPTERS:
        raise ValueError(f"Unknown provider: {provider}. Available: {list(ADAPTERS.keys())}")
    return ADAPTERS[provider]


def list_available_adapters() -> list[dict]:
    """Return info about all registered adapters."""
    return [
        {
            "id": name,
            "name": adapter.name,
            "models": adapter.supported_models,
        }
        for name, adapter in ADAPTERS.items()
    ]
