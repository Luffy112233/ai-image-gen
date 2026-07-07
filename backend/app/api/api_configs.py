"""API 配置管理路由 — 增删改查 + 测试连通性 + 模型探测。"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.core.api_configs import (
    list_configs,
    get_config,
    create_config,
    update_config,
    delete_config,
    set_active_config,
    get_active_config,
)
from app.adapters.dynamic import DynamicApiAdapter
from app.adapters.factory import reload_adapters

router = APIRouter(prefix="/v1/api-configs", tags=["api-configs"])


class ConfigCreate(BaseModel):
    name: str
    api_url: str
    api_key: str


class ConfigUpdate(BaseModel):
    name: Optional[str] = None
    api_url: Optional[str] = None
    api_key: Optional[str] = None


class TestResult(BaseModel):
    success: bool
    message: str
    models: list[str]


@router.get("")
def get_all_configs():
    """获取所有 API 配置。"""
    configs = list_configs()
    return {"configs": configs}


@router.get("/active")
def get_active_config_route():
    """获取当前活跃的 API 配置。"""
    config = get_active_config()
    if not config:
        raise HTTPException(status_code=404, detail="No active config found")
    return {"config": config}


@router.post("")
def create_new_config(data: ConfigCreate):
    """创建新的 API 配置。"""
    config = create_config(data.name, data.api_url, data.api_key)
    return {"config": config, "message": "Created successfully"}


@router.put("/{config_id}")
def update_existing_config(config_id: int, data: ConfigUpdate):
    """更新 API 配置。"""
    existing = get_config(config_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Config not found")
    
    name = data.name if data.name is not None else existing["name"]
    api_url = data.api_url if data.api_url is not None else existing["api_url"]
    api_key = data.api_key if data.api_key is not None else existing["api_key"]
    
    config = update_config(config_id, name, api_url, api_key)
    return {"config": config, "message": "Updated successfully"}


@router.delete("/{config_id}")
def remove_config(config_id: int):
    """删除 API 配置。"""
    if not delete_config(config_id):
        raise HTTPException(status_code=404, detail="Config not found")
    return {"message": "Deleted successfully"}


@router.post("/{config_id}/activate")
def activate_config(config_id: int):
    """设置为活跃配置。"""
    if not get_config(config_id):
        raise HTTPException(status_code=404, detail="Config not found")
    
    success = set_active_config(config_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to activate config")
    
    # 重新加载适配器
    reload_adapters()
    
    return {"message": "Config activated and adapters reloaded"}


@router.post("/{config_id}/test", response_model=TestResult)
def test_connection(config_id: int):
    """测试 API 连通性并获取模型列表。"""
    config = get_config(config_id)
    if not config:
        raise HTTPException(status_code=404, detail="Config not found")
    
    adapter = DynamicApiAdapter(
        config_id=config["id"],
        name=config["name"],
        api_url=config["api_url"],
        api_key=config["api_key"],
    )
    
    result = adapter.test_connection()
    return TestResult(**result)


@router.post("/{config_id}/discover-models", response_model=TestResult)
def discover_models(config_id: int):
    """单独探测模型列表。"""
    config = get_config(config_id)
    if not config:
        raise HTTPException(status_code=404, detail="Config not found")
    
    adapter = DynamicApiAdapter(
        config_id=config["id"],
        name=config["name"],
        api_url=config["api_url"],
        api_key=config["api_key"],
    )
    
    models = adapter.discover_models()
    return TestResult(
        success=True,
        message=f"Found {len(models)} models",
        models=models,
    )
