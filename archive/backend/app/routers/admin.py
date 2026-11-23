from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import (
    Booking,
    FaqItem,
    Lead,
    Offering,
    SiteSettings,
    Staff,
    StaffSession,
    Tenant,
    utcnow,
)
from ..schemas import (
    AdminLogin,
    BookingUpdate,
    LeadUpdate,
    OfferingUpdate,
    SettingsUpdate,
)
from ..rate_limit import check_rate_limit
from ..security import create_session, resolve_session, revoke_session, verify_password
from ..services.notify import record_audit
from ..services.tenant import (
    get_settings,
    serialize_booking,
    serialize_lead,
    serialize_offering,
)
from ..services.time_utils import KL, iso_utc, today_kl
from ..theme import THEME_PRESETS, resolve_theme

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])

ALLOWED_BOOKING_TRANSITIONS = {
    "pending": {"confirmed", "declined", "cancelled"},
    "confirmed": {"cancelled"},
    "declined": set(),
    "cancelled": set(),
}


def _bearer(request: Request) -> str:
    header = request.headers.get("authorization", "")
    if not header.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail={"code": "not_authenticated"})
    return header.split(" ", 1)[1].strip()


def current_staff(
    request: Request, db: Session = Depends(get_db)
) -> tuple[Staff, StaffSession]:
    resolved = resolve_session(db, _bearer(request))
    if not resolved:
        raise HTTPException(status_code=401, detail={"code": "not_authenticated"})
    return resolved


def _require_roles(staff: Staff, roles: set[str]) -> None:
    if staff.role not in roles:
        raise HTTPException(status_code=403, detail={"code": "forbidden"})


def _admin_settings_payload(settings: SiteSettings) -> dict:
    theme = resolve_theme(settings.theme)
    return {
        "brand_name": settings.brand_name or {},
        "contact": settings.contact or {},
        "payment_config": settings.payment_config or {},
        "labels": settings.labels or {},
        "theme": theme,
        "theme_preset": theme["preset"],
        "theme_presets": [
            {"key": key, "label": preset["label"], "tokens": preset["tokens"]}
            for key, preset in THEME_PRESETS.items()
        ],
        "default_locale": settings.default_locale,
        "locales": settings.locales or ["en"],
        "checkout_mode": settings.checkout_mode,
        "booking_mode": settings.booking_mode,
        "forwarding_configured": bool(
            (settings.payment_config or {}).get("merchant_webhook_url")
        ),
    }


@router.post("/login")
def login(
    payload: AdminLogin, request: Request, db: Session = Depends(get_db)
) -> dict:
    client_ip = request.client.host if request.client else "unknown"
    identifier = payload.identifier.strip()
    if not check_rate_limit("admin_login_ip", client_ip) or not check_rate_limit(
        "admin_login_id", identifier.lower()
    ):
        raise HTTPException(status_code=429, detail={"code": "rate_limited"})
    digits = re.sub(r"\D", "", identifier)
    candidates = {identifier.lower()}
    if digits:
        candidates.add(digits)
        if digits.startswith("0"):
            candidates.add("6" + digits)

    staff_rows = db.scalars(
        select(Staff).where(Staff.active.is_(True), Staff.login_id.in_(candidates))
    ).all()
    staff = next(
        (row for row in staff_rows if verify_password(payload.password, row.password_hash)),
        None,
    )
    if not staff:
        raise HTTPException(status_code=401, detail={"code": "invalid_credentials"})

    tenant = db.get(Tenant, staff.tenant_id)
    if not tenant or tenant.status != "active":
        raise HTTPException(status_code=403, detail={"code": "tenant_inactive"})
    token, expires_at = create_session(db, staff)
    return {
        "token": token,
        "expires_at": iso_utc(expires_at),
        "staff": {
            "id": staff.id,
            "name": staff.display_name,
            "role": staff.role,
            "tenant_slug": tenant.slug,
        },
    }


@router.get("/session")
def session_info(
    staff_session: tuple[Staff, StaffSession] = Depends(current_staff),
) -> dict:
    staff, session = staff_session
    return {
        "staff": {"id": staff.id, "name": staff.display_name, "role": staff.role},
        "expires_at": iso_utc(session.expires_at),
    }


@router.post("/logout")
def logout(
    staff_session: tuple[Staff, StaffSession] = Depends(current_staff),
    db: Session = Depends(get_db),
) -> dict:
    _, session = staff_session
    revoke_session(db, session)
    return {"ok": True}


@router.get("/overview")
def overview(
    staff_session: tuple[Staff, StaffSession] = Depends(current_staff),
    db: Session = Depends(get_db),
) -> dict:
    staff, _ = staff_session
    tenant = db.get(Tenant, staff.tenant_id)
    settings = get_settings(db, staff.tenant_id)

    today = today_kl()
    start_local = datetime.combine(today, datetime.min.time(), tzinfo=KL)
    end_local = start_local + timedelta(days=1)
    start_utc = start_local.astimezone(timezone.utc).replace(tzinfo=None)
    end_utc = end_local.astimezone(timezone.utc).replace(tzinfo=None)

    pending = db.scalar(
        select(func.count(Booking.id)).where(
            Booking.tenant_id == tenant.id, Booking.status == "pending"
        )
    )
    today_count = db.scalar(
        select(func.count(Booking.id)).where(
            Booking.tenant_id == tenant.id,
            Booking.starts_at >= start_utc,
            Booking.starts_at < end_utc,
            Booking.status.in_(("pending", "confirmed")),
        )
    )
    new_leads = db.scalar(
        select(func.count(Lead.id)).where(
            Lead.tenant_id == tenant.id, Lead.status == "new"
        )
    )

    upcoming_rows = db.execute(
        select(Booking, Offering)
        .join(Offering, Offering.id == Booking.offering_id, isouter=True)
        .where(
            Booking.tenant_id == tenant.id,
            Booking.starts_at >= start_utc,
            Booking.status.in_(("pending", "confirmed")),
        )
        .order_by(Booking.starts_at.asc())
        .limit(6)
    ).all()

    latest_leads = db.scalars(
        select(Lead)
        .where(Lead.tenant_id == tenant.id)
        .order_by(Lead.created_at.desc())
        .limit(4)
    ).all()

    return {
        "tenant": {"slug": tenant.slug, "brand_name": settings.brand_name},
        "counts": {
            "pending_bookings": pending or 0,
            "today_bookings": today_count or 0,
            "new_leads": new_leads or 0,
            "published_offerings": db.scalar(
                select(func.count(Offering.id)).where(
                    Offering.tenant_id == tenant.id, Offering.status == "published"
                )
            )
            or 0,
        },
        "upcoming": [
            {
                **serialize_booking(booking, offering),
                "id": booking.id,
                "created_at": iso_utc(booking.created_at),
            }
            for booking, offering in upcoming_rows
        ],
        "latest_leads": [serialize_lead(lead) for lead in latest_leads],
    }


@router.get("/bookings")
def list_bookings(
    status: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=300),
    staff_session: tuple[Staff, StaffSession] = Depends(current_staff),
    db: Session = Depends(get_db),
) -> dict:
    staff, _ = staff_session
    query = (
        select(Booking, Offering)
        .join(Offering, Offering.id == Booking.offering_id, isouter=True)
        .where(Booking.tenant_id == staff.tenant_id)
        .order_by(Booking.starts_at.desc())
        .limit(limit)
    )
    if status and status != "all":
        query = query.where(Booking.status == status)
    rows = db.execute(query).all()
    return {
        "bookings": [
            {
                **serialize_booking(booking, offering),
                "id": booking.id,
                "created_at": iso_utc(booking.created_at),
            }
            for booking, offering in rows
        ]
    }


@router.patch("/bookings/{booking_id}")
def update_booking(
    booking_id: str,
    payload: BookingUpdate,
    staff_session: tuple[Staff, StaffSession] = Depends(current_staff),
    db: Session = Depends(get_db),
) -> dict:
    staff, _ = staff_session
    _require_roles(staff, {"owner", "manager", "front_desk"})
    booking = db.scalar(
        select(Booking).where(
            Booking.id == booking_id, Booking.tenant_id == staff.tenant_id
        )
    )
    if not booking:
        raise HTTPException(status_code=404, detail={"code": "booking_not_found"})

    if payload.status is not None and payload.status != booking.status:
        if payload.status not in ALLOWED_BOOKING_TRANSITIONS.get(booking.status, set()):
            raise HTTPException(status_code=409, detail={"code": "invalid_transition"})
        booking.status = payload.status
        if payload.status == "confirmed":
            booking.confirmed_by = staff.id
    if payload.payment_verified is not None:
        booking.payment_verified = payload.payment_verified

    db.commit()
    record_audit(
        db,
        staff.tenant_id,
        "booking.updated",
        "booking",
        booking.id,
        actor_id=staff.id,
        meta={"ref": booking.booking_ref, "status": booking.status},
    )
    offering = db.get(Offering, booking.offering_id)
    return {
        "booking": {
            **serialize_booking(booking, offering),
            "id": booking.id,
            "created_at": iso_utc(booking.created_at),
        }
    }


@router.get("/leads")
def list_leads(
    status: str | None = Query(default=None),
    staff_session: tuple[Staff, StaffSession] = Depends(current_staff),
    db: Session = Depends(get_db),
) -> dict:
    staff, _ = staff_session
    query = (
        select(Lead)
        .where(Lead.tenant_id == staff.tenant_id)
        .order_by(Lead.created_at.desc())
        .limit(200)
    )
    if status and status != "all":
        query = query.where(Lead.status == status)
    leads = db.scalars(query).all()
    return {"leads": [serialize_lead(lead) for lead in leads]}


@router.patch("/leads/{lead_id}")
def update_lead(
    lead_id: str,
    payload: LeadUpdate,
    staff_session: tuple[Staff, StaffSession] = Depends(current_staff),
    db: Session = Depends(get_db),
) -> dict:
    staff, _ = staff_session
    _require_roles(staff, {"owner", "manager", "front_desk"})
    lead = db.scalar(
        select(Lead).where(Lead.id == lead_id, Lead.tenant_id == staff.tenant_id)
    )
    if not lead:
        raise HTTPException(status_code=404, detail={"code": "lead_not_found"})
    if payload.status is not None:
        lead.status = payload.status
    if payload.internal_notes is not None:
        lead.internal_notes = payload.internal_notes
    db.commit()
    record_audit(
        db, staff.tenant_id, "lead.updated", "lead", lead.id, actor_id=staff.id
    )
    return {"lead": serialize_lead(lead)}


@router.get("/offerings")
def list_offerings(
    staff_session: tuple[Staff, StaffSession] = Depends(current_staff),
    db: Session = Depends(get_db),
) -> dict:
    staff, _ = staff_session
    offerings = db.scalars(
        select(Offering)
        .where(Offering.tenant_id == staff.tenant_id)
        .order_by(Offering.sort)
    ).all()
    return {
        "offerings": [
            {
                **serialize_offering(item),
                "price_note": item.price_note or {},
            }
            for item in offerings
        ]
    }


@router.patch("/offerings/{offering_id}")
def update_offering(
    offering_id: str,
    payload: OfferingUpdate,
    staff_session: tuple[Staff, StaffSession] = Depends(current_staff),
    db: Session = Depends(get_db),
) -> dict:
    staff, _ = staff_session
    _require_roles(staff, {"owner", "manager", "editor"})
    offering = db.scalar(
        select(Offering).where(
            Offering.id == offering_id, Offering.tenant_id == staff.tenant_id
        )
    )
    if not offering:
        raise HTTPException(status_code=404, detail={"code": "offering_not_found"})

    provided = payload.model_fields_set
    if "title" in provided and payload.title is not None:
        offering.title = {**(offering.title or {}), **payload.title.model_dump(exclude_none=True)}
    if "summary" in provided and payload.summary is not None:
        offering.summary = {
            **(offering.summary or {}),
            **payload.summary.model_dump(exclude_none=True),
        }
    if "price_note" in provided and payload.price_note is not None:
        offering.price_note = {
            **(offering.price_note or {}),
            **payload.price_note.model_dump(exclude_none=True),
        }
    if "price_cents" in provided:
        offering.price_cents = payload.price_cents
    if "deposit_cents" in provided:
        offering.deposit_cents = payload.deposit_cents
    if "status" in provided and payload.status is not None:
        offering.status = payload.status
    db.commit()
    record_audit(
        db,
        staff.tenant_id,
        "offering.updated",
        "offering",
        offering.id,
        actor_id=staff.id,
        meta={"slug": offering.slug},
    )
    return {"offering": serialize_offering(offering)}


@router.get("/settings")
def read_settings(
    staff_session: tuple[Staff, StaffSession] = Depends(current_staff),
    db: Session = Depends(get_db),
) -> dict:
    staff, _ = staff_session
    return _admin_settings_payload(get_settings(db, staff.tenant_id))


@router.patch("/settings")
def update_settings(
    payload: SettingsUpdate,
    staff_session: tuple[Staff, StaffSession] = Depends(current_staff),
    db: Session = Depends(get_db),
) -> dict:
    staff, _ = staff_session
    _require_roles(staff, {"owner", "manager"})
    settings = get_settings(db, staff.tenant_id)
    provided = payload.model_fields_set

    if "brand_name" in provided and payload.brand_name is not None:
        settings.brand_name = {
            **(settings.brand_name or {}),
            **payload.brand_name.model_dump(exclude_none=True),
        }

    if "contact" in provided and payload.contact is not None:
        contact = dict(settings.contact or {})
        changes = payload.contact.model_dump(exclude_unset=True)
        for key in ("whatsapp", "phone", "email", "map_url", "closes_at"):
            if key in changes and changes[key] is not None:
                contact[key] = changes[key].strip()
        address = dict(contact.get("address") or {})
        if changes.get("address_en") is not None:
            address["en"] = changes["address_en"].strip()
        if changes.get("address_zh") is not None:
            address["zh"] = changes["address_zh"].strip()
        contact["address"] = address
        hours = dict(contact.get("opening_hours") or {})
        if changes.get("opening_hours_en") is not None:
            hours["en"] = changes["opening_hours_en"].strip()
        if changes.get("opening_hours_zh") is not None:
            hours["zh"] = changes["opening_hours_zh"].strip()
        contact["opening_hours"] = hours
        settings.contact = contact

    if "payment_config" in provided and payload.payment_config is not None:
        payment = dict(settings.payment_config or {})
        for key, value in payload.payment_config.model_dump(exclude_unset=True).items():
            if value is not None:
                payment[key] = value.strip()
        settings.payment_config = payment

    if "labels" in provided and payload.labels is not None:
        labels = dict(settings.labels or {})
        mapping = {
            "offerings_plural": ("offerings_plural_en", "offerings_plural_zh"),
            "offerings_singular": ("offerings_singular_en", "offerings_singular_zh"),
            "book_cta": ("book_cta_en", "book_cta_zh"),
        }
        raw = payload.labels.model_dump(exclude_unset=True)
        for label_key, (en_key, zh_key) in mapping.items():
            current = dict(labels.get(label_key) or {})
            if raw.get(en_key) is not None:
                current["en"] = raw[en_key].strip()
            if raw.get(zh_key) is not None:
                current["zh"] = raw[zh_key].strip()
            labels[label_key] = current
        settings.labels = labels

    if "theme_preset" in provided and payload.theme_preset:
        if payload.theme_preset not in THEME_PRESETS:
            raise HTTPException(status_code=422, detail={"code": "unknown_theme_preset"})
        settings.theme = resolve_theme(
            {"preset": payload.theme_preset, "typography": None, "layout": "hero-centered"}
        )

    if "default_locale" in provided and payload.default_locale:
        if payload.default_locale not in (settings.locales or ["en"]):
            raise HTTPException(status_code=422, detail={"code": "unsupported_locale"})
        settings.default_locale = payload.default_locale

    if "checkout_mode" in provided and payload.checkout_mode:
        if payload.checkout_mode not in (
            "none",
            "external_link",
            "manual_qr_proof",
            "gateway_redirect",
        ):
            raise HTTPException(status_code=422, detail={"code": "invalid_checkout_mode"})
        settings.checkout_mode = payload.checkout_mode

    if "booking_mode" in provided and payload.booking_mode:
        if payload.booking_mode not in ("approval", "auto"):
            raise HTTPException(status_code=422, detail={"code": "invalid_booking_mode"})
        settings.booking_mode = payload.booking_mode

    db.commit()
    record_audit(
        db,
        staff.tenant_id,
        "settings.updated",
        "site_settings",
        settings.id,
        actor_id=staff.id,
    )
    return _admin_settings_payload(settings)


@router.get("/faq")
def list_faq(
    staff_session: tuple[Staff, StaffSession] = Depends(current_staff),
    db: Session = Depends(get_db),
) -> dict:
    staff, _ = staff_session
    items = db.scalars(
        select(FaqItem)
        .where(FaqItem.tenant_id == staff.tenant_id)
        .order_by(FaqItem.sort)
    ).all()
    return {
        "faq": [
            {
                "id": item.id,
                "question": item.question,
                "answer": item.answer,
                "published": item.published,
                "sort": item.sort,
            }
            for item in items
        ]
    }
