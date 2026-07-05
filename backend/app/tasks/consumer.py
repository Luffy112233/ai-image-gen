"""WebSocket consumer for real-time task progress updates."""

import json
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from app.tasks.generator import get_task_status_sync


class TaskProgressConsumer(AsyncJsonWebsocketConsumer):
    """
    WebSocket consumer that pushes task progress updates to connected clients.
    
    Clients connect with: ws://localhost:8000/ws/tasks/
    Then subscribe to a specific task: {"type": "subscribe", "task_id": "abc123"}
    """
    
    async def connect(self):
        """Accept WebSocket connection."""
        await self.accept()
    
    async def disconnect(self, close_code):
        """Clean up on disconnect."""
        pass
    
    async def receive(self, text_data):
        """Handle incoming messages."""
        data = json.loads(text_data)
        
        if data.get("type") == "subscribe":
            task_id = data.get("task_id")
            if task_id:
                self.task_id = task_id
                # Send current status immediately
                status = get_task_status_sync(task_id)
                await self.send_json({
                    "type": "status_update",
                    "task_id": task_id,
                    **status,
                })
        
        elif data.get("type") == "unsubscribe":
            self.task_id = None
    
    async def task_progress_update(self, event):
        """Receive task progress from task handler and send to WebSocket."""
        await self.send_json({
            "type": "status_update",
            "task_id": event["task_id"],
            "status": event["status"],
            "progress": event["progress"],
            "images": event.get("images", []),
            "error": event.get("error"),
        })
