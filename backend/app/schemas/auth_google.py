from typing import Optional

from pydantic import BaseModel

from app.models.user import UserRole


class GoogleAuthIn(BaseModel):
    id_token: str
    role: Optional[UserRole] = None
