from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.deps import get_current_user, require_roles
from app.core.audit import log_audit_event
from app.core.geo import haversine_distance_km
from app.core.rules import compute_eligibility
from app.db.mongodb import db
from app.models.blood_group import BloodGroup
from app.models.donor_status import VerificationStatus
from app.models.role import Role
from app.schemas.donor import (
    DonorProfileCreate,
    DonorProfileOut,
    DonorProfileUpdate,
    DonorPublicOut,
)

router = APIRouter(prefix="/api/donors", tags=["donors"])

STAFF_SEARCH_ROLES = (
    Role.ADMIN,
    Role.SUPER_ADMIN,
    Role.HOSPITAL_STAFF,
    Role.BLOOD_BANK_STAFF,
    Role.DOCTOR,
    Role.EMERGENCY_COORDINATOR,
)


def _to_full_out(doc: dict) -> DonorProfileOut:
    return DonorProfileOut(
        id=str(doc["_id"]),
        user_id=str(doc["user_id"]),
        blood_group=doc["blood_group"],
        city=doc["city"],
        phone=doc["phone"],
        latitude=doc.get("latitude"),
        longitude=doc.get("longitude"),
        availability=doc["availability"],
        emergency_availability=doc["emergency_availability"],
        last_donation_date=doc.get("last_donation_date"),
        is_eligible=compute_eligibility(doc.get("last_donation_date")),
        verification_status=doc["verification_status"],
        preferred_hospitals=doc.get("preferred_hospitals", []),
        preferred_blood_banks=doc.get("preferred_blood_banks", []),
    )


def _to_public_out(doc: dict, distance_km: float | None = None) -> DonorPublicOut:
    return DonorPublicOut(
        id=str(doc["_id"]),
        blood_group=doc["blood_group"],
        city=doc["city"],
        availability=doc["availability"],
        emergency_availability=doc["emergency_availability"],
        is_eligible=compute_eligibility(doc.get("last_donation_date")),
        verification_status=doc["verification_status"],
        distance_km=round(distance_km, 1) if distance_km is not None else None,
    )


@router.post("/me", response_model=DonorProfileOut, status_code=status.HTTP_201_CREATED)
async def create_my_donor_profile(
    payload: DonorProfileCreate,
    current_user: dict = Depends(require_roles(Role.DONOR)),
):
    existing = await db.donors.find_one({"user_id": current_user["_id"]})
    if existing:
        raise HTTPException(status_code=409, detail="Donor profile already exists")

    now = datetime.now(timezone.utc)
    doc = {
        "user_id": current_user["_id"],
        "blood_group": payload.blood_group.value,
        "city": payload.city,
        "phone": payload.phone,
        "latitude": payload.latitude,
        "longitude": payload.longitude,
        "availability": True,
        "emergency_availability": payload.emergency_availability,
        "last_donation_date": payload.last_donation_date,
        "verification_status": VerificationStatus.PENDING.value,
        "preferred_hospitals": payload.preferred_hospitals,
        "preferred_blood_banks": payload.preferred_blood_banks,
        "created_at": now,
        "updated_at": now,
    }
    result = await db.donors.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _to_full_out(doc)


@router.get("/me", response_model=DonorProfileOut)
async def get_my_donor_profile(current_user: dict = Depends(require_roles(Role.DONOR))):
    doc = await db.donors.find_one({"user_id": current_user["_id"]})
    if not doc:
        raise HTTPException(status_code=404, detail="No donor profile yet — create one first")
    return _to_full_out(doc)


@router.patch("/me", response_model=DonorProfileOut)
async def update_my_donor_profile(
    payload: DonorProfileUpdate,
    current_user: dict = Depends(require_roles(Role.DONOR)),
):
    updates = {k: v for k, v in payload.model_dump(exclude_unset=True).items()}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields provided to update")
    updates["updated_at"] = datetime.now(timezone.utc)

    result = await db.donors.find_one_and_update(
        {"user_id": current_user["_id"]},
        {"$set": updates},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=404, detail="No donor profile yet — create one first")
    return _to_full_out(result)


@router.get("/search", response_model=list[DonorPublicOut])
async def search_donors(
    blood_group: BloodGroup | None = Query(default=None),
    city: str | None = Query(default=None),
    emergency_only: bool = Query(default=False),
    near_lat: float | None = Query(default=None, ge=-90, le=90),
    near_lng: float | None = Query(default=None, ge=-180, le=180),
    max_distance_km: float | None = Query(default=None, gt=0),
    limit: int = Query(default=25, le=100),
    current_user: dict = Depends(require_roles(*STAFF_SEARCH_ROLES)),
):
    """Privacy-safe donor search for authorized staff only. Never
    returns phone numbers or exact coordinates — see DonorPublicOut.
    If near_lat/near_lng are supplied, results include a real
    haversine distance and are sorted nearest-first (Phase 8: Location
    & Maps). Without them, falls back to city-string filtering only."""
    query: dict = {"availability": True, "verification_status": VerificationStatus.VERIFIED.value}
    if blood_group:
        query["blood_group"] = blood_group.value
    if city:
        query["city"] = {"$regex": f"^{city}$", "$options": "i"}
    if emergency_only:
        query["emergency_availability"] = True

    cursor = db.donors.find(query).limit(limit if near_lat is None else limit * 4)
    donors = [doc async for doc in cursor]

    if near_lat is None or near_lng is None:
        return [_to_public_out(doc) for doc in donors[:limit]]

    scored = []
    for doc in donors:
        if doc.get("latitude") is None or doc.get("longitude") is None:
            continue  # no coordinates on file yet — can't compute distance
        dist = haversine_distance_km(near_lat, near_lng, doc["latitude"], doc["longitude"])
        if max_distance_km is not None and dist > max_distance_km:
            continue
        scored.append((dist, doc))
    scored.sort(key=lambda pair: pair[0])
    return [_to_public_out(doc, distance_km=dist) for dist, doc in scored[:limit]]


@router.patch("/{donor_id}/verify", response_model=DonorProfileOut)
async def verify_donor(
    donor_id: str,
    new_status: VerificationStatus,
    current_user: dict = Depends(
        require_roles(Role.ADMIN, Role.SUPER_ADMIN, Role.HOSPITAL_STAFF, Role.BLOOD_BANK_STAFF)
    ),
):
    try:
        oid = ObjectId(donor_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid donor id")

    result = await db.donors.find_one_and_update(
        {"_id": oid},
        {"$set": {"verification_status": new_status.value, "updated_at": datetime.now(timezone.utc)}},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Donor profile not found")
    await log_audit_event(
        db, current_user, "donor.verify", "donor", donor_id, {"new_status": new_status.value}
    )
    return _to_full_out(result)
