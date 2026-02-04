import uuid
import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.core.config import settings
from app.core.rate_limit import limiter
from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User, UserRole
from app.schemas.auth import RegisterIn, TokenOut

router = APIRouter(prefix="/auth", tags=["auth"])

from app.schemas.auth_login import LoginIn
from app.schemas.auth_google import GoogleAuthIn


def _set_auth_cookie(response: Response, token: str) -> None:
    is_dev = settings.ENVIRONMENT == "development"
    response.set_cookie(
        key="gc_token",
        value=token,
        httponly=True,
        secure=not is_dev,
        samesite="lax" if is_dev else "none",
        max_age=settings.ACCESS_TOKEN_MINUTES * 60,
        path="/",
    )


@router.post("/login-json", response_model=TokenOut)
@limiter.limit("5/minute")
def login_json(request: Request, payload: LoginIn, response: Response, db: Session = Depends(get_db)) -> TokenOut:
    if len(payload.password.encode("utf-8")) > 256:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password too long (max 256 bytes).")

    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token = create_access_token(user.id)
    _set_auth_cookie(response, token)
    return TokenOut(access_token=token, role=user.role.value)



@router.post("/register", response_model=TokenOut)
@limiter.limit("3/minute")
def register(request: Request, payload: RegisterIn, response: Response, db: Session = Depends(get_db)) -> TokenOut:
    if payload.role == UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin accounts cannot be self-registered")
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    try:
        pw_hash = hash_password(payload.password)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    user = User(
        id=str(uuid.uuid4()),
        email=payload.email,
        password_hash=pw_hash,
        role=payload.role,
    )

    db.add(user)
    db.commit()

    token = create_access_token(user.id)
    _set_auth_cookie(response, token)
    return TokenOut(access_token=token, role=user.role.value)


@router.post("/login", response_model=TokenOut)
@limiter.limit("5/minute")
def login(request: Request, response: Response, form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)) -> TokenOut:
    # OAuth2PasswordRequestForm uses "username" field for the login identifier (we use email).
    # Reject passwords exceeding the 256-byte limit enforced at registration.
    if len(form.password.encode("utf-8")) > 256:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password too long (max 256 bytes).")

    user = db.query(User).filter(User.email == form.username).first()
    if not user or not verify_password(form.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token = create_access_token(user.id)
    _set_auth_cookie(response, token)
    return TokenOut(access_token=token, role=user.role.value)


@router.post("/google", response_model=TokenOut)
@limiter.limit("5/minute")
def google_auth(request: Request, payload: GoogleAuthIn, response: Response, db: Session = Depends(get_db)) -> TokenOut:
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Google auth not configured")

    try:
        resp = httpx.get(
            "https://oauth2.googleapis.com/tokeninfo",
            params={"id_token": payload.id_token},
            timeout=10.0,
        )
    except httpx.HTTPError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Google token verification failed")

    if resp.status_code != 200:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Google token")

    data = resp.json()
    if data.get("aud") != settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Google token audience mismatch")

    if data.get("email_verified") not in ("true", True):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Google email not verified")

    email = data.get("email")
    if not email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Google email missing")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        if payload.role is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Role required for Google sign-up")
        if payload.role == UserRole.admin:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin accounts cannot be self-registered")
        pw_hash = hash_password(str(uuid.uuid4()))
        user = User(id=str(uuid.uuid4()), email=email, password_hash=pw_hash, role=payload.role)
        db.add(user)
        db.commit()

    token = create_access_token(user.id)
    _set_auth_cookie(response, token)
    return TokenOut(access_token=token, role=user.role.value)


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie("gc_token", path="/")
    return {"ok": True}
