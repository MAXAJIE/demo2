from __future__ import annotations

import re
from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

from ..config import TENANT_TIMEZONE

KL = ZoneInfo(TENANT_TIMEZONE)
UTC = timezone.utc

WEEKDAY_NAMES = {
    0: ("Sunday", "周日", "Ahad"),
    1: ("Monday", "周一", "Isnin"),
    2: ("Tuesday", "周二", "Selasa"),
    3: ("Wednesday", "周三", "Rabu"),
    4: ("Thursday", "周四", "Khamis"),
    5: ("Friday", "周五", "Jumaat"),
    6: ("Saturday", "周六", "Sabtu"),
}

WEEKDAY_SHORT = {
    0: ("Sun", "周日", "Ahd"),
    1: ("Mon", "周一", "Isn"),
    2: ("Tue", "周二", "Sel"),
    3: ("Wed", "周三", "Rab"),
    4: ("Thu", "周四", "Kha"),
    5: ("Fri", "周五", "Jum"),
    6: ("Sat", "周六", "Sab"),
}


def to_utc_naive(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt
    return dt.astimezone(UTC).replace(tzinfo=None)


def from_utc_naive(dt: datetime) -> datetime:
    return dt.replace(tzinfo=UTC)


def kl_now() -> datetime:
    return datetime.now(KL)


def kl_day_bounds(day: date) -> tuple[datetime, datetime]:
    start = datetime.combine(day, time.min, tzinfo=KL)
    return start, start + timedelta(days=1)


def parse_hhmm(value: str) -> time:
    hours, minutes = value.split(":")[:2]
    return time(int(hours), int(minutes))


def iso_utc(dt: datetime) -> str:
    return from_utc_naive(dt).isoformat().replace("+00:00", "Z")


def today_kl() -> date:
    return kl_now().date()


def weekday_of(day: date) -> int:
    # Python: Monday = 0. Product: Sunday = 0.
    return (day.weekday() + 1) % 7


def normalize_phone(raw: str) -> str:
    digits = re.sub(r"\D", "", raw or "")
    if digits.startswith("0"):
        digits = "6" + digits
    return digits


def is_valid_phone(raw: str) -> bool:
    """Malaysian mobiles plus Singapore and other international numbers."""
    digits = normalize_phone(raw)
    return bool(re.fullmatch(r"\d{9,15}", digits))


def is_valid_my_mobile(raw: str) -> bool:
    digits = normalize_phone(raw)
    return bool(re.fullmatch(r"60(1[0-9])\d{7,8}", digits))


def mask_phone(raw: str) -> str:
    digits = normalize_phone(raw)
    if len(digits) < 7:
        return "—"
    return f"{digits[:4]}***{digits[-3:]}"


def mask_email(raw: str) -> str:
    if not raw or "@" not in raw:
        return "—"
    local, domain = raw.split("@", 1)
    return f"{local[:1]}***@{domain}"


def format_slot_label(dt_utc: datetime, locale: str = "en") -> str:
    local = from_utc_naive(dt_utc).astimezone(KL)
    if locale == "zh":
        return local.strftime("%Y年%m月%d日 %H:%M")
    if locale == "ms":
        return local.strftime("%d/%m/%Y · %I:%M %p").replace(" 0", " ").replace("AM", "PG").replace("PM", "PTG")
    return local.strftime("%a, %d %b %Y · %I:%M %p").replace(" 0", " ")


def display_time(hhmm: str, locale: str = "en") -> str:
    """12-hour label for UI chrome, stored times stay 24h."""
    parsed = parse_hhmm(hhmm)
    if locale == "zh":
        return parsed.strftime("%H:%M")
    hour = parsed.hour % 12 or 12
    if locale == "ms":
        return f"{hour}:{parsed.minute:02d} {'PG' if parsed.hour < 12 else 'PTG'}"
    suffix = "AM" if parsed.hour < 12 else "PM"
    return f"{hour}:{parsed.minute:02d} {suffix}"
