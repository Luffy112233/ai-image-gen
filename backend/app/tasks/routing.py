"""WebSocket URL routing."""

from django.urls import re_path

from app.tasks.consumer import TaskProgressConsumer

websocket_urlpatterns = [
    re_path(r"ws/tasks/$", TaskProgressConsumer.as_asgi()),
]
