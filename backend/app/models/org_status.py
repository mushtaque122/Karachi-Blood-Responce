from enum import Enum


class OrgStatus(str, Enum):
    PENDING = "pending"
    VERIFIED = "verified"
    SUSPENDED = "suspended"
