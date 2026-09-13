from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings

client = AsyncIOMotorClient(settings.mongodb_uri)
db = client[settings.mongodb_db_name]


async def ensure_indexes() -> None:
    """Create required indexes. Call once on app startup."""
    await db.users.create_index("email", unique=True)
    await db.donors.create_index("user_id", unique=True)
    await db.donors.create_index("blood_group")
    await db.donors.create_index("city")
    await db.donors.create_index(
        [("availability", 1), ("verification_status", 1), ("blood_group", 1)]
    )
    await db.blood_requests.create_index("requester_id")
    await db.blood_requests.create_index("status")
    await db.blood_requests.create_index([("blood_group", 1), ("status", 1)])
    await db.donor_responses.create_index("request_id")
    await db.donor_responses.create_index([("request_id", 1), ("score", -1)])
    await db.hospitals.create_index("status")
    await db.hospitals.create_index("city")
    await db.blood_banks.create_index("status")
    await db.blood_banks.create_index("city")
    await db.blood_inventory.create_index("blood_bank_id")
    await db.blood_inventory.create_index([("blood_bank_id", 1), ("status", 1), ("blood_group", 1)])
    await db.notifications.create_index([("user_id", 1), ("created_at", -1)])
    await db.notifications.create_index([("user_id", 1), ("read", 1)])
    await db.ai_sessions.create_index([("user_id", 1), ("created_at", -1)])
    await db.ai_tool_calls.create_index([("session_id", 1), ("created_at", 1)])
    await db.ai_tool_calls.create_index("tool_name")
    await db.audit_logs.create_index([("created_at", -1)])
    await db.audit_logs.create_index("action")
    await db.audit_logs.create_index([("target_type", 1), ("target_id", 1)])
