from datetime import datetime, timezone

from app.core.ai.tools import TOOL_REGISTRY, ToolError


async def dispatch_tool_call(db, current_user: dict, session_id, tool_name: str, tool_input: dict) -> dict:
    """Every tool call — allowed or blocked — is logged to ai_tool_calls.
    This function, not the system prompt, is what actually prevents the
    AI from calling anything outside the allowlist or bypassing
    permission checks: it's a hard dispatch table, not a suggestion."""
    log_doc = {
        "session_id": session_id,
        "user_id": current_user["_id"],
        "tool_name": tool_name,
        "input": tool_input,
        "created_at": datetime.now(timezone.utc),
    }

    fn = TOOL_REGISTRY.get(tool_name)
    if fn is None:
        log_doc["success"] = False
        log_doc["error"] = "Tool not in allowlist — call blocked"
        await db.ai_tool_calls.insert_one(log_doc)
        raise ToolError(f"Tool '{tool_name}' is not available")

    try:
        result = await fn(db, current_user, **tool_input)
        log_doc["success"] = True
        log_doc["error"] = None
        await db.ai_tool_calls.insert_one(log_doc)
        return result
    except ToolError as e:
        log_doc["success"] = False
        log_doc["error"] = str(e)
        await db.ai_tool_calls.insert_one(log_doc)
        raise
    except Exception as e:
        log_doc["success"] = False
        log_doc["error"] = f"Unexpected error: {e}"
        await db.ai_tool_calls.insert_one(log_doc)
        raise ToolError("The tool failed unexpectedly — please try again or contact support")
