from pydantic import BaseModel, EmailStr, field_validator

from app.models.user import UserRole


class RegisterIn(BaseModel):
    email: EmailStr
    password: str
    role: UserRole

    @field_validator("password")
    @classmethod
    def password_length_limit(cls, v: str) -> str:
        b = v.encode("utf-8")
        if len(b) > 256:
            raise ValueError("Password must be at most 256 bytes.")
        if len(b) < 8:
            raise ValueError("Password must be at least 8 bytes.")
        return v



class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
