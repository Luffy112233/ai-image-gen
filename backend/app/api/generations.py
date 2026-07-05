"""Generation API routes — async via asyncio + BackgroundTasks."""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
from typing import List, Optional
import asyncio
import uuid

from app.adapters.factory import list_available_adapters
from app.adapters.base import GenerationRequest
from app.tasks.generator import (
    _generate_single,
    _generate_batch,
    cancel_task,
    get_task_status_sync,
    _task_status,
    clear_completed_tasks,
)

router = APIRouter()


class GenerateRequest(BaseModel):
    prompt: str
    model: Optional[str] = "gpt-image-2"
    size: Optional[str] = "1024x1024"
    n: Optional[int] = 1
    negative_prompt: Optional[str] = None
    seed: Optional[int] = None
    guidance_scale: Optional[float] = 7.5
    image_url: Optional[str] = None  # for img2img (base64 data URL)
    async_mode: Optional[bool] = True


class BatchGenerateRequest(BaseModel):
    tasks: List[GenerateRequest]
    async_mode: Optional[bool] = True


class EditRequest(BaseModel):
    image_url: str
    prompt: Optional[str] = None
    edit_type: str = Field(default="inpaint", description="inpaint|outpaint|upscale|stylize")
    mask_url: Optional[str] = None


class GenerationResponse(BaseModel):
    task_id: str
    status: str
    progress: int = 0
    images: Optional[List[dict]] = None
    error: Optional[str] = None


@router.post("", response_model=GenerationResponse)
async def create_generation(
    req: GenerateRequest,
    background_tasks: BackgroundTasks,
):
    """Generate image(s) — returns immediately in async mode."""
    task_id = str(uuid.uuid4())
    request_data = {**req.model_dump(exclude={"async_mode"}), "task_id": task_id}
    
    if req.async_mode:
        # Use BackgroundTasks to prevent GC from killing the coroutine
        background_tasks.add_task(_generate_single, request_data)
        return {"task_id": task_id, "status": "pending", "progress": 0}
    else:
        result = await _generate_single(request_data)
        return result


@router.post("/batch", response_model=List[GenerationResponse])
async def batch_generation(
    req: BatchGenerateRequest,
    background_tasks: BackgroundTasks,
):
    """Batch generate multiple images in parallel."""
    task_ids = [str(uuid.uuid4()) for _ in req.tasks]
    request_data_list = [{**t.model_dump(exclude={"async_mode"}), "task_id": tid} for t, tid in zip(req.tasks, task_ids)]
    
    if req.async_mode:
        background_tasks.add_task(_generate_batch, request_data_list)
        return [{"task_id": tid, "status": "pending", "progress": 0} for tid in task_ids]
    else:
        results = await _generate_batch(request_data_list)
        return results


from app.core.cache import cached


@router.get("/models")
@cached()
async def list_models():
    """List available adapters and their models (cached)."""
    adapters = list_available_adapters()
    return {"models": [{"id": a["id"], "name": a["name"], "models": a.get("models", [])} for a in adapters]}


@router.get("/status/{task_id}")
async def get_status(task_id: str):
    """Get task status."""
    status = get_task_status_sync(task_id)
    if status.get("status") == "not_found":
        raise HTTPException(status_code=404, detail="Task not found")
    return status


@router.get("/history")
async def get_history():
    """List all tasks."""
    return {"history": list(_task_status.values())}


@router.delete("/history/{task_id}")
async def delete_task(task_id: str):
    """Delete a task from history."""
    if task_id in _task_status:
        del _task_status[task_id]
        return {"deleted": True}
    raise HTTPException(status_code=404, detail="Task not found")


@router.post("/cancel/{task_id}")
async def cancel(task_id: str):
    """Cancel a running task."""
    return cancel_task(task_id)


@router.post("/edit", response_model=GenerationResponse)
async def edit_image(req: EditRequest, background_tasks: BackgroundTasks):
    """Edit an image (inpaint, upscale, stylize)."""
    task_id = str(uuid.uuid4())
    request_data = {**req.model_dump(), "task_id": task_id, "edit_type": req.edit_type}
    
    background_tasks.add_task(_generate_single, request_data)
    return {"task_id": task_id, "status": "pending", "progress": 0}


@router.post("/clear")
async def clear_history():
    """Clear all completed/failed tasks."""
    count = clear_completed_tasks()
    return {"cleared": count}
