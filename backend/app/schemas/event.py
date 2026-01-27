from datetime import date

from pydantic import BaseModel, Field


class EventIn(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str = ""
    date: date


class EventOut(BaseModel):
    id: str
    title: str
    description: str
    date: date
