from datetime import datetime, timedelta, timezone
from typing import Any

import pyotp
from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Account lockout (Phase 17: "account lockout/risk controls").
MAX_FAILED_LOGIN_ATTEMPTS = 5
LOCKOUT_DURATION_MINUTES = 15


def hash_password(plain_password: str) -> str:
    return pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(subject: str, role: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.access_token_expire_minutes
    )
    to_encode: dict[str, Any] = {"sub": subject, "role": role, "exp": expire}
    return jwt.encode(to_encode, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict[str, Any] | None:
    try:
        return jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    except JWTError:
        return None


def generate_mfa_secret() -> str:
    return pyotp.random_base32()


def get_mfa_provisioning_uri(secret: str, email: str) -> str:
    return pyotp.TOTP(secret).provisioning_uri(name=email, issuer_name="Karachi Blood Response System")


def verify_mfa_code(secret: str, code: str) -> bool:
    """Real TOTP verification (RFC 6238) — genuinely testable locally,
    unlike SMS/email which need a live provider account."""
    return pyotp.TOTP(secret).verify(code, valid_window=1)


def is_account_locked(user: dict) -> bool:
    locked_until = user.get("locked_until")
    if not locked_until:
        return False
    if locked_until.tzinfo is None:
        locked_until = locked_until.replace(tzinfo=timezone.utc)
    return locked_until > datetime.now(timezone.utc)


def lockout_expiry() -> datetime:
    return datetime.now(timezone.utc) + timedelta(minutes=LOCKOUT_DURATION_MINUTES)
