from pydantic import BaseModel

from app.models.bookmark import EntityType


class BookmarkCreateIn(BaseModel):
    to_entity_type: EntityType
    to_entity_id: str


class BookmarkOut(BaseModel):
    id: str
    type: EntityType
    entity_id: str
