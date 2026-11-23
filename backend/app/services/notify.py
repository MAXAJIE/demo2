from __future__ import annotations

from urllib.parse import quote

import httpx

from ..config import FORWARD_TIMEOUT_SECONDS
from ..models import AuditLog, SiteSettings
from .time_utils import mask_phone, normalize_phone


def whatsapp_link(number: str, message: str) -> str:
    digits = normalize_phone(number)
    return f"https://wa.me/{digits}?text={quote(message)}"


def forwarding_status(settings: SiteSettings) -> str:
    url = (settings.payment_config or {}).get("merchant_webhook_url")
    return "configured" if url else "not_configured"


def forward_to_merchant(
    settings: SiteSettings, event: str, payload: dict
) -> tuple[str, str | None]:
    """Relay sensitive payloads to the merchant. Never persists them here."""
    url = (settings.payment_config or {}).get("merchant_webhook_url")
    if not url:
        return "not_configured", None
    try:
        response = httpx.post(
            url,
            json={"event": event, "sent_at": payload.get("created_at"), "data": payload},
            headers={"X-CoreSite-Event": event, "User-Agent": "CoreSite-MY/1.0"},
            timeout=FORWARD_TIMEOUT_SECONDS,
        )
        if response.status_code >= 300:
            return "failed", f"HTTP {response.status_code}"
        return "sent", None
    except httpx.HTTPError as exc:
        return "failed", exc.__class__.__name__


def record_audit(
    db,
    tenant_id: str,
    action: str,
    entity: str,
    entity_id: str | None = None,
    actor_id: str | None = None,
    meta: dict | None = None,
) -> None:
    db.add(
        AuditLog(
            tenant_id=tenant_id,
            actor_id=actor_id,
            action=action,
            entity=entity,
            entity_id=entity_id,
            meta=meta or {},
        )
    )
    db.commit()


def booking_message(
    brand: str, ref: str, service: str, when: str, name: str, phone: str, locale: str
) -> str:
    if locale == "zh":
        return (
            f"你好 {brand}，我想确认预约。\n"
            f"预约编号：{ref}\n"
            f"服务：{service}\n"
            f"时间：{when}\n"
            f"姓名：{name}\n"
            f"联络号码：{phone}\n\n"
            "请确认这个时段，谢谢。"
        )
    return (
        f"Hi {brand}, I'd like to confirm this appointment.\n"
        f"Booking ref: {ref}\n"
        f"Service: {service}\n"
        f"Time: {when}\n"
        f"Name: {name}\n"
        f"Phone: {phone}\n\n"
        "Please confirm the slot. Thank you."
    )


def masked_contact(phone: str) -> str:
    return mask_phone(phone)
