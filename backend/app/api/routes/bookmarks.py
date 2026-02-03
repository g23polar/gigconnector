import uuid
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.core.rate_limit import limiter
from app.models.bookmark import Bookmark, EntityType

router = APIRouter(prefix="/bookmarks", tags=["bookmarks"])


@router.post("")
@limiter.limit("30/minute")
def create_bookmark(
    request: Request,
    to_entity_type: EntityType,
    to_entity_id: str,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    bm = Bookmark(
        id=str(uuid.uuid4()),
        from_user_id=user.id,
        to_entity_type=to_entity_type,
        to_entity_id=to_entity_id,
    )
    db.add(bm)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Bookmark already exists or invalid")

    return {"id": bm.id}


@router.get("")
def list_bookmarks(db: Session = Depends(get_db), user=Depends(get_current_user)):
    bms = (
        db.query(Bookmark)
        .filter(Bookmark.from_user_id == user.id)
        .order_by(Bookmark.created_at.desc())
        .all()
    )
    return [
        {
            "id": b.id,
            "to_entity_type": b.to_entity_type,
            "to_entity_id": b.to_entity_id,
            "created_at": b.created_at,
        }
        for b in bms
    ]


@router.delete("/{bookmark_id}")
def delete_bookmark(bookmark_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    bm = (
        db.query(Bookmark)
        .filter(Bookmark.id == bookmark_id, Bookmark.from_user_id == user.id)
        .first()
    )
    if not bm:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    db.delete(bm)
    db.commit()
    return {"ok": True}
