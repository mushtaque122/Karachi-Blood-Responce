from enum import Enum


class RequestStatus(str, Enum):
    DRAFT = "draft"
    PENDING_VERIFICATION = "pending_verification"
    VERIFIED = "verified"
    MATCHING = "matching"
    DONORS_FOUND = "donors_found"
    IN_PROGRESS = "in_progress"
    FULFILLED = "fulfilled"
    CANCELLED = "cancelled"
    EXPIRED = "expired"


# Explicit allowed transitions — the API rejects anything not listed here.
# Kept simple and centralized so no route can silently skip a step.
ALLOWED_TRANSITIONS: dict[RequestStatus, set[RequestStatus]] = {
    RequestStatus.DRAFT: {RequestStatus.PENDING_VERIFICATION, RequestStatus.CANCELLED},
    RequestStatus.PENDING_VERIFICATION: {RequestStatus.VERIFIED, RequestStatus.CANCELLED},
    RequestStatus.VERIFIED: {RequestStatus.MATCHING, RequestStatus.DONORS_FOUND, RequestStatus.CANCELLED},
    RequestStatus.MATCHING: {RequestStatus.DONORS_FOUND, RequestStatus.MATCHING, RequestStatus.CANCELLED},
    RequestStatus.DONORS_FOUND: {RequestStatus.IN_PROGRESS, RequestStatus.MATCHING, RequestStatus.CANCELLED},
    RequestStatus.IN_PROGRESS: {RequestStatus.FULFILLED, RequestStatus.CANCELLED},
    RequestStatus.FULFILLED: set(),
    RequestStatus.CANCELLED: set(),
    RequestStatus.EXPIRED: set(),
}


def can_transition(current: RequestStatus, target: RequestStatus) -> bool:
    return target in ALLOWED_TRANSITIONS.get(current, set())
