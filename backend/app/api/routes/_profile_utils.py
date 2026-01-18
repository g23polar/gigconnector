from sqlalchemy.orm import Session
from app.models.genre import Genre


def normalize_genre_name(name: str) -> str:
    return name.strip().lower()


def upsert_genres(db: Session, names: list[str]) -> list[Genre]:
    out: list[Genre] = []
    for raw in names:
        n = normalize_genre_name(raw)
        if not n:
            continue
        g = db.query(Genre).filter(Genre.name == n).first()
        if not g:
            g = Genre(id=n, name=n)  # MVP: id=name
            db.add(g)
        out.append(g)
    return out
