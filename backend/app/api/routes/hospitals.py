from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.deps import get_current_user, require_roles
from app.core.audit import log_audit_event
from app.db.mongodb import db
from app.models.org_status import OrgStatus
from app.models.role import Role
from app.schemas.hospital import HospitalCreate, HospitalOut

router = APIRouter(prefix="/api/hospitals", tags=["hospitals"])


def _to_out(doc: dict) -> HospitalOut:
    return HospitalOut(
        id=str(doc["_id"]),
        name=doc["name"],
        city=doc["city"],
        address=doc["address"],
        contact_phone=doc["contact_phone"],
        status=doc["status"],
        created_at=doc["created_at"],
        updated_at=doc["updated_at"],
    )


@router.post("", response_model=HospitalOut, status_code=status.HTTP_201_CREATED)
async def register_hospital(
    payload: HospitalCreate,
    current_user: dict = Depends(require_roles(Role.HOSPITAL_STAFF, Role.ADMIN, Role.SUPER_ADMIN)),
):
    now = datetime.now(timezone.utc)
    doc = {
        "name": payload.name,
        "city": payload.city,
        "address": payload.address,
        "contact_phone": payload.contact_phone,
        "status": OrgStatus.PENDING.value,
        "created_by": current_user["_id"],
        "created_at": now,
        "updated_at": now,
    }
    result = await db.hospitals.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _to_out(doc)


@router.get("", response_model=list[HospitalOut])
async def list_hospitals(
    city: str | None = Query(default=None),
    limit: int = Query(default=50, le=200),
):
    """Public endpoint — verified hospitals only. Institutional data
    (name, city, address, phone) is not personal/donor data, so no
    auth is required to browse it, unlike donor search."""
    query: dict = {"status": OrgStatus.VERIFIED.value}
    if city:
        query["city"] = {"$regex": f"^{city}$", "$options": "i"}
    cursor = db.hospitals.find(query).limit(limit)
    return [_to_out(doc) async for doc in cursor]


@router.get("/{hospital_id}", response_model=HospitalOut)
async def get_hospital(hospital_id: str):
    try:
        oid = ObjectId(hospital_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid hospital id")
    doc = await db.hospitals.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Hospital not found")
    return _to_out(doc)


@router.patch("/{hospital_id}/verify", response_model=HospitalOut)
async def verify_hospital(
    hospital_id: str,
    new_status: OrgStatus,
    current_user: dict = Depends(require_roles(Role.ADMIN, Role.SUPER_ADMIN)),
):
    try:
        oid = ObjectId(hospital_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid hospital id")
    result = await db.hospitals.find_one_and_update(
        {"_id": oid},
        {"$set": {"status": new_status.value, "updated_at": datetime.now(timezone.utc)}},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Hospital not found")
    await log_audit_event(
        db, current_user, "hospital.verify", "hospital", hospital_id, {"new_status": new_status.value}
    )
    return _to_out(result)
