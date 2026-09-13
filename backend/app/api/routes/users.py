from fastapi import APIRouter, Depends

from app.api.deps import get_current_user, require_roles
from app.models.role import Role
from app.schemas.user import UserOut

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/me", response_model=UserOut)
async def read_own_profile(current_user: dict = Depends(get_current_user)):
    return UserOut(id=str(current_user["_id"]), **{
        k: v for k, v in current_user.items() if k not in ("_id", "hashed_password")
    })


@router.get("/admin-only-example")
async def admin_only_example(
    current_user: dict = Depends(require_roles(Role.ADMIN, Role.SUPER_ADMIN)),
):
    """Demonstrates the RBAC pattern every future protected route will follow."""
    return {"message": f"Welcome, {current_user['full_name']} — you have admin access."}
