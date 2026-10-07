import time
from datetime import datetime, timezone
from typing import Any

import bcrypt
import jwt

from backend.config import settings


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


def create_access_token(username: str, role: str, expires_in: int | None = None) -> str:
    if expires_in is None:
        expires_in = settings.ACCESS_TOKEN_EXPIRE_SECONDS
    now = int(datetime.now(timezone.utc).timestamp())
    payload = {
        "sub": username,
        "role": role,

        "iat": now,
        "exp": now + expires_in,
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> dict[str, Any]:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        if payload.get("exp", 0) <= int(time.time()):
            raise ValueError("Token has expired")
        return payload
    except (jwt.InvalidTokenError, ValueError, TypeError) as exc:
        raise ValueError("Invalid or expired authentication token") from exc



def get_current_user(token: str | None) -> dict[str, Any]:
    if not token:
        raise PermissionError("Authentication required")
    payload = decode_access_token(token)
    return {"username": payload["sub"], "role": payload.get("role", "user")}
