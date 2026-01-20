from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class MatchCreateIn(BaseModel):
    target_type: Literal["artist", "venue"]
    target_id: str


class MatchOut(BaseModel):
    id: str
    target_type: Literal["artist", "venue"]
    target_id: str
    name: str
    city: str
    state: str
    created_at: datetime
