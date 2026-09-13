from datetime import datetime

from pydantic import BaseModel


class DashboardSummary(BaseModel):
    total_donors: int
    verified_donors: int
    available_donors: int
    total_requests: int
    requests_by_status: dict[str, int]
    total_hospitals: int
    verified_hospitals: int
    total_blood_banks: int
    verified_blood_banks: int
    notifications_sent: int
    notifications_failed: int
    ai_sessions_total: int
    ai_tool_calls_blocked: int


class RequestAnalytics(BaseModel):
    total_requests: int
    fulfilled_requests: int
    cancelled_requests: int
    fulfillment_rate_pct: float
    avg_fulfillment_minutes: float | None
    requests_by_blood_group: dict[str, int]
    requests_by_urgency: dict[str, int]


class DonorAnalytics(BaseModel):
    total_donors: int
    verified_donors: int
    pending_donors: int
    donors_by_blood_group: dict[str, int]
    emergency_available_donors: int


class AuditLogOut(BaseModel):
    id: str
    actor_id: str
    actor_role: str
    action: str
    target_type: str
    target_id: str
    details: dict
    created_at: datetime
