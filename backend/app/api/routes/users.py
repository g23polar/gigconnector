from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api.deps import get_current_user, get_db

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/me")
def me(user=Depends(get_current_user)):
    return {"id": user.id, "email": user.email, "role": user.role}


@router.delete("/me")
def delete_me(db: Session = Depends(get_db), user=Depends(get_current_user)):
    db.delete(user)
    db.commit()
    return {"ok": True}
