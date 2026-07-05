"""WebSocket endpoints for real-time task progress."""

import asyncio
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.tasks.generator import get_task_status_sync, _task_status

router = APIRouter()

# Store active WebSocket connections: task_id -> list of websockets
_active_connections: dict[str, list[WebSocket]] = {}


@router.websocket("/ws/tasks/{task_id}")
async def task_progress_websocket(websocket: WebSocket, task_id: str):
    """
    WebSocket endpoint for real-time task progress.
    
    Connect: ws://localhost:8000/ws/tasks/{task_id}
    Send: {"type": "ping"} to keep alive
    Receives: {"type": "status_update", "task_id": "...", "status": "...", "progress": 50, ...}
    """
    await websocket.accept()
    
    # Register this connection
    if task_id not in _active_connections:
        _active_connections[task_id] = []
    _active_connections[task_id].append(websocket)
    
    # Send initial status
    status = get_task_status_sync(task_id)
    await websocket.send_json({
        "type": "status_update",
        "task_id": task_id,
        **status,
    })
    
    # Keep connection alive
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
        # Clean up connection
        if task_id in _active_connections:
            _active_connections[task_id] = [
                ws for ws in _active_connections[task_id] if ws != websocket
            ]
            if not _active_connections[task_id]:
                del _active_connections[task_id]


@router.websocket("/ws/tasks")
async def task_progress_websocket_all(websocket: WebSocket):
    """
    WebSocket endpoint for all tasks (subscribe to specific task later).
    
    Connect: ws://localhost:8000/ws/tasks
    Send: {"type": "subscribe", "task_id": "abc123"}
    """
    await websocket.accept()
    
    client_id = f"client-{id(websocket)}"
    _active_connections[client_id] = [websocket]
    
    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            
            if msg.get("type") == "subscribe":
                task_id = msg.get("task_id")
                if task_id:
                    # Send current status
                    status = get_task_status_sync(task_id)
                    await websocket.send_json({
                        "type": "status_update",
                        "task_id": task_id,
                        **status,
                    })
            
            elif msg.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
                
            elif msg.get("type") == "unsubscribe":
                break
                
    except WebSocketDisconnect:
        pass
    finally:
        if client_id in _active_connections:
            del _active_connections[client_id]


def broadcast_task_update(task_id: str, update: dict):
    """Broadcast a task status update to all connected WebSocket clients."""
    if task_id in _active_connections:
        message = {
            "type": "status_update",
            "task_id": task_id,
            **update,
        }
        for ws in list(_active_connections[task_id]):
            try:
                asyncio.create_task(ws.send_json(message))
            except Exception:
                pass
