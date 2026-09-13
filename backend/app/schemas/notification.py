from datetime import datetime

from pydantic import BaseModel

from app.models.notification import DeliveryStatus, NotificationChannel, NotificationPriority


class NotificationOut(BaseModel):
    id: str
    channel: NotificationChannel
    priority: NotificationPriority
    title: str
    body: str
    status: DeliveryStatus
    read: bool
    created_at: datetime
