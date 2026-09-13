from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId

from app.core.compatibility import compatible_donor_groups
from app.core.geo import estimate_eta_minutes, haversine_distance_km
from app.core.rules import compute_eligibility
from app.models.blood_group import BloodGroup
from app.models.donor_status import VerificationStatus
from app.models.inventory_status import InventoryStatus
from app.models.request_status import RequestStatus
from app.models.role import Role

STAFF_ROLES = {
    Role.ADMIN.value, Role.SUPER_ADMIN.value, Role.HOSPITAL_STAFF.value,
    Role.BLOOD_BANK_STAFF.value, Role.DOCTOR.value, Role.EMERGENCY_COORDINATOR.value,
}

# A tiny, real static knowledge base — not a placeholder. A production
# system would replace this with a proper RAG index over real docs;
# this is intentionally small and honestly scoped.
_FAQ = {
    "how do i donate blood": (
        "Register as a donor, create your donor profile with your blood "
        "group and city, and wait for staff to verify your profile. Once "
        "verified, you'll be notified when a compatible request needs you."
    ),
    "how often can i donate": (
        "The system requires at least 90 days between donations before "
        "you're marked eligible again — this is a fixed rule, not "
        "something the assistant decides case by case."
    ),
    "how does matching work": (
        "When a blood request is verified, the system checks blood-group "
        "compatibility, donor eligibility, availability, verification "
        "status, and (if coordinates are on file) real distance, then "
        "notifies compatible donors in-app."
    ),
}


class ToolError(Exception):
    """Raised by a tool when the request can't be fulfilled — the agent
    surfaces this to the user rather than fabricating an answer."""


def _oid(id_str: str, what: str) -> ObjectId:
    try:
        return ObjectId(id_str)
    except InvalidId:
        raise ToolError(f"'{id_str}' is not a valid {what} id")


async def get_blood_request(db, current_user: dict, request_id: str) -> dict:
    doc = await db.blood_requests.find_one({"_id": _oid(request_id, "request")})
    if not doc:
        raise ToolError("No blood request found with that id")
    is_owner = doc["requester_id"] == current_user["_id"]
    is_staff = current_user["role"] in STAFF_ROLES
    if not (is_owner or is_staff):
        raise ToolError("You don't have permission to view this request")
    return {
        "id": str(doc["_id"]),
        "blood_group": doc["blood_group"],
        "units_required": doc["units_required"],
        "urgency": doc["urgency"],
        "status": doc["status"],
        "hospital_name": doc["hospital_name"],
        "city": doc["city"],
    }


async def get_compatible_donors(db, current_user: dict, blood_group: str) -> dict:
    """Pure rule lookup — no AI involved in the compatibility table itself."""
    try:
        bg = BloodGroup(blood_group)
    except ValueError:
        raise ToolError(f"'{blood_group}' is not a recognized blood group")
    return {"recipient_blood_group": bg.value, "compatible_donor_groups": [g.value for g in compatible_donor_groups(bg)]}


async def get_nearby_donors(
    db, current_user: dict, blood_group: str, latitude: float, longitude: float, max_distance_km: float = 15.0
) -> dict:
    if current_user["role"] not in STAFF_ROLES:
        raise ToolError("Only staff roles can search for donors")
    try:
        bg = BloodGroup(blood_group)
    except ValueError:
        raise ToolError(f"'{blood_group}' is not a recognized blood group")

    cursor = db.donors.find({
        "blood_group": bg.value, "availability": True,
        "verification_status": VerificationStatus.VERIFIED.value,
    })
    results = []
    async for donor in cursor:
        if donor.get("latitude") is None or donor.get("longitude") is None:
            continue
        if not compute_eligibility(donor.get("last_donation_date")):
            continue
        dist = haversine_distance_km(latitude, longitude, donor["latitude"], donor["longitude"])
        if dist > max_distance_km:
            continue
        results.append({
            "donor_id": str(donor["_id"]),
            "blood_group": donor["blood_group"],
            "distance_km": round(dist, 1),
            "eta_minutes": estimate_eta_minutes(dist),
        })
    results.sort(key=lambda r: r["distance_km"])
    return {"count": len(results), "donors": results}


async def get_blood_bank_inventory(db, current_user: dict, blood_bank_id: str) -> dict:
    bank = await db.blood_banks.find_one({"_id": _oid(blood_bank_id, "blood bank")})
    if not bank:
        raise ToolError("No blood bank found with that id")
    pipeline = [
        {"$match": {"blood_bank_id": bank["_id"], "status": InventoryStatus.AVAILABLE.value}},
        {"$group": {"_id": "$blood_group", "available_units": {"$sum": "$units"}}},
    ]
    summary = {row["_id"]: row["available_units"] async for row in db.blood_inventory.aggregate(pipeline)}
    return {"blood_bank": bank["name"], "available_units_by_group": summary}


async def get_emergency_status(db, current_user: dict, request_id: str) -> dict:
    req = await get_blood_request(db, current_user, request_id)  # reuses the same permission check
    match_count = await db.donor_responses.count_documents({"request_id": _oid(request_id, "request")})
    return {**req, "donors_matched": match_count}


async def create_draft_blood_request(
    db, current_user: dict, blood_group: str, units_required: int,
    hospital_name: str, city: str, contact_phone: str, urgency: str = "normal",
) -> dict:
    """Creates a DRAFT only — per the system prompt's hard rule, the AI
    agent never submits, verifies, or matches a request on its own. A
    human must take every subsequent step explicitly."""
    if current_user["role"] not in {Role.PATIENT_REQUESTER.value, Role.HOSPITAL_STAFF.value, Role.DOCTOR.value}:
        raise ToolError("Your account role cannot create blood requests")
    try:
        bg = BloodGroup(blood_group)
    except ValueError:
        raise ToolError(f"'{blood_group}' is not a recognized blood group")
    if units_required <= 0 or units_required > 20:
        raise ToolError("units_required must be between 1 and 20")

    now = datetime.now(timezone.utc)
    doc = {
        "requester_id": current_user["_id"],
        "blood_group": bg.value,
        "units_required": units_required,
        "urgency": urgency,
        "hospital_name": hospital_name,
        "patient_reference": None,
        "required_by": None,
        "contact_phone": contact_phone,
        "city": city,
        "latitude": None,
        "longitude": None,
        "medical_notes": None,
        "status": RequestStatus.DRAFT.value,
        "created_at": now,
        "updated_at": now,
    }
    result = await db.blood_requests.insert_one(doc)
    return {
        "id": str(result.inserted_id),
        "status": "draft",
        "note": "Draft created. You must review and submit it yourself — the assistant does not submit requests automatically.",
    }


async def search_system_knowledge(db, current_user: dict, query: str) -> dict:
    q = query.strip().lower()
    for key, answer in _FAQ.items():
        if key in q or q in key:
            return {"found": True, "answer": answer}
    return {"found": False, "answer": "No matching FAQ entry — suggest the user contact support staff."}


# The allowlist. The agent orchestrator only ever dispatches calls whose
# name appears here — nothing else, regardless of what the model asks
# for. This is the actual guardrail enforcement point, not the prompt.
TOOL_REGISTRY = {
    "get_blood_request": get_blood_request,
    "get_compatible_donors": get_compatible_donors,
    "get_nearby_donors": get_nearby_donors,
    "get_blood_bank_inventory": get_blood_bank_inventory,
    "get_emergency_status": get_emergency_status,
    "create_draft_blood_request": create_draft_blood_request,
    "search_system_knowledge": search_system_knowledge,
}
