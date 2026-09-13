from enum import Enum


class Urgency(str, Enum):
    NORMAL = "normal"
    URGENT = "urgent"
    CRITICAL = "critical"
