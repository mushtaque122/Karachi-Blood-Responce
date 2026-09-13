import os

from app.core.ai.dispatcher import dispatch_tool_call
from app.core.ai.prompts import SYSTEM_PROMPT
from app.core.ai.tool_specs import TOOL_SPECS
from app.core.ai.tools import ToolError

AI_MODEL = "claude-sonnet-4-6"
MAX_TOOL_ITERATIONS = 5  # hard cap — the agent cannot loop forever even if the model keeps requesting tools


class AIProviderNotConfigured(Exception):
    """Raised when ANTHROPIC_API_KEY is missing. Per this project's own
    rule about unavailable credentials: fail loudly, never fake a
    response. There is no environment with real credentials available
    in this delivery, so this path is real code but untested against a
    live model — see docs/architecture.md."""


def is_configured() -> bool:
    return bool(os.getenv("ANTHROPIC_API_KEY"))


async def run_agent(db, current_user: dict, session_id, user_message: str) -> dict:
    if not is_configured():
        raise AIProviderNotConfigured(
            "AI agent not sent: ANTHROPIC_API_KEY is not set in the environment."
        )

    # Imported lazily so the `anthropic` package is only required if this
    # feature is actually configured/used — same pattern as the SMS sender.
    import anthropic

    client = anthropic.AsyncAnthropic()
    messages: list[dict] = [{"role": "user", "content": user_message}]
    tool_calls_made: list[dict] = []

    for _ in range(MAX_TOOL_ITERATIONS):
        response = await client.messages.create(
            model=AI_MODEL,
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            tools=TOOL_SPECS,
            messages=messages,
        )

        if response.stop_reason != "tool_use":
            final_text = "".join(block.text for block in response.content if block.type == "text")
            return {"reply": final_text, "tool_calls": tool_calls_made}

        messages.append({"role": "assistant", "content": response.content})
        tool_results = []
        for block in response.content:
            if block.type != "tool_use":
                continue
            try:
                result = await dispatch_tool_call(db, current_user, session_id, block.name, block.input)
                tool_calls_made.append({"tool": block.name, "input": block.input, "success": True})
                tool_results.append({
                    "type": "tool_result", "tool_use_id": block.id, "content": str(result),
                })
            except ToolError as e:
                tool_calls_made.append({"tool": block.name, "input": block.input, "success": False, "error": str(e)})
                tool_results.append({
                    "type": "tool_result", "tool_use_id": block.id, "content": str(e), "is_error": True,
                })
        messages.append({"role": "user", "content": tool_results})

    return {
        "reply": "I wasn't able to finish that within the allowed number of steps — please contact staff directly.",
        "tool_calls": tool_calls_made,
    }
