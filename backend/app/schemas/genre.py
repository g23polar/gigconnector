from pydantic import BaseModel


class GenreOut(BaseModel):
    id: str
    name: str
