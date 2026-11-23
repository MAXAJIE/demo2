from __future__ import annotations

import hashlib
import hmac
import secrets
from datetime import datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import ADMIN_SESSION_HOURS
from .models import Staff, StaffSession, utcnow


def _scrypt(password: str, salt: bytes) -> bytes:
    return hashlib.scrypt(
        password.encode("utf-8"), salt=salt, n=2**14, r=8, p=1, dklen=32
    )


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = _scrypt(password, salt)
    return f"scrypt${salt.hex()}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        scheme, salt_hex, digest_hex = stored.split("$")
    except ValueError:
        return False
    if scheme != "scrypt":
        return False
    return hmac.compare_digest(_scrypt(password, bytes.fromhex(salt_hex)).hex(), digest_hex)


def _token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_session(db: Session, staff: Staff) -> tuple[str, datetime]:
    token = secrets.token_urlsafe(32)
    expires_at = utcnow() + timedelta(hours=ADMIN_SESSION_HOURS)
    db.add(
        StaffSession(
            staff_id=staff.id, token_hash=_token_hash(token), expires_at=expires_at
        )
    )
    db.commit()
    return token, expires_at


def resolve_session(db: Session, token: str) -> tuple[Staff, StaffSession] | None:
    now = utcnow()
    row = db.execute(
        select(StaffSession, Staff)
        .join(Staff, Staff.id == StaffSession.staff_id)
        .where(
            StaffSession.token_hash == _token_hash(token),
            StaffSession.expires_at > now,
            Staff.active.is_(True),
        )
    ).first()
    if not row:
        return None
    session, staff = row
    return staff, session


def revoke_session(db: Session, session: StaffSession) -> None:
    db.delete(session)
    db.commit()


def prune_sessions(db: Session) -> None:
    expired = db.execute(
        select(StaffSession).where(StaffSession.expires_at <= utcnow())
    ).scalars()
    for session in expired:
        db.delete(session)
    db.commit()
