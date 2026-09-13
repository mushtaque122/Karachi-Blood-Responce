from datetime import datetime, timezone


async def log_audit_event(
    db, actor: dict, action: str, target_type: str, target_id: str, details: dict | None = None
) -> None:
    """Real audit trail for staff/admin actions — separate from the AI
    agent's ai_tool_calls log, which only covers AI-initiated actions.
    This covers the human side: verifications, status changes, and
    other state-mutating staff actions across every module."""
    await db.audit_logs.insert_one({
        "actor_id": actor["_id"],
        "actor_role": actor["role"],
        "action": action,
        "target_type": target_type,
        "target_id": target_id,
        "details": details or {},
        "created_at": datetime.now(timezone.utc),
    })
