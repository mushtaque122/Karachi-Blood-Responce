from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import get_current_user
from app.core.ai.agent import AIProviderNotConfigured, run_agent
from app.db.mongodb import db
from app.schemas.ai import AIChatRequest, AIChatResponse, AIToolCallOut

router = APIRouter(prefix="/api/ai", tags=["ai-agent"])


@router.post("/chat", response_model=AIChatResponse)
async def chat(payload: AIChatRequest, current_user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    session_doc = {
        "user_id": current_user["_id"],
        "message": payload.message,
        "reply": None,
        "tool_calls": [],
        "status": "pending",
        "created_at": now,
    }
    result = await db.ai_sessions.insert_one(session_doc)
    session_id = result.inserted_id

    try:
        outcome = await run_agent(db, current_user, session_id, payload.message)
    except AIProviderNotConfigured as e:
        await db.ai_sessions.update_one(
            {"_id": session_id}, {"$set": {"status": "failed", "reply": str(e)}}
        )
        raise HTTPException(status_code=503, detail=str(e))

    await db.ai_sessions.update_one(
        {"_id": session_id},
        {"$set": {"status": "completed", "reply": outcome["reply"], "tool_calls": outcome["tool_calls"]}},
    )

    return AIChatResponse(
        session_id=str(session_id),
        reply=outcome["reply"],
        tool_calls=[
            AIToolCallOut(tool=t["tool"], success=t["success"], error=t.get("error"))
            for t in outcome["tool_calls"]
        ],
        created_at=now,
    )
