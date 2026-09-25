import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nqp_backend.settings')
app = Celery('nqp_backend')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks(
    packages=[
        'apps.notifications',
        'apps.who',
    ]
)
