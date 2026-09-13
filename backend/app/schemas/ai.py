from datetime import datetime

from pydantic import BaseModel, Field


class AIChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)


class AIToolCallOut(BaseModel):
    tool: str
    success: bool
    error: str | None = None


class AIChatResponse(BaseModel):
    session_id: str
    reply: str
    tool_calls: list[AIToolCallOut]
    created_at: datetime
