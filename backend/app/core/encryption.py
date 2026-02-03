import logging

from cryptography.fernet import Fernet, InvalidToken

from app.core.config import settings

logger = logging.getLogger(__name__)

_fernet: Fernet | None = None

if settings.SPOTIFY_TOKEN_ENCRYPTION_KEY:
    _fernet = Fernet(settings.SPOTIFY_TOKEN_ENCRYPTION_KEY.encode())
else:
    logger.warning(
        "SPOTIFY_TOKEN_ENCRYPTION_KEY is not set — Spotify tokens will be stored in plaintext."
    )


def encrypt_token(plaintext: str) -> str:
    if _fernet is None:
        return plaintext
    return _fernet.encrypt(plaintext.encode()).decode()


def decrypt_token(ciphertext: str) -> str:
    if _fernet is None:
        return ciphertext
    try:
        return _fernet.decrypt(ciphertext.encode()).decode()
    except InvalidToken:
        logger.warning(
            "Failed to decrypt token — returning as plaintext (pre-encryption migration data)."
        )
        return ciphertext
