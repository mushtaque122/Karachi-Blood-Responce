from enum import Enum


class NotificationChannel(str, Enum):
    IN_APP = "in_app"
    EMAIL = "email"
    SMS = "sms"
    PUSH = "push"


class NotificationPriority(str, Enum):
    NORMAL = "normal"
    HIGH = "high"
    EMERGENCY = "emergency"


class DeliveryStatus(str, Enum):
    PENDING = "pending"
    SENT = "sent"
    FAILED = "failed"
    READ = "read"
