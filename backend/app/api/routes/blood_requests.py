from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.deps import get_current_user, require_roles
from app.core.audit import log_audit_event
from app.core.compatibility import compatible_donor_groups
from app.core.geo import estimate_eta_minutes, haversine_distance_km
from app.core.matching import score_donor_candidate
from app.core.notifications.service import create_in_app_notification
from app.db.mongodb import db
from app.models.blood_group import BloodGroup
from app.models.donor_status import VerificationStatus
from app.models.notification import NotificationPriority
from app.models.request_status import RequestStatus, can_transition
from app.models.role import Role
from app.models.urgency import Urgency
from app.schemas.blood_request import BloodRequestCreate, BloodRequestOut, DonorMatchOut

router = APIRouter(prefix="/api/requests", tags=["blood-requests"])

REQUEST_CREATE_ROLES = (Role.PATIENT_REQUESTER, Role.HOSPITAL_STAFF, Role.DOCTOR)
REQUEST_STAFF_ROLES = (
    Role.ADMIN,
    Role.SUPER_ADMIN,
    Role.HOSPITAL_STAFF,
    Role.BLOOD_BANK_STAFF,
    Role.EMERGENCY_COORDINATOR,
)


def _to_out(doc: dict) -> BloodRequestOut:
    return BloodRequestOut(
        id=str(doc["_id"]),
        requester_id=str(doc["requester_id"]),
        blood_group=doc["blood_group"],
        units_required=doc["units_required"],
        urgency=doc["urgency"],
        hospital_name=doc["hospital_name"],
        patient_reference=doc.get("patient_reference"),
        required_by=doc.get("required_by"),
        contact_phone=doc["contact_phone"],
        city=doc["city"],
        latitude=doc.get("latitude"),
        longitude=doc.get("longitude"),
        medical_notes=doc.get("medical_notes"),
        status=doc["status"],
        created_at=doc["created_at"],
        updated_at=doc["updated_at"],
        fulfilled_at=doc.get("fulfilled_at"),
    )


async def _get_request_or_404(request_id: str) -> dict:
    try:
        oid = ObjectId(request_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid request id")
    doc = await db.blood_requests.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Blood request not found")
    return doc


async def _apply_transition(doc: dict, target: RequestStatus) -> dict:
    current = RequestStatus(doc["status"])
    if not can_transition(current, target):
        raise HTTPException(
            status_code=409,
            detail=f"Cannot move request from '{current.value}' to '{target.value}'",
        )
    updated = await db.blood_requests.find_one_and_update(
        {"_id": doc["_id"]},
        {"$set": {"status": target.value, "updated_at": datetime.now(timezone.utc)}},
        return_document=True,
    )
    return updated


def _assert_owner_or_staff(doc: dict, current_user: dict) -> None:
    is_owner = doc["requester_id"] == current_user["_id"]
    is_staff = current_user["role"] in [r.value for r in REQUEST_STAFF_ROLES] or current_user[
        "role"
    ] in (Role.ADMIN.value, Role.SUPER_ADMIN.value)
    if not (is_owner or is_staff):
        raise HTTPException(status_code=403, detail="Not authorized to view this request")


@router.post("", response_model=BloodRequestOut, status_code=status.HTTP_201_CREATED)
async def create_request(
    payload: BloodRequestCreate,
    current_user: dict = Depends(require_roles(*REQUEST_CREATE_ROLES)),
):
    now = datetime.now(timezone.utc)
    doc = {
        "requester_id": current_user["_id"],
        "blood_group": payload.blood_group.value,
        "units_required": payload.units_required,
        "urgency": payload.urgency.value,
        "hospital_name": payload.hospital_name,
        "patient_reference": payload.patient_reference,
        "required_by": payload.required_by,
        "contact_phone": payload.contact_phone,
        "city": payload.city,
        "latitude": payload.latitude,
        "longitude": payload.longitude,
        "medical_notes": payload.medical_notes,
        "status": RequestStatus.DRAFT.value,
        "created_at": now,
        "updated_at": now,
    }
    result = await db.blood_requests.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _to_out(doc)


@router.get("/me", response_model=list[BloodRequestOut])
async def list_my_requests(current_user: dict = Depends(get_current_user)):
    cursor = db.blood_requests.find({"requester_id": current_user["_id"]})
    return [_to_out(doc) async for doc in cursor]


@router.get("", response_model=list[BloodRequestOut])
async def list_requests_staff(
    req_status: RequestStatus | None = Query(default=None, alias="status"),
    blood_group: BloodGroup | None = Query(default=None),
    urgency: Urgency | None = Query(default=None),
    limit: int = Query(default=50, le=200),
    current_user: dict = Depends(require_roles(*REQUEST_STAFF_ROLES)),
):
    query: dict = {}
    if req_status:
        query["status"] = req_status.value
    if blood_group:
        query["blood_group"] = blood_group.value
    if urgency:
        query["urgency"] = urgency.value
    cursor = db.blood_requests.find(query).limit(limit)
    return [_to_out(doc) async for doc in cursor]


@router.get("/{request_id}", response_model=BloodRequestOut)
async def get_request(request_id: str, current_user: dict = Depends(get_current_user)):
    doc = await _get_request_or_404(request_id)
    _assert_owner_or_staff(doc, current_user)
    return _to_out(doc)


@router.patch("/{request_id}/submit", response_model=BloodRequestOut)
async def submit_request(request_id: str, current_user: dict = Depends(get_current_user)):
    doc = await _get_request_or_404(request_id)
    if doc["requester_id"] != current_user["_id"]:
        raise HTTPException(status_code=403, detail="Only the requester can submit this request")
    updated = await _apply_transition(doc, RequestStatus.PENDING_VERIFICATION)
    return _to_out(updated)


@router.patch("/{request_id}/verify", response_model=BloodRequestOut)
async def verify_request(
    request_id: str,
    current_user: dict = Depends(require_roles(*REQUEST_STAFF_ROLES)),
):
    doc = await _get_request_or_404(request_id)
    updated = await _apply_transition(doc, RequestStatus.VERIFIED)
    await log_audit_event(db, current_user, "request.verify", "blood_request", request_id)
    return _to_out(updated)


@router.patch("/{request_id}/cancel", response_model=BloodRequestOut)
async def cancel_request(request_id: str, current_user: dict = Depends(get_current_user)):
    doc = await _get_request_or_404(request_id)
    _assert_owner_or_staff(doc, current_user)
    updated = await _apply_transition(doc, RequestStatus.CANCELLED)
    await log_audit_event(db, current_user, "request.cancel", "blood_request", request_id)
    return _to_out(updated)


@router.patch("/{request_id}/start", response_model=BloodRequestOut)
async def start_fulfillment(
    request_id: str,
    current_user: dict = Depends(require_roles(*REQUEST_STAFF_ROLES)),
):
    doc = await _get_request_or_404(request_id)
    updated = await _apply_transition(doc, RequestStatus.IN_PROGRESS)
    await log_audit_event(db, current_user, "request.start_fulfillment", "blood_request", request_id)
    return _to_out(updated)


@router.patch("/{request_id}/fulfill", response_model=BloodRequestOut)
async def fulfill_request(
    request_id: str,
    current_user: dict = Depends(require_roles(*REQUEST_STAFF_ROLES)),
):
    doc = await _get_request_or_404(request_id)
    updated = await _apply_transition(doc, RequestStatus.FULFILLED)
    # Recorded separately from updated_at (which changes on every
    # transition) so fulfillment-time analytics are accurate rather
    # than an approximation.
    updated = await db.blood_requests.find_one_and_update(
        {"_id": doc["_id"]},
        {"$set": {"fulfilled_at": datetime.now(timezone.utc)}},
        return_document=True,
    )
    await log_audit_event(db, current_user, "request.fulfill", "blood_request", request_id)
    return _to_out(updated)


@router.post("/{request_id}/match", response_model=list[DonorMatchOut])
async def run_matching(
    request_id: str,
    current_user: dict = Depends(require_roles(*REQUEST_STAFF_ROLES)),
):
    """Matching Engine (Phase 7): compatibility -> eligibility/availability
    filter -> deterministic scoring. No AI involvement anywhere in this
    path — see app/core/compatibility.py and app/core/matching.py."""
    doc = await _get_request_or_404(request_id)
    current_status = RequestStatus(doc["status"])
    if current_status not in (RequestStatus.VERIFIED, RequestStatus.MATCHING, RequestStatus.DONORS_FOUND):
        raise HTTPException(
            status_code=409,
            detail="Request must be verified before matching can run",
        )

    eligible_groups = [g.value for g in compatible_donor_groups(BloodGroup(doc["blood_group"]))]
    candidates_cursor = db.donors.find({
        "blood_group": {"$in": eligible_groups},
        "availability": True,
        "verification_status": VerificationStatus.VERIFIED.value,
    })

    from app.core.rules import compute_eligibility  # local import avoids a circular import at module load

    req_lat, req_lng = doc.get("latitude"), doc.get("longitude")
    scored: list[dict] = []
    notify_targets: list[tuple] = []  # (user_id, donor snapshot) for post-match notifications
    async for donor in candidates_cursor:
        if not compute_eligibility(donor.get("last_donation_date")):
            continue

        distance_km = None
        eta_minutes = None
        if req_lat is not None and req_lng is not None and donor.get("latitude") is not None and donor.get("longitude") is not None:
            distance_km = haversine_distance_km(req_lat, req_lng, donor["latitude"], donor["longitude"])
            eta_minutes = estimate_eta_minutes(distance_km)

        score = score_donor_candidate(donor, doc["city"], Urgency(doc["urgency"]), distance_km=distance_km)
        scored.append({
            "request_id": doc["_id"],
            "donor_id": donor["_id"],
            "blood_group": donor["blood_group"],
            "city": donor["city"],
            "emergency_availability": donor["emergency_availability"],
            "distance_km": round(distance_km, 1) if distance_km is not None else None,
            "eta_minutes": eta_minutes,
            "score": score,
            "status": "matched",
            "created_at": datetime.now(timezone.utc),
        })
        notify_targets.append((donor["user_id"], donor["blood_group"], score))
    scored.sort(key=lambda d: d["score"], reverse=True)

    # Replace any previous match set for this request with the fresh run.
    await db.donor_responses.delete_many({"request_id": doc["_id"]})
    if scored:
        await db.donor_responses.insert_many(scored)

    # Real notification delivery (Phase 9): every matched donor gets an
    # actual in-app notification — not just a DB record for staff to see.
    urgency = Urgency(doc["urgency"])
    priority = {
        Urgency.CRITICAL: NotificationPriority.EMERGENCY,
        Urgency.URGENT: NotificationPriority.HIGH,
        Urgency.NORMAL: NotificationPriority.NORMAL,
    }[urgency]
    for user_id, blood_group, _score in notify_targets:
        await create_in_app_notification(
            db,
            user_id=user_id,
            title=f"Blood needed: {doc['blood_group']} at {doc['hospital_name']}",
            body=(
                f"A {urgency.value} request for {doc['units_required']} unit(s) of "
                f"{doc['blood_group']} blood is open at {doc['hospital_name']}, {doc['city']}. "
                f"Your {blood_group} donation is compatible. Please respond if you're available."
            ),
            priority=priority,
        )

    target_status = RequestStatus.DONORS_FOUND if scored else RequestStatus.MATCHING
    if current_status != target_status:
        await _apply_transition(doc, target_status)

    return [
        DonorMatchOut(
            donor_id=str(d["donor_id"]),
            blood_group=d["blood_group"],
            city=d["city"],
            emergency_availability=d["emergency_availability"],
            distance_km=d.get("distance_km"),
            eta_minutes=d.get("eta_minutes"),
            score=d["score"],
            status=d["status"],
        )
        for d in scored
    ]


@router.get("/{request_id}/matches", response_model=list[DonorMatchOut])
async def get_matches(
    request_id: str,
    current_user: dict = Depends(get_current_user),
):
    doc = await _get_request_or_404(request_id)
    _assert_owner_or_staff(doc, current_user)
    cursor = db.donor_responses.find({"request_id": doc["_id"]}).sort("score", -1)
    return [
        DonorMatchOut(
            donor_id=str(d["donor_id"]),
            blood_group=d["blood_group"],
            city=d["city"],
            emergency_availability=d["emergency_availability"],
            distance_km=d.get("distance_km"),
            eta_minutes=d.get("eta_minutes"),
            score=d["score"],
            status=d["status"],
        )
        async for d in cursor
    ]
