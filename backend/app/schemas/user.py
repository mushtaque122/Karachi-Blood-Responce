from pydantic import BaseModel, EmailStr, Field

from app.models.role import Role


class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str
    role: Role = Role.PATIENT_REQUESTER  # self-registration cannot grant staff/admin roles


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    role: Role
    is_active: bool
    is_verified: bool


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class MFASetupOut(BaseModel):
    secret: str
    provisioning_uri: str


class MFAVerifySetup(BaseModel):
    code: str = Field(min_length=6, max_length=6)
