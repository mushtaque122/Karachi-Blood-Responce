from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from app.api.deps import get_current_user
from app.core.rate_limit import rate_limiter
from app.core.security import (
    MAX_FAILED_LOGIN_ATTEMPTS,
    create_access_token,
    generate_mfa_secret,
    get_mfa_provisioning_uri,
    hash_password,
    is_account_locked,
    lockout_expiry,
    verify_mfa_code,
    verify_password,
)
from app.db.mongodb import db
from app.schemas.user import MFASetupOut, MFAVerifySetup, Token, UserOut, UserRegister

router = APIRouter(prefix="/api/auth", tags=["auth"])

# Rate limits are deliberately loose enough not to interfere with normal
# use or this project's own test suite, while still blocking rapid
# brute-force attempts. See app/core/rate_limit.py for the honest
# limitation (in-memory, single-process only).
register_rate_limit = rate_limiter(max_requests=20, window_seconds=60)
login_rate_limit = rate_limiter(max_requests=20, window_seconds=60)


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED, dependencies=[Depends(register_rate_limit)])
async def register(payload: UserRegister):
    existing = await db.users.find_one({"email": payload.email})
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    now = datetime.now(timezone.utc)
    doc = {
        "email": payload.email,
        "hashed_password": hash_password(payload.password),
        "full_name": payload.full_name,
        "role": payload.role.value,
        "is_active": True,
        "is_verified": False,
        "failed_login_attempts": 0,
        "locked_until": None,
        "mfa_enabled": False,
        "mfa_secret": None,
        "created_at": now,
        "updated_at": now,
    }
    result = await db.users.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    return UserOut(**doc)


@router.post("/login", response_model=Token, dependencies=[Depends(login_rate_limit)])
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    x_mfa_code: str | None = Header(default=None),
):
    user = await db.users.find_one({"email": form_data.username})

    # Distinguish "not found" from "locked" only after confirming the
    # account exists, to avoid a lockout check leaking account existence
    # any more than the existing "incorrect email or password" already does.
    if user and is_account_locked(user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account temporarily locked due to repeated failed attempts. Try again later.",
        )

    if not user or not verify_password(form_data.password, user["hashed_password"]):
        if user:
            attempts = user.get("failed_login_attempts", 0) + 1
            update: dict = {"failed_login_attempts": attempts}
            if attempts >= MAX_FAILED_LOGIN_ATTEMPTS:
                update["locked_until"] = lockout_expiry()
            await db.users.update_one({"_id": user["_id"]}, {"$set": update})
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.get("is_active", False):
        raise HTTPException(status_code=403, detail="Account is disabled")

    if user.get("mfa_enabled"):
        if not x_mfa_code:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="MFA code required — pass it in the X-MFA-Code header",
            )
        if not verify_mfa_code(user["mfa_secret"], x_mfa_code):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid MFA code")

    # Successful login resets the failed-attempt counter.
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"failed_login_attempts": 0, "locked_until": None}})

    token = create_access_token(subject=user["email"], role=user["role"])
    return Token(access_token=token)


@router.post("/mfa/setup", response_model=MFASetupOut)
async def setup_mfa(current_user: dict = Depends(get_current_user)):
    """Generates a new TOTP secret. MFA is not enabled until the user
    confirms possession of it via /mfa/verify-setup."""
    secret = generate_mfa_secret()
    await db.users.update_one({"_id": current_user["_id"]}, {"$set": {"mfa_secret": secret, "mfa_enabled": False}})
    return MFASetupOut(secret=secret, provisioning_uri=get_mfa_provisioning_uri(secret, current_user["email"]))


@router.post("/mfa/verify-setup")
async def verify_mfa_setup(payload: MFAVerifySetup, current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"_id": current_user["_id"]})
    if not user.get("mfa_secret"):
        raise HTTPException(status_code=400, detail="Call /mfa/setup first to generate a secret")
    if not verify_mfa_code(user["mfa_secret"], payload.code):
        raise HTTPException(status_code=401, detail="Invalid code")
    await db.users.update_one({"_id": current_user["_id"]}, {"$set": {"mfa_enabled": True}})
    return {"mfa_enabled": True}
