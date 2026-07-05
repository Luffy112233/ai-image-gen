"""Async image generation tasks without Celery — uses asyncio + BackgroundTasks."""

import asyncio
import uuid
import base64
import io
from datetime import datetime
from typing import List, Dict

from app.adapters.factory import get_adapter
from app.adapters.base import GenerationRequest, ImageGenerationResult

# In-memory task status store
_task_status: Dict[str, dict] = {}


def _update_progress(task_id: str, progress: int, status: str = "generating", images: List[dict] = None, error: str = None):
    """Update task status."""
    _task_status[task_id] = {
        "task_id": task_id,
        "status": status,
        "progress": progress,
        "images": images or [],
        "error": error,
        "updated_at": datetime.utcnow().isoformat(),
        "created_at": _task_status.get(task_id, {}).get("created_at", datetime.utcnow().isoformat()),
        "prompt": _task_status.get(task_id, {}).get("request", {}).get("prompt", ""),
    }


async def _generate_single(request_data: dict, provider: str = "proxy"):
    """Generate a single image asynchronously."""
    task_id = request_data.get("task_id", str(uuid.uuid4())[:12])
    _update_progress(task_id, 0, "pending")
    
    try:
        print(f"[GENERATOR] Starting task {task_id} for prompt: {request_data.get('prompt','')}")
        print(f"[GENERATOR] request_data keys: {list(request_data.keys())}, has_image_url: {'image_url' in request_data}")
        gen_request = GenerationRequest(**{k: v for k, v in request_data.items() if k not in ("task_id", "provider")})
        print(f"[GENERATOR] gen_request.image_url length: {len(gen_request.image_url) if gen_request.image_url else 0}")
        _update_progress(task_id, 20, "generating")
        print(f"[GENERATOR] Creating adapter")
        
        adapter = get_adapter(provider)
        print(f"[GENERATOR] Calling adapter.generate()...")
        
        # Run sync adapter.generate() in executor to avoid blocking
        loop = asyncio.get_event_loop()
        results: List[ImageGenerationResult] = await loop.run_in_executor(
            None, lambda: adapter.generate(gen_request)
        )
        print(f"[GENERATOR] Got {len(results)} results")
        
        _update_progress(task_id, 80, "generating")
        
        images = [{"url": r.url, "b64_json": r.b64_json, "width": r.width, "height": r.height} for r in results]
        _update_progress(task_id, 100, "completed", images)
        print(f"[GENERATOR] Task {task_id} completed with {len(images)} images")
        
        return {"task_id": task_id, "status": "completed", "images": images, "progress": 100}
        
    except Exception as e:
        print(f"[GENERATOR] Task {task_id} failed: {e}")
        import traceback
        traceback.print_exc()
        _update_progress(task_id, 0, "failed", error=str(e))
        return {"task_id": task_id, "status": "failed", "error": str(e), "progress": 0}


async def _generate_batch(request_data_list: List[dict], provider: str = "proxy"):
    """Generate images in parallel."""
    tasks = [_generate_single(req, provider) for req in request_data_list]
    return await asyncio.gather(*tasks, return_exceptions=True)


def cancel_task(task_id: str):
    """Cancel a running task."""
    if task_id in _task_status:
        _task_status[task_id]["status"] = "cancelled"
        return {"cancelled": True, "task_id": task_id}
    return {"cancelled": False, "task_id": task_id, "error": "Task not found"}


def get_task_status_sync(task_id: str) -> dict:
    """Get task status synchronously."""
    return _task_status.get(task_id, {"task_id": task_id, "status": "not_found"})


def list_tasks() -> list:
    """List all tasks."""
    return list(_task_status.values())


def clear_completed_tasks() -> int:
    """Clear completed/failed/cancelled tasks."""
    to_remove = [tid for tid, s in _task_status.items() if s.get("status") in ("completed", "failed", "cancelled")]
    for tid in to_remove:
        del _task_status[tid]
    return len(to_remove)
