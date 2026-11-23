from __future__ import annotations

import base64
import hashlib
import secrets
import threading
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..config import BOOKING_RATE_LIMIT_MAX, BOOKING_RATE_WINDOW_MINUTES
from ..db import get_db
from ..models import Booking, Lead, Offering, SiteSettings, Tenant, utcnow
from ..rate_limit import check_rate_limit
from ..schemas import BookingCreate, CancelRequest, LeadCreate
from ..services.notify import (
    booking_message,
    forward_to_merchant,
    record_audit,
    whatsapp_link,
)
from ..services.tenant import (
    ACTIVE_BOOKING_STATUSES,
    get_settings,
    resolve_tenant,
    serialize_booking,
    serialize_offering,
    site_bundle,
    slot_days,
)
from ..translations_ms import MS_CONTENT
from ..services.time_utils import (
    KL,
    from_utc_naive,
    is_valid_phone,
    iso_utc,
    mask_phone,
    normalize_phone,
    to_utc_naive,
)

router = APIRouter(prefix="/api/v1", tags=["public"])

# Single-process guard for the read-check-insert booking race on SQLite.
# Postgres deployments should add a tstzrange exclusion constraint instead.
BOOKING_LOCK = threading.Lock()


def _tenant_or_404(db: Session, request: Request, tenant_slug: str | None) -> Tenant:
    tenant = resolve_tenant(
        db,
        host=request.headers.get("x-forwarded-host") or request.headers.get("host"),
        slug=tenant_slug,
    )
    if not tenant:
        raise HTTPException(status_code=404, detail={"code": "unknown_tenant"})
    return tenant


def _request_ip(request: Request) -> str:
    # X-Forwarded-For is caller-controlled, so it is never read here. Behind a
    # reverse proxy, run uvicorn with --proxy-headers --forwarded-allow-ips=<proxy ip>:
    # uvicorn then rewrites request.client.host from the header, but only when the
    # TCP peer is in that allow-list.
    return request.client.host if request.client else "unknown"


def _ip_hash(ip: str) -> str:
    return hashlib.sha256(ip.encode("utf-8")).hexdigest()[:32]


def _limit(
    request: Request,
    scope: str,
    *,
    limit: int | None = None,
    window_seconds: float | None = None,
) -> None:
    if not check_rate_limit(
        scope, _request_ip(request), limit=limit, window_seconds=window_seconds
    ):
        raise HTTPException(status_code=429, detail={"code": "rate_limited"})


def _booking_ref(slug: str) -> str:
    prefix = "".join(ch for ch in slug.upper() if ch.isalpha())[:3] or "BKG"
    return f"{prefix}-{datetime.now(KL):%y%m%d}-{secrets.token_hex(2).upper()}"


def _lead_ref() -> str:
    return f"LED-{datetime.now(KL):%y%m%d}-{secrets.token_hex(2).upper()}"


def _locale_text(value: dict | None, locale: str) -> str:
    value = value or {}
    if locale == "ms" and value.get("ms"):
        return value["ms"]
    english = value.get("en", "")
    if locale == "ms" and english:
        return MS_CONTENT.get(english, english)
    return value.get(locale) or english or next(iter(value.values()), "")


def _booking_whatsapp(db: Session, settings: SiteSettings, booking: Booking, offering: Offering | None) -> str:
    number = (settings.contact or {}).get("whatsapp") or ""
    if not number:
        return ""
    locale = booking.locale
    when = from_utc_naive(booking.starts_at).astimezone(KL)
    if locale == "zh":
        when_label = when.strftime("%Y年%m月%d日 %H:%M")
    elif locale == "ms":
        when_label = when.strftime("%d/%m/%Y · %I:%M %p").replace(" 0", " ").replace("AM", "PG").replace("PM", "PTG")
    else:
        when_label = when.strftime("%a, %d %b %Y · %I:%M %p").replace(" 0", " ")
    return whatsapp_link(
        number,
        booking_message(
            _locale_text(settings.brand_name, locale),
            booking.booking_ref,
            _locale_text(offering.title if offering else {}, locale),
            when_label,
            booking.customer_display_name,
            "—",
            locale,
        ).replace("联络号码：—\n", "").replace("Phone: —\n", ""),
    )


@router.get("/site")
def public_site(
    request: Request,
    tenant: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> dict:
    resolved = _tenant_or_404(db, request, tenant)
    return site_bundle(db, resolved)


@router.get("/offerings/{slug}")
def public_offering(
    slug: str,
    request: Request,
    tenant: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> dict:
    resolved = _tenant_or_404(db, request, tenant)
    offering = db.scalar(
        select(Offering).where(
            Offering.tenant_id == resolved.id,
            Offering.slug == slug,
            Offering.status == "published",
        )
    )
    if not offering:
        raise HTTPException(status_code=404, detail={"code": "offering_not_found"})
    return {"offering": serialize_offering(offering)}


@router.get("/availability")
def public_availability(
    request: Request,
    tenant: str | None = Query(default=None),
    offering: str | None = Query(default=None),
    days: int = Query(default=14, ge=1, le=30),
    db: Session = Depends(get_db),
) -> dict:
    resolved = _tenant_or_404(db, request, tenant)
    offering_id = None
    duration_minutes = None
    if offering:
        row = db.scalar(
            select(Offering).where(
                Offering.tenant_id == resolved.id,
                Offering.slug == offering,
                Offering.status == "published",
            )
        )
        if not row:
            raise HTTPException(status_code=404, detail={"code": "offering_not_found"})
        offering_id = row.id
        duration_minutes = int((row.attributes or {}).get("duration_min") or 45)
    return {
        "timezone": resolved.settings.timezone if resolved.settings else "Asia/Kuala_Lumpur",
        "days": slot_days(
            db,
            resolved.id,
            days=days,
            offering_id=offering_id,
            duration_minutes=duration_minutes,
        ),
        "server_time": iso_utc(utcnow()),
    }


@router.post("/bookings", status_code=201)
def create_booking(
    payload: BookingCreate,
    request: Request,
    tenant: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> dict:
    if payload.website:
        raise HTTPException(status_code=400, detail={"code": "invalid_submission"})
    if not payload.consent:
        raise HTTPException(status_code=422, detail={"code": "consent_required"})
    if payload.starts_at.tzinfo is None:
        raise HTTPException(status_code=422, detail={"code": "starts_at_requires_timezone"})
    if not is_valid_phone(payload.customer_phone):
        raise HTTPException(status_code=422, detail={"code": "invalid_phone"})
    _limit(
        request,
        "booking",
        limit=BOOKING_RATE_LIMIT_MAX,
        window_seconds=BOOKING_RATE_WINDOW_MINUTES * 60,
    )

    resolved = _tenant_or_404(db, request, tenant)
    settings = get_settings(db, resolved.id)
    offering = db.scalar(
        select(Offering).where(
            Offering.tenant_id == resolved.id,
            Offering.slug == payload.offering_slug,
            Offering.status == "published",
        )
    )
    if not offering:
        raise HTTPException(status_code=404, detail={"code": "offering_not_found"})

    start_utc = to_utc_naive(payload.starts_at)
    duration = int((offering.attributes or {}).get("duration_min") or 45)
    duration = max(45, min(duration, 120))
    ends_utc = start_utc + timedelta(minutes=duration)

    with BOOKING_LOCK:
        days = slot_days(
            db, resolved.id, days=30, offering_id=offering.id, duration_minutes=duration
        )
        matching_day = next(
            (day for day in days if day["date"] == start_utc.astimezone(KL).date().isoformat()),
            None,
        )
        available = bool(
            matching_day
            and any(slot["starts_at"] == iso_utc(start_utc) for slot in matching_day["slots"])
        )
        if not available:
            raise HTTPException(status_code=409, detail={"code": "slot_unavailable"})

        booking = Booking(
            tenant_id=resolved.id,
            booking_ref=_booking_ref(resolved.slug),
            offering_id=offering.id,
            starts_at=start_utc,
            ends_at=ends_utc,
            status="pending",
            customer_display_name=payload.customer_name,
            customer_contact_masked=mask_phone(payload.customer_phone),
            amount_cents=offering.price_cents,
            deposit_cents=offering.deposit_cents,
            locale=payload.locale,
            cancel_token=secrets.token_urlsafe(24),
            consent_at=utcnow(),
        )
        db.add(booking)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            raise HTTPException(status_code=409, detail={"code": "slot_taken"}) from None

    when_local = from_utc_naive(booking.starts_at).astimezone(KL)
    forward_status, forward_error = forward_to_merchant(
        settings,
        "booking.created",
        {
            "booking_ref": booking.booking_ref,
            "customer_name": booking.customer_display_name,
            "customer_phone": normalize_phone(payload.customer_phone),
            "offering": _locale_text(offering.title, "en"),
            "offering_slug": offering.slug,
            "starts_at": iso_utc(booking.starts_at),
            "starts_at_local": when_local.isoformat(),
            "timezone": settings.timezone,
            "deposit_cents": booking.deposit_cents,
            "locale": booking.locale,
            "created_at": iso_utc(booking.created_at),
        },
    )
    record_audit(
        db,
        resolved.id,
        "booking.created",
        "booking",
        booking.id,
        meta={"ref": booking.booking_ref, "forward": forward_status},
    )

    message = booking_message(
        _locale_text(settings.brand_name, booking.locale),
        booking.booking_ref,
        _locale_text(offering.title, booking.locale),
        when_local.strftime("%Y年%m月%d日 %H:%M")
        if booking.locale == "zh"
        else when_local.strftime("%d/%m/%Y · %I:%M %p").replace(" 0", " ").replace("AM", "PG").replace("PM", "PTG")
        if booking.locale == "ms"
        else when_local.strftime("%a, %d %b %Y · %I:%M %p").replace(" 0", " "),
        booking.customer_display_name,
        normalize_phone(payload.customer_phone),
        booking.locale,
    )
    wa_number = (settings.contact or {}).get("whatsapp") or ""
    return {
        "booking": serialize_booking(booking, offering, include_token=True),
        "whatsapp_url": whatsapp_link(wa_number, message) if wa_number else "",
        "forwarded": forward_status,
        "forward_error": forward_error,
    }


@router.get("/bookings/{ref}")
def booking_status(
    ref: str,
    request: Request,
    tenant: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> dict:
    resolved = _tenant_or_404(db, request, tenant)
    token = request.headers.get("x-booking-token", "").strip()
    booking = db.scalar(
        select(Booking).where(
            Booking.tenant_id == resolved.id,
            Booking.booking_ref == ref.upper(),
            Booking.cancel_token == token,
        )
    ) if token else None
    if not booking:
        raise HTTPException(status_code=404, detail={"code": "booking_not_found"})
    offering = db.get(Offering, booking.offering_id) if booking.offering_id else None
    settings = get_settings(db, resolved.id)
    return {
        "booking": serialize_booking(booking, offering, include_token=True),
        "whatsapp_url": _booking_whatsapp(db, settings, booking, offering),
    }


@router.post("/bookings/{ref}/cancel")
def cancel_booking(
    ref: str,
    payload: CancelRequest,
    request: Request,
    tenant: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> dict:
    resolved = _tenant_or_404(db, request, tenant)
    booking = db.scalar(
        select(Booking).where(
            Booking.tenant_id == resolved.id,
            Booking.booking_ref == ref.upper(),
            Booking.cancel_token == payload.token,
        )
    )
    if not booking:
        raise HTTPException(status_code=404, detail={"code": "booking_not_found"})
    if booking.status in {"cancelled", "declined"}:
        return {"booking": serialize_booking(booking, db.get(Offering, booking.offering_id))}
    if booking.status not in ACTIVE_BOOKING_STATUSES:
        raise HTTPException(status_code=409, detail={"code": "cannot_cancel"})
    booking.status = "cancelled"
    db.commit()
    record_audit(
        db,
        resolved.id,
        "booking.cancelled_by_customer",
        "booking",
        booking.id,
        meta={"ref": booking.booking_ref},
    )
    return {"booking": serialize_booking(booking, db.get(Offering, booking.offering_id))}


@router.post("/bookings/{ref}/proof")
async def upload_proof(
    ref: str,
    request: Request,
    token: str = Form(min_length=10),
    file: UploadFile = File(...),
    tenant: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> dict:
    _limit(request, "proof")
    resolved = _tenant_or_404(db, request, tenant)
    settings = get_settings(db, resolved.id)
    payment = settings.payment_config or {}
    if not payment.get("merchant_webhook_url"):
        raise HTTPException(status_code=503, detail={"code": "proof_not_configured"})

    booking = db.scalar(
        select(Booking).where(
            Booking.tenant_id == resolved.id,
            Booking.booking_ref == ref.upper(),
            Booking.cancel_token == token,
        )
    )
    if not booking:
        raise HTTPException(status_code=404, detail={"code": "booking_not_found"})
    if booking.status not in ACTIVE_BOOKING_STATUSES:
        raise HTTPException(status_code=409, detail={"code": "cannot_upload_proof"})

    allowed = {"image/jpeg", "image/png", "image/webp", "application/pdf"}
    if file.content_type not in allowed:
        raise HTTPException(status_code=422, detail={"code": "unsupported_file"})
    content = await file.read(5 * 1024 * 1024 + 1)
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=413, detail={"code": "file_too_large"})
    if not content:
        raise HTTPException(status_code=422, detail={"code": "empty_file"})

    status, error = forward_to_merchant(
        settings,
        "booking.proof",
        {
            "booking_ref": booking.booking_ref,
            "filename": file.filename or "receipt",
            "content_type": file.content_type,
            "receipt_base64": base64.b64encode(content).decode("ascii"),
            "created_at": iso_utc(utcnow()),
        },
    )
    if status != "sent":
        raise HTTPException(status_code=502, detail={"code": "proof_forward_failed"})
    record_audit(
        db,
        resolved.id,
        "booking.proof_forwarded",
        "booking",
        booking.id,
        meta={"ref": booking.booking_ref},
    )
    return {"ok": True, "forwarded": status, "error": error}


@router.post("/leads", status_code=201)
def create_lead(
    payload: LeadCreate,
    request: Request,
    tenant: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> dict:
    if payload.website:
        raise HTTPException(status_code=400, detail={"code": "invalid_submission"})
    if not payload.consent:
        raise HTTPException(status_code=422, detail={"code": "consent_required"})
    if not is_valid_phone(payload.customer_phone):
        raise HTTPException(status_code=422, detail={"code": "invalid_phone"})
    _limit(request, "lead")

    resolved = _tenant_or_404(db, request, tenant)
    settings = get_settings(db, resolved.id)
    offering = None
    if payload.offering_slug:
        offering = db.scalar(
            select(Offering).where(
                Offering.tenant_id == resolved.id, Offering.slug == payload.offering_slug
            )
        )

    lead = Lead(
        tenant_id=resolved.id,
        lead_ref=_lead_ref(),
        display_name=payload.customer_name,
        contact_masked=mask_phone(payload.customer_phone),
        offering_id=offering.id if offering else None,
        summary_note=payload.message.strip(),
        locale=payload.locale,
        source="website_contact",
        status="new",
        consent_at=utcnow(),
        ip_hash=_ip_hash(_request_ip(request)),
    )
    db.add(lead)
    db.commit()

    forward_status, _ = forward_to_merchant(
        settings,
        "lead.created",
        {
            "lead_ref": lead.lead_ref,
            "customer_name": payload.customer_name,
            "customer_phone": normalize_phone(payload.customer_phone),
            "message": payload.message.strip(),
            "offering": _locale_text(offering.title, payload.locale) if offering else None,
            "locale": payload.locale,
            "created_at": iso_utc(lead.created_at),
        },
    )
    record_audit(
        db,
        resolved.id,
        "lead.created",
        "lead",
        lead.id,
        meta={"ref": lead.lead_ref, "forward": forward_status},
    )
    wa = (settings.contact or {}).get("whatsapp") or ""
    text = (
        f"你好 {_locale_text(settings.brand_name, 'zh')}，我的询问编号是 {lead.lead_ref}。\n{payload.message.strip()}"
        if payload.locale == "zh"
        else f"Hi {_locale_text(settings.brand_name, 'en')}, my inquiry ref is {lead.lead_ref}.\n{payload.message.strip()}"
    )
    return {
        "lead": {"ref": lead.lead_ref, "status": lead.status},
        "whatsapp_url": whatsapp_link(wa, text) if wa else "",
        "forwarded": forward_status,
    }
