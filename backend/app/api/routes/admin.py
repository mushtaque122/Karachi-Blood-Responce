from fastapi import APIRouter, Depends, Query

from app.api.deps import require_roles
from app.db.mongodb import db
from app.models.donor_status import VerificationStatus
from app.models.notification import DeliveryStatus
from app.models.org_status import OrgStatus
from app.models.request_status import RequestStatus
from app.models.role import Role
from app.schemas.admin import AuditLogOut, DashboardSummary, DonorAnalytics, RequestAnalytics

router = APIRouter(prefix="/api/admin", tags=["admin"])

ADMIN_ONLY = (Role.ADMIN, Role.SUPER_ADMIN)


async def _count_by_field(collection, field: str, match: dict | None = None) -> dict[str, int]:
    pipeline = []
    if match:
        pipeline.append({"$match": match})
    pipeline.append({"$group": {"_id": f"${field}", "count": {"$sum": 1}}})
    return {row["_id"]: row["count"] async for row in collection.aggregate(pipeline)}


@router.get("/dashboard", response_model=DashboardSummary)
async def dashboard_summary(current_user: dict = Depends(require_roles(*ADMIN_ONLY))):
    total_donors = await db.donors.count_documents({})
    verified_donors = await db.donors.count_documents({"verification_status": VerificationStatus.VERIFIED.value})
    available_donors = await db.donors.count_documents({"availability": True})

    total_requests = await db.blood_requests.count_documents({})
    requests_by_status = await _count_by_field(db.blood_requests, "status")

    total_hospitals = await db.hospitals.count_documents({})
    verified_hospitals = await db.hospitals.count_documents({"status": OrgStatus.VERIFIED.value})
    total_blood_banks = await db.blood_banks.count_documents({})
    verified_blood_banks = await db.blood_banks.count_documents({"status": OrgStatus.VERIFIED.value})

    notifications_sent = await db.notifications.count_documents({"status": DeliveryStatus.SENT.value})
    notifications_failed = await db.notifications.count_documents({"status": DeliveryStatus.FAILED.value})

    ai_sessions_total = await db.ai_sessions.count_documents({})
    ai_tool_calls_blocked = await db.ai_tool_calls.count_documents({"success": False})

    return DashboardSummary(
        total_donors=total_donors,
        verified_donors=verified_donors,
        available_donors=available_donors,
        total_requests=total_requests,
        requests_by_status=requests_by_status,
        total_hospitals=total_hospitals,
        verified_hospitals=verified_hospitals,
        total_blood_banks=total_blood_banks,
        verified_blood_banks=verified_blood_banks,
        notifications_sent=notifications_sent,
        notifications_failed=notifications_failed,
        ai_sessions_total=ai_sessions_total,
        ai_tool_calls_blocked=ai_tool_calls_blocked,
    )


@router.get("/analytics/requests", response_model=RequestAnalytics)
async def request_analytics(current_user: dict = Depends(require_roles(*ADMIN_ONLY))):
    total_requests = await db.blood_requests.count_documents({})
    fulfilled_requests = await db.blood_requests.count_documents({"status": RequestStatus.FULFILLED.value})
    cancelled_requests = await db.blood_requests.count_documents({"status": RequestStatus.CANCELLED.value})

    fulfillment_rate = round((fulfilled_requests / total_requests) * 100, 1) if total_requests else 0.0

    # Average fulfillment time computed from real timestamps (created_at
    # to fulfilled_at, set precisely at the /fulfill transition — not
    # approximated from updated_at, which changes on every transition).
    avg_minutes = None
    durations = []
    async for req in db.blood_requests.find(
        {"status": RequestStatus.FULFILLED.value, "fulfilled_at": {"$ne": None}}
    ):
        delta = req["fulfilled_at"] - req["created_at"]
        durations.append(delta.total_seconds() / 60)
    if durations:
        avg_minutes = round(sum(durations) / len(durations), 1)

    by_blood_group = await _count_by_field(db.blood_requests, "blood_group")
    by_urgency = await _count_by_field(db.blood_requests, "urgency")

    return RequestAnalytics(
        total_requests=total_requests,
        fulfilled_requests=fulfilled_requests,
        cancelled_requests=cancelled_requests,
        fulfillment_rate_pct=fulfillment_rate,
        avg_fulfillment_minutes=avg_minutes,
        requests_by_blood_group=by_blood_group,
        requests_by_urgency=by_urgency,
    )


@router.get("/analytics/donors", response_model=DonorAnalytics)
async def donor_analytics(current_user: dict = Depends(require_roles(*ADMIN_ONLY))):
    total_donors = await db.donors.count_documents({})
    verified_donors = await db.donors.count_documents({"verification_status": VerificationStatus.VERIFIED.value})
    pending_donors = await db.donors.count_documents({"verification_status": VerificationStatus.PENDING.value})
    emergency_available = await db.donors.count_documents({"emergency_availability": True})
    by_blood_group = await _count_by_field(db.donors, "blood_group")

    return DonorAnalytics(
        total_donors=total_donors,
        verified_donors=verified_donors,
        pending_donors=pending_donors,
        donors_by_blood_group=by_blood_group,
        emergency_available_donors=emergency_available,
    )


@router.get("/audit-logs", response_model=list[AuditLogOut])
async def list_audit_logs(
    action: str | None = Query(default=None),
    target_type: str | None = Query(default=None),
    limit: int = Query(default=100, le=500),
    current_user: dict = Depends(require_roles(*ADMIN_ONLY)),
):
    query: dict = {}
    if action:
        query["action"] = action
    if target_type:
        query["target_type"] = target_type
    cursor = db.audit_logs.find(query).sort("created_at", -1).limit(limit)
    return [
        AuditLogOut(
            id=str(doc["_id"]),
            actor_id=str(doc["actor_id"]),
            actor_role=doc["actor_role"],
            action=doc["action"],
            target_type=doc["target_type"],
            target_id=doc["target_id"],
            details=doc["details"],
            created_at=doc["created_at"],
        )
        async for doc in cursor
    ]
