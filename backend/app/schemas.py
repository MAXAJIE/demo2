from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class BookingCreate(BaseModel):
    offering_slug: str = Field(min_length=1, max_length=120)
    starts_at: datetime
    customer_name: str = Field(min_length=2, max_length=80)
    customer_phone: str = Field(min_length=8, max_length=30)
    locale: str = "en"
    consent: bool
    website: str = ""  # honeypot; must stay empty

    @field_validator("customer_name")
    @classmethod
    def clean_name(cls, value: str) -> str:
        return " ".join(value.split())

    @field_validator("locale")
    @classmethod
    def valid_locale(cls, value: str) -> str:
        return value if value in {"en", "ms", "zh"} else "en"


class CancelRequest(BaseModel):
    token: str = Field(min_length=10, max_length=128)


class ProofUploadMeta(BaseModel):
    token: str = Field(min_length=10, max_length=128)


class LeadCreate(BaseModel):
    customer_name: str = Field(min_length=2, max_length=80)
    customer_phone: str = Field(min_length=8, max_length=30)
    message: str = Field(min_length=5, max_length=1500)
    offering_slug: str | None = None
    locale: str = "en"
    consent: bool
    website: str = ""

    @field_validator("customer_name")
    @classmethod
    def clean_name(cls, value: str) -> str:
        return " ".join(value.split())

    @field_validator("locale")
    @classmethod
    def valid_locale(cls, value: str) -> str:
        return value if value in {"en", "ms", "zh"} else "en"


class AdminLogin(BaseModel):
    identifier: str = Field(min_length=3, max_length=120)
    password: str = Field(min_length=6, max_length=200)


class BookingUpdate(BaseModel):
    status: str | None = None
    payment_verified: bool | None = None

    @field_validator("status")
    @classmethod
    def valid_status(cls, value: str | None) -> str | None:
        allowed = {"pending", "confirmed", "declined", "cancelled"}
        if value is not None and value not in allowed:
            raise ValueError("invalid status")
        return value


class LeadUpdate(BaseModel):
    status: str | None = None
    internal_notes: str | None = Field(default=None, max_length=2000)

    @field_validator("status")
    @classmethod
    def valid_status(cls, value: str | None) -> str | None:
        allowed = {"new", "contacted", "closed"}
        if value is not None and value not in allowed:
            raise ValueError("invalid status")
        return value


class I18nUpdate(BaseModel):
    en: str | None = None
    zh: str | None = None


class OfferingUpdate(BaseModel):
    title: I18nUpdate | None = None
    summary: I18nUpdate | None = None
    price_cents: int | None = Field(default=None, ge=0, le=10_000_000)
    deposit_cents: int | None = Field(default=None, ge=0, le=10_000_000)
    price_note: I18nUpdate | None = None
    status: str | None = None

    @field_validator("status")
    @classmethod
    def valid_status(cls, value: str | None) -> str | None:
        if value is not None and value not in {"draft", "published"}:
            raise ValueError("invalid status")
        return value


class ContactUpdate(BaseModel):
    whatsapp: str | None = None
    phone: str | None = None
    email: str | None = None
    address_en: str | None = None
    address_zh: str | None = None
    map_url: str | None = None
    opening_hours_en: str | None = None
    opening_hours_zh: str | None = None
    closes_at: str | None = None


class PaymentUpdate(BaseModel):
    bank_name: str | None = None
    account_number: str | None = None
    account_holder: str | None = None
    qr_image_url: str | None = None
    merchant_webhook_url: str | None = None


class LabelsUpdate(BaseModel):
    offerings_plural_en: str | None = None
    offerings_plural_zh: str | None = None
    offerings_singular_en: str | None = None
    offerings_singular_zh: str | None = None
    book_cta_en: str | None = None
    book_cta_zh: str | None = None


class SettingsUpdate(BaseModel):
    brand_name: I18nUpdate | None = None
    contact: ContactUpdate | None = None
    payment_config: PaymentUpdate | None = None
    labels: LabelsUpdate | None = None
    theme_preset: str | None = None
    default_locale: str | None = None
    checkout_mode: str | None = None
    booking_mode: str | None = None
