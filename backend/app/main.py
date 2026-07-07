"""AI Image Gen Backend Application Entry Point"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import get_settings
from app.adapters.factory import init_adapters, list_available_adapters
from app.tasks.generator import _task_status
from app.api.auth import init_db as init_auth_db
import os
import asyncio
import json

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle management."""
    # Startup
    init_adapters()
    init_auth_db()
    yield
    # Shutdown
    pass


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI图像生成平台 — 支持文生图、图生图、多图参考、并行生成、图片编辑",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Upload directory static serving
UPLOAD_DIR = os.path.join(settings.UPLOAD_DIR, "images")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "providers": len(list_available_adapters()),
    }


# ── Register API routers ──────────────────────────────────
from app.api import generations, uploads, downloads, auth, api_configs
app.include_router(generations.router, prefix="/api/v1/generation")
app.include_router(uploads.router, prefix="/api/v1/upload")
app.include_router(downloads.router, prefix="/api/v1/download")
app.include_router(api_configs.router)

# ── Auth routes ───────────────────────────────────────────
app.include_router(auth.router, prefix="/api/v1/auth")


# ── WebSocket: real-time task progress ────────────────────
_active_ws: dict[str, list[WebSocket]] = {}


@app.websocket("/ws/tasks/{task_id}")
async def ws_task_progress(websocket: WebSocket, task_id: str):
    await websocket.accept()
    if task_id not in _active_ws:
        _active_ws[task_id] = []
    _active_ws[task_id].append(websocket)
    
    # Send current status
    status = _task_status.get(task_id, {"task_id": task_id, "status": "not_found"})
    await websocket.send_json({"type": "status_update", "task_id": task_id, **status})
    
    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            if msg.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
            elif msg.get("type") == "unsubscribe":
                break
    except WebSocketDisconnect:
        pass
    finally:
        if task_id in _active_ws:
            _active_ws[task_id] = [w for w in _active_ws[task_id] if w != websocket]
            if not _active_ws[task_id]:
                del _active_ws[task_id]


@app.websocket("/ws/tasks")
async def ws_all_tasks(websocket: WebSocket):
    await websocket.accept()
    client_id = f"client-{id(websocket)}"
    _active_ws[client_id] = [websocket]
    
    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            if msg.get("type") == "subscribe":
                tid = msg.get("task_id")
                if tid and tid in _task_status:
                    await websocket.send_json({
                        "type": "status_update",
                        "task_id": tid,
                        **_task_status[tid],
                    })
            elif msg.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
            elif msg.get("type") == "unsubscribe":
                break
    except WebSocketDisconnect:
        pass
    finally:
        if client_id in _active_ws:
            del _active_ws[client_id]


def broadcast_task_update(task_id: str, update: dict):
    """Broadcast task update to WebSocket clients."""
    if task_id in _active_ws:
        msg = {"type": "status_update", "task_id": task_id, **update}
        for ws in list(_active_ws[task_id]):
            try:
                asyncio.create_task(ws.send_json(msg))
            except Exception:
                pass
