from datetime import date, datetime, time, timezone

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.deps import require_roles
from app.core.audit import log_audit_event
from app.db.mongodb import db
from app.models.inventory_status import InventoryStatus
from app.models.org_status import OrgStatus
from app.models.role import Role
from app.schemas.blood_bank import (
    BloodBankCreate,
    BloodBankOut,
    InventoryItemCreate,
    InventoryItemOut,
    InventorySummaryItem,
)

router = APIRouter(prefix="/api/blood-banks", tags=["blood-banks"])

# NOTE (limitation, stated plainly): there is no staff-to-blood-bank
# assignment table yet, so any blood_bank_staff/admin can manage any
# bank's inventory. Real staff scoping is deferred to a later phase
# once an org-membership model exists.
INVENTORY_STAFF_ROLES = (Role.BLOOD_BANK_STAFF, Role.ADMIN, Role.SUPER_ADMIN)


def _bank_to_out(doc: dict) -> BloodBankOut:
    return BloodBankOut(
        id=str(doc["_id"]),
        name=doc["name"],
        city=doc["city"],
        address=doc["address"],
        contact_phone=doc["contact_phone"],
        status=doc["status"],
        created_at=doc["created_at"],
        updated_at=doc["updated_at"],
    )


def _to_bson_datetime(d: date) -> datetime:
    return datetime.combine(d, time.min, tzinfo=timezone.utc)


def _item_to_out(doc: dict) -> InventoryItemOut:
    return InventoryItemOut(
        id=str(doc["_id"]),
        blood_bank_id=str(doc["blood_bank_id"]),
        blood_group=doc["blood_group"],
        component_type=doc["component_type"],
        units=doc["units"],
        collection_date=doc["collection_date"].date(),
        expiry_date=doc["expiry_date"].date(),
        status=doc["status"],
    )


async def _get_bank_or_404(bank_id: str) -> dict:
    try:
        oid = ObjectId(bank_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid blood bank id")
    doc = await db.blood_banks.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Blood bank not found")
    return doc


@router.post("", response_model=BloodBankOut, status_code=status.HTTP_201_CREATED)
async def register_blood_bank(
    payload: BloodBankCreate,
    current_user: dict = Depends(require_roles(Role.BLOOD_BANK_STAFF, Role.ADMIN, Role.SUPER_ADMIN)),
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
    result = await db.blood_banks.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _bank_to_out(doc)


@router.get("", response_model=list[BloodBankOut])
async def list_blood_banks(
    city: str | None = Query(default=None),
    limit: int = Query(default=50, le=200),
):
    query: dict = {"status": OrgStatus.VERIFIED.value}
    if city:
        query["city"] = {"$regex": f"^{city}$", "$options": "i"}
    cursor = db.blood_banks.find(query).limit(limit)
    return [_bank_to_out(doc) async for doc in cursor]


@router.get("/{bank_id}", response_model=BloodBankOut)
async def get_blood_bank(bank_id: str):
    doc = await _get_bank_or_404(bank_id)
    return _bank_to_out(doc)


@router.patch("/{bank_id}/verify", response_model=BloodBankOut)
async def verify_blood_bank(
    bank_id: str,
    new_status: OrgStatus,
    current_user: dict = Depends(require_roles(Role.ADMIN, Role.SUPER_ADMIN)),
):
    doc = await _get_bank_or_404(bank_id)
    result = await db.blood_banks.find_one_and_update(
        {"_id": doc["_id"]},
        {"$set": {"status": new_status.value, "updated_at": datetime.now(timezone.utc)}},
        return_document=True,
    )
    await log_audit_event(
        db, current_user, "blood_bank.verify", "blood_bank", bank_id, {"new_status": new_status.value}
    )
    return _bank_to_out(result)


@router.post("/{bank_id}/inventory", response_model=InventoryItemOut, status_code=status.HTTP_201_CREATED)
async def add_inventory_item(
    bank_id: str,
    payload: InventoryItemCreate,
    current_user: dict = Depends(require_roles(*INVENTORY_STAFF_ROLES)),
):
    bank = await _get_bank_or_404(bank_id)
    if payload.expiry_date <= payload.collection_date:
        raise HTTPException(status_code=422, detail="expiry_date must be after collection_date")

    doc = {
        "blood_bank_id": bank["_id"],
        "blood_group": payload.blood_group.value,
        "component_type": payload.component_type,
        "units": payload.units,
        "collection_date": _to_bson_datetime(payload.collection_date),
        "expiry_date": _to_bson_datetime(payload.expiry_date),
        "status": InventoryStatus.AVAILABLE.value,
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.blood_inventory.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _item_to_out(doc)


@router.get("/{bank_id}/inventory", response_model=list[InventoryItemOut])
async def list_inventory(
    bank_id: str,
    current_user: dict = Depends(require_roles(*INVENTORY_STAFF_ROLES)),
):
    """Staff-only — full batch-level detail (exact units, collection/
    expiry dates per lot). Public consumers get /inventory/summary
    instead."""
    bank = await _get_bank_or_404(bank_id)
    cursor = db.blood_inventory.find({"blood_bank_id": bank["_id"]})
    return [_item_to_out(doc) async for doc in cursor]


@router.patch("/{bank_id}/inventory/{item_id}", response_model=InventoryItemOut)
async def update_inventory_item(
    bank_id: str,
    item_id: str,
    new_status: InventoryStatus,
    current_user: dict = Depends(require_roles(*INVENTORY_STAFF_ROLES)),
):
    bank = await _get_bank_or_404(bank_id)
    try:
        item_oid = ObjectId(item_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid inventory item id")

    result = await db.blood_inventory.find_one_and_update(
        {"_id": item_oid, "blood_bank_id": bank["_id"]},
        {"$set": {"status": new_status.value}},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Inventory item not found for this blood bank")
    await log_audit_event(
        db, current_user, "inventory.status_change", "blood_inventory", item_id, {"new_status": new_status.value}
    )
    return _item_to_out(result)


@router.get("/{bank_id}/inventory/summary", response_model=list[InventorySummaryItem])
async def inventory_summary(bank_id: str):
    """Public aggregate view — total available units per blood group.
    No batch/lot detail, no expiry dates — safe to expose without auth
    so patients/hospitals can check stock before requesting."""
    bank = await _get_bank_or_404(bank_id)
    pipeline = [
        {"$match": {"blood_bank_id": bank["_id"], "status": InventoryStatus.AVAILABLE.value}},
        {"$group": {"_id": "$blood_group", "available_units": {"$sum": "$units"}}},
    ]
    results = []
    async for row in db.blood_inventory.aggregate(pipeline):
        results.append(InventorySummaryItem(blood_group=row["_id"], available_units=row["available_units"]))
    return results
