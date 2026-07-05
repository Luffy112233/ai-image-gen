"""Celery configuration for async image generation."""

import os
from celery import Celery

# Set default Django settings module (we don't use Django, so just use config)
os.environ.setdefault('CELERY_BROKER_URL', 'redis://localhost:6379/0')

app = Celery('ai_image_gen')

# Load config from backend/app/core/config.py
app.config_from_object('django.conf:settings', namespace='CELERY')
app.conf.update(
    broker_url='redis://localhost:6379/0',
    result_backend='redis://localhost:6379/1',
    task_serializer='json',
    result_serializer='json',
    accept_content=['json'],
    timezone='Asia/Shanghai',
    enable_utc=True,
    worker_concurrency=4,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    # Task time limits (image gen can take a while)
    task_soft_time_limit=300,  # 5 minutes soft limit
    task_time_limit=600,       # 10 minutes hard limit
)

# Auto-discover tasks from all app packages
app.autodiscover_tasks(['app.tasks'])
