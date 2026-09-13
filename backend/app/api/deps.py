from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from app.core.security import decode_access_token
from app.db.mongodb import db
from app.models.role import Role

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_access_token(token)
    if payload is None or "sub" not in payload:
        raise credentials_error

    user = await db.users.find_one({"email": payload["sub"]})
    if user is None:
        raise credentials_error
    if not user.get("is_active", False):
        raise HTTPException(status_code=403, detail="Account is disabled")

    # Role is always re-read from the DB record, never trusted solely
    # from the token payload, so a role change takes effect immediately.
    return user


def require_roles(*allowed_roles: Role):
    """FastAPI dependency factory: restrict an endpoint to specific roles.
    Server-side only — never derived from client-supplied data."""

    async def checker(current_user: dict = Depends(get_current_user)) -> dict:
        if current_user["role"] not in [r.value for r in allowed_roles]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action",
            )
        return current_user

    return checker
