from __future__ import annotations

from datetime import date, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import BOOKING_LEAD_MINUTES, DEFAULT_TENANT_SLUG, TENANT_TIMEZONE
from ..models import (
    AvailabilityRule,
    BlackoutDate,
    Booking,
    FaqItem,
    Offering,
    PageContent,
    SiteSettings,
    Tenant,
    TenantDomain,
    utcnow,
)
from ..theme import resolve_theme
from ..translations_ms import with_ms
from .time_utils import (
    KL,
    UTC,
    WEEKDAY_NAMES,
    WEEKDAY_SHORT,
    display_time,
    from_utc_naive,
    iso_utc,
    parse_hhmm,
    to_utc_naive,
    today_kl,
    weekday_of,
)

ACTIVE_BOOKING_STATUSES = ("pending", "confirmed")


def normalize_host(host: str | None) -> str:
    if not host:
        return ""
    return host.split(":")[0].strip().lower().rstrip(".")


def resolve_tenant(db: Session, host: str | None = None, slug: str | None = None) -> Tenant | None:
    if slug:
        return db.scalar(
            select(Tenant).where(Tenant.slug == slug.strip().lower(), Tenant.status == "active")
        )

    hostname = normalize_host(host)
    if hostname:
        domain = db.scalar(select(TenantDomain).where(TenantDomain.hostname == hostname))
        if domain:
            tenant = db.get(Tenant, domain.tenant_id)
            if tenant and tenant.status == "active":
                return tenant

        if hostname.endswith(".localhost"):
            sub = hostname[:-len(".localhost")]
            tenant = db.scalar(select(Tenant).where(Tenant.slug == sub, Tenant.status == "active"))
            if tenant:
                return tenant

    if hostname in {"", "localhost", "127.0.0.1", "0.0.0.0"}:
        return db.scalar(
            select(Tenant).where(
                Tenant.slug == DEFAULT_TENANT_SLUG, Tenant.status == "active"
            )
        )
    return None


def get_settings(db: Session, tenant_id: str) -> SiteSettings:
    settings = db.scalar(select(SiteSettings).where(SiteSettings.tenant_id == tenant_id))
    if not settings:
        raise LookupError("site settings missing")
    return settings


def public_payment_config(config: dict | None) -> dict:
    config = config or {}
    return {
        "bank_name": config.get("bank_name") or "",
        "account_number": config.get("account_number") or "",
        "account_holder": config.get("account_holder") or "",
        "qr_image_url": config.get("qr_image_url") or "",
        "configured": bool(
            config.get("qr_image_url")
            or (config.get("bank_name") and config.get("account_number"))
        ),
    }


def serialize_offering(offering: Offering) -> dict:
    attributes = offering.attributes or {}
    return with_ms({
        "id": offering.id,
        "slug": offering.slug,
        "kind": offering.kind,
        "title": offering.title or {},
        "summary": offering.summary or {},
        "body": offering.body or {},
        "price_cents": offering.price_cents,
        "deposit_cents": offering.deposit_cents,
        "currency": offering.currency,
        "price_note": offering.price_note or {},
        "attributes": attributes,
        "duration_min": attributes.get("duration_min"),
        "status": offering.status,
        "sort": offering.sort,
    })


def serialize_booking(booking: Booking, offering: Offering | None, include_token: bool = False) -> dict:
    payload = {
        "ref": booking.booking_ref,
        "status": booking.status,
        "starts_at": iso_utc(booking.starts_at),
        "ends_at": iso_utc(booking.ends_at),
        "customer_name": booking.customer_display_name,
        "customer_contact_masked": booking.customer_contact_masked,
        "deposit_cents": booking.deposit_cents,
        "amount_cents": booking.amount_cents,
        "payment_verified": booking.payment_verified,
        "locale": booking.locale,
        "offering": serialize_offering(offering) if offering else None,
    }
    if include_token:
        payload["cancel_token"] = booking.cancel_token
    return payload


def serialize_lead(lead) -> dict:
    return {
        "id": lead.id,
        "ref": lead.lead_ref,
        "name": lead.display_name,
        "contact_masked": lead.contact_masked,
        "message": lead.summary_note,
        "status": lead.status,
        "locale": lead.locale,
        "source": lead.source,
        "internal_notes": lead.internal_notes or "",
        "created_at": iso_utc(lead.created_at),
    }


def _rules_by_weekday(db: Session, tenant_id: str, offering_id: str | None) -> dict[int, list]:
    rules = db.scalars(
        select(AvailabilityRule)
        .where(AvailabilityRule.tenant_id == tenant_id, AvailabilityRule.active.is_(True))
        .order_by(AvailabilityRule.start_time)
    ).all()
    scoped: dict[int, list[AvailabilityRule]] = {}
    for rule in rules:
        if rule.offering_id and rule.offering_id != offering_id:
            continue
        scoped.setdefault(rule.weekday, []).append(rule)
    return scoped


def _booked_intervals(
    db: Session, tenant_id: str, start: date, end: date
) -> list[tuple[datetime, datetime]]:
    day_start = to_utc_naive(datetime.combine(start, datetime.min.time(), tzinfo=KL))
    day_end = to_utc_naive(
        datetime.combine(end + timedelta(days=1), datetime.min.time(), tzinfo=KL)
    )
    rows = db.scalars(
        select(Booking).where(
            Booking.tenant_id == tenant_id,
            Booking.status.in_(ACTIVE_BOOKING_STATUSES),
            Booking.starts_at >= day_start,
            Booking.starts_at < day_end,
        )
    ).all()
    return [(row.starts_at, row.ends_at) for row in rows]


def _blackout_days(db: Session, tenant_id: str, start: date, end: date) -> set[date]:
    rows = db.scalars(
        select(BlackoutDate).where(
            BlackoutDate.tenant_id == tenant_id,
            BlackoutDate.date_from <= end,
            BlackoutDate.date_to >= start,
        )
    ).all()
    blocked: set[date] = set()
    for row in rows:
        cursor = max(row.date_from, start)
        last = min(row.date_to, end)
        while cursor <= last:
            blocked.add(cursor)
            cursor += timedelta(days=1)
    return blocked


def generate_slots(
    rules: list[AvailabilityRule],
    day: date,
    now_utc: datetime,
    booked: list[tuple[datetime, datetime]],
    duration_minutes: int | None = None,
) -> list[datetime]:
    """Return naive-UTC start times for one local day."""
    slots: list[datetime] = []
    cutoff = now_utc + timedelta(minutes=BOOKING_LEAD_MINUTES)
    for rule in rules:
        cursor = datetime.combine(day, parse_hhmm(rule.start_time), tzinfo=KL)
        last_start = datetime.combine(day, parse_hhmm(rule.end_time), tzinfo=KL)
        if last_start < cursor:
            continue
        step = timedelta(
            minutes=max(int(rule.slot_minutes or 45), int(duration_minutes or 0))
        )
        length = timedelta(minutes=duration_minutes or rule.slot_minutes or 45)
        # Anchor the grid to the last appointment so it is offered exactly at the
        # clinic's stated cut-off (22:30), even when the treatment length does not
        # divide the opening window evenly.
        steps = int((last_start - cursor).total_seconds() // step.total_seconds())
        cursor = last_start - steps * step
        while cursor <= last_start:
            slot_utc = to_utc_naive(cursor)
            slot_end = slot_utc + length
            overlaps = any(
                slot_utc < booked_end and slot_end > booked_start
                for booked_start, booked_end in booked
            )
            if slot_utc > cutoff and not overlaps:
                slots.append(slot_utc)
            cursor += step
    return sorted(set(slots))


def slot_days(
    db: Session,
    tenant_id: str,
    days: int = 14,
    offering_id: str | None = None,
    duration_minutes: int | None = None,
) -> list[dict]:
    days = max(1, min(days, 30))
    start = today_kl()
    end = start + timedelta(days=days - 1)
    rules = _rules_by_weekday(db, tenant_id, offering_id)
    booked = _booked_intervals(db, tenant_id, start, end)
    blocked = _blackout_days(db, tenant_id, start, end)
    now = utcnow()

    result: list[dict] = []
    for offset in range(days):
        day = start + timedelta(days=offset)
        weekday = weekday_of(day)
        day_rules = [] if day in blocked else rules.get(weekday, [])
        day_slots = generate_slots(day_rules, day, now, booked, duration_minutes)
        result.append(
            {
                "date": day.isoformat(),
                "weekday": weekday,
                "weekday_label": {
                    "en": WEEKDAY_SHORT[weekday][0],
                    "zh": WEEKDAY_SHORT[weekday][1],
                    "ms": WEEKDAY_SHORT[weekday][2],
                },
                "weekday_name": {
                    "en": WEEKDAY_NAMES[weekday][0],
                    "zh": WEEKDAY_NAMES[weekday][1],
                    "ms": WEEKDAY_NAMES[weekday][2],
                },
                "slots": [
                    {
                        "starts_at": iso_utc(slot),
                        "time": from_utc_naive(slot).astimezone(KL).strftime("%H:%M"),
                    }
                    for slot in day_slots
                ],
            }
        )
    return result


def weekly_schedule(
    db: Session, tenant_id: str, locale: str = "en", close_time: str = "23:00"
) -> list[dict]:
    rules = _rules_by_weekday(db, tenant_id, None)
    ordered = [1, 2, 3, 4, 5, 6, 0]
    output = []
    for weekday in ordered:
        day_rules = rules.get(weekday, [])
        if not day_rules:
            output.append(
                {
                    "weekday": weekday,
                    "label": {
                        "en": WEEKDAY_NAMES[weekday][0],
                        "zh": WEEKDAY_NAMES[weekday][1],
                        "ms": WEEKDAY_NAMES[weekday][2],
                    },
                    "closed": True,
                    "hours": "",
                }
            )
            continue
        first = min(rule.start_time for rule in day_rules)
        last = max(rule.end_time for rule in day_rules)
        output.append(
            {
                "weekday": weekday,
                "label": {
                    "en": WEEKDAY_NAMES[weekday][0],
                    "zh": WEEKDAY_NAMES[weekday][1],
                    "ms": WEEKDAY_NAMES[weekday][2],
                },
                "closed": False,
                "start": first,
                "end": last,
                "hours": f"{display_time(first, locale)} – {display_time(close_time, locale)}",
            }
        )
    return output


def site_bundle(db: Session, tenant: Tenant) -> dict:
    settings = get_settings(db, tenant.id)
    theme = resolve_theme(settings.theme)
    content_rows = db.scalars(
        select(PageContent).where(PageContent.tenant_id == tenant.id).order_by(PageContent.sort)
    ).all()
    content: dict[str, dict] = {}
    for row in content_rows:
        content.setdefault(row.page, {})[row.section] = row.data

    offerings = db.scalars(
        select(Offering)
        .where(Offering.tenant_id == tenant.id, Offering.status == "published")
        .order_by(Offering.sort)
    ).all()
    faq = db.scalars(
        select(FaqItem)
        .where(FaqItem.tenant_id == tenant.id, FaqItem.published.is_(True))
        .order_by(FaqItem.sort)
    ).all()

    next_slots: list[dict] = []
    for day in slot_days(db, tenant.id, days=14)[:14]:
        for slot in day["slots"]:
            next_slots.append(
                {
                    "date": day["date"],
                    "starts_at": slot["starts_at"],
                    "time": slot["time"],
                }
            )
            if len(next_slots) >= 3:
                break
        if len(next_slots) >= 3:
            break

    contact = dict(settings.contact or {})
    close_time = contact.get("closes_at") or "23:00"

    return {
        "tenant": {"id": tenant.id, "slug": tenant.slug, "status": tenant.status},
        "site": {
            "brand_name": with_ms(settings.brand_name or {}),
            "archetype": settings.archetype,
            "default_locale": settings.default_locale,
            "locales": settings.locales or ["en"],
            "timezone": settings.timezone,
            "theme": theme,
            "features": settings.features or {},
            "labels": with_ms(settings.labels or {}),
            "contact": with_ms(contact),
            "booking_mode": settings.booking_mode,
            "checkout_mode": settings.checkout_mode,
            "payment": public_payment_config(settings.payment_config),
            "consent_text": with_ms(settings.consent_text or {}),
        },
        "content": with_ms(content),
        "offerings": [with_ms(serialize_offering(item)) for item in offerings],
        "faq": [
            {
                "id": item.id,
                "question": with_ms(item.question),
                "answer": with_ms(item.answer),
                "offering_id": item.offering_id,
            }
            for item in faq
        ],
        "schedule": weekly_schedule(db, tenant.id, close_time=close_time),
        "next_slots": next_slots,
        "server_time": iso_utc(utcnow()),
    }
