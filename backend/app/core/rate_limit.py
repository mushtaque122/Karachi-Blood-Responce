import time
from collections import defaultdict

from fastapi import HTTPException, Request, status

# In-memory, per-process sliding window. This is real and works
# correctly for a single instance — but it does NOT work across
# multiple server processes/replicas, since each would have its own
# independent counters. A real production deployment needs a shared
# store (Redis) for this to be effective. Stated here, not hidden.
_attempts: dict[str, list[float]] = defaultdict(list)


def _client_key(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def rate_limiter(max_requests: int, window_seconds: int):
    """Returns a FastAPI dependency enforcing max_requests per
    window_seconds per client IP for the endpoint it's attached to."""

    async def check(request: Request) -> None:
        key = f"{_client_key(request)}:{request.url.path}"
        now = time.monotonic()
        window_start = now - window_seconds

        attempts = _attempts[key]
        attempts[:] = [t for t in attempts if t > window_start]

        if len(attempts) >= max_requests:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Too many requests — limit is {max_requests} per {window_seconds}s. Try again shortly.",
            )
        attempts.append(now)

    return check


def _reset_for_tests() -> None:
    """Test-only helper — clears all counters between test scenarios
    that intentionally exercise the limiter."""
    _attempts.clear()
