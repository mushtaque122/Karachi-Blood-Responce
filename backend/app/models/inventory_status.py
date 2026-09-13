from enum import Enum


class InventoryStatus(str, Enum):
    AVAILABLE = "available"
    RESERVED = "reserved"
    ISSUED = "issued"
    EXPIRED = "expired"
    QUARANTINED = "quarantined"
    DISCARDED = "discarded"
