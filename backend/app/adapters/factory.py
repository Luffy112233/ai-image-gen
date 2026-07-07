"""Model adapter factory."""

from app.adapters.proxy_api import ProxyApiAdapter
from app.adapters.dynamic import DynamicApiAdapter
from app.adapters.base import BaseImageAdapter
from app.core.config import get_settings
from app.core.api_configs import get_active_config, list_configs, init_db as init_api_configs_db


# Registry of available adapters
ADAPTERS: dict[str, BaseImageAdapter] = {}


def init_adapters():
    """Initialize all adapters from config."""
    # 初始化 API 配置数据库
    init_api_configs_db()
    
    # 首先尝试从数据库加载活跃配置
    active_config = get_active_config()
    if active_config:
        adapter = DynamicApiAdapter(
            config_id=active_config["id"],
            name=active_config["name"],
            api_url=active_config["api_url"],
            api_key=active_config["api_key"],
        )
        # 自动探测模型列表
        try:
            models = adapter.discover_models()
            print(f"[FACTORY] Discovered {len(models)} models for '{active_config['name']}'")
        except Exception as e:
            print(f"[FACTORY] Model discovery failed for '{active_config['name']}': {e}")
        ADAPTERS[active_config["id"]] = adapter
        print(f"[FACTORY] Loaded active config: {active_config['name']}")
        return
    
    # 如果没有活跃配置，使用默认的中转站配置
    settings = get_settings()
    ADAPTERS["proxy"] = ProxyApiAdapter(
        api_url=settings.PROXY_API_URL,
        api_key=settings.PROXY_API_KEY,
    )
    print("[FACTORY] Using default proxy adapter")


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


def reload_adapters():
    """重新加载适配器（用于配置变更后）。"""
    global ADAPTERS
    ADAPTERS.clear()
    init_adapters()
