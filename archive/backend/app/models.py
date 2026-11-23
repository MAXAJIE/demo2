from __future__ import annotations

import uuid
from datetime import date, datetime, timezone

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    event,
    text,
)
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


def new_uuid() -> str:
    return str(uuid.uuid4())


def utcnow() -> datetime:
    """Naive UTC. SQLite stores naive timestamps; the API layer adds the tz."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


@event.listens_for(Engine, "connect")
def _sqlite_foreign_keys(dbapi_connection, _connection_record) -> None:
    if dbapi_connection.__class__.__module__.startswith("sqlite3"):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=utcnow, onupdate=utcnow, nullable=False
    )


class Tenant(Base, TimestampMixin):
    __tablename__ = "tenants"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    slug: Mapped[str] = mapped_column(String(80), unique=True, nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(20), default="active", nullable=False)
    plan: Mapped[str] = mapped_column(String(30), default="starter", nullable=False)

    settings: Mapped[SiteSettings | None] = relationship(
        back_populates="tenant", uselist=False, cascade="all, delete-orphan"
    )


class TenantDomain(Base):
    __tablename__ = "tenant_domains"

    hostname: Mapped[str] = mapped_column(String(255), primary_key=True)
    tenant_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class SiteSettings(Base, TimestampMixin):
    __tablename__ = "site_settings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    tenant_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )
    brand_name: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    preset_key: Mapped[str] = mapped_column(String(60), default="appointment", nullable=False)
    archetype: Mapped[str] = mapped_column(String(30), default="appointment", nullable=False)
    default_locale: Mapped[str] = mapped_column(String(8), default="en", nullable=False)
    locales: Mapped[list] = mapped_column(JSON, default=lambda: ["en", "ms"], nullable=False)
    timezone: Mapped[str] = mapped_column(String(60), default="Asia/Kuala_Lumpur")
    theme: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    features: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    labels: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    contact: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    booking_mode: Mapped[str] = mapped_column(String(20), default="approval", nullable=False)
    reminder_hours: Mapped[int] = mapped_column(Integer, default=24, nullable=False)
    checkout_mode: Mapped[str] = mapped_column(
        String(30), default="manual_qr_proof", nullable=False
    )
    payment_config: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    analytics: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    consent_text: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)

    tenant: Mapped[Tenant] = relationship(back_populates="settings")


class PageContent(Base, TimestampMixin):
    __tablename__ = "page_content"
    __table_args__ = (UniqueConstraint("tenant_id", "page", "section", name="uq_page_section"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    tenant_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    page: Mapped[str] = mapped_column(String(60), nullable=False)
    section: Mapped[str] = mapped_column(String(60), nullable=False)
    data: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    sort: Mapped[int] = mapped_column(Integer, default=0, nullable=False)


class Offering(Base, TimestampMixin):
    __tablename__ = "offerings"
    __table_args__ = (UniqueConstraint("tenant_id", "slug", name="uq_offering_slug"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    tenant_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    slug: Mapped[str] = mapped_column(String(120), nullable=False)
    kind: Mapped[str] = mapped_column(String(30), default="service", nullable=False)
    title: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    summary: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    body: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    price_cents: Mapped[int | None] = mapped_column(Integer, nullable=True)
    deposit_cents: Mapped[int | None] = mapped_column(Integer, nullable=True)
    currency: Mapped[str] = mapped_column(String(8), default="MYR", nullable=False)
    price_note: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    checkout_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_media_ids: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    attributes: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="draft", nullable=False)
    sort: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    seo: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)


class FaqItem(Base, TimestampMixin):
    __tablename__ = "faq_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    tenant_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    offering_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("offerings.id", ondelete="CASCADE"), nullable=True, index=True
    )
    question: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    answer: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    sort: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    published: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class AvailabilityRule(Base, TimestampMixin):
    __tablename__ = "availability_rules"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    tenant_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    offering_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("offerings.id", ondelete="CASCADE"), nullable=True, index=True
    )
    weekday: Mapped[int] = mapped_column(Integer, nullable=False)  # 0 = Sunday
    start_time: Mapped[str] = mapped_column(String(5), nullable=False)
    end_time: Mapped[str] = mapped_column(String(5), nullable=False)
    slot_minutes: Mapped[int] = mapped_column(Integer, default=45, nullable=False)
    buffer_minutes: Mapped[int] = mapped_column(Integer, default=15, nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class BlackoutDate(Base, TimestampMixin):
    __tablename__ = "blackout_dates"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    tenant_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    date_from: Mapped[date] = mapped_column(Date, nullable=False)
    date_to: Mapped[date] = mapped_column(Date, nullable=False)
    reason: Mapped[str | None] = mapped_column(String(200), nullable=True)


class Booking(Base, TimestampMixin):
    __tablename__ = "bookings"
    __table_args__ = (
        UniqueConstraint("tenant_id", "booking_ref", name="uq_booking_ref"),
        UniqueConstraint("cancel_token", name="uq_booking_cancel_token"),
        Index(
            "uq_booking_active_slot",
            "tenant_id",
            "starts_at",
            unique=True,
            sqlite_where=text("status IN ('pending','confirmed')"),
            postgresql_where=text("status IN ('pending','confirmed')"),
        ),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    tenant_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    booking_ref: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    offering_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("offerings.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    starts_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, index=True)
    ends_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False, index=True)
    customer_display_name: Mapped[str] = mapped_column(String(120), nullable=False)
    customer_contact_masked: Mapped[str] = mapped_column(String(40), nullable=False)
    amount_cents: Mapped[int | None] = mapped_column(Integer, nullable=True)
    deposit_cents: Mapped[int | None] = mapped_column(Integer, nullable=True)
    payment_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    locale: Mapped[str] = mapped_column(String(8), default="en", nullable=False)
    cancel_token: Mapped[str] = mapped_column(String(64), nullable=False)
    confirmed_by: Mapped[str | None] = mapped_column(String(36), nullable=True)
    reminder_sent_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    consent_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)


class Lead(Base, TimestampMixin):
    __tablename__ = "leads"
    __table_args__ = (UniqueConstraint("tenant_id", "lead_ref", name="uq_lead_ref"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    tenant_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    lead_ref: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    display_name: Mapped[str] = mapped_column(String(120), nullable=False)
    contact_masked: Mapped[str] = mapped_column(String(40), nullable=False)
    offering_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("offerings.id", ondelete="SET NULL"), nullable=True
    )
    summary_note: Mapped[str] = mapped_column(Text, nullable=False)
    locale: Mapped[str] = mapped_column(String(8), default="en", nullable=False)
    source: Mapped[str] = mapped_column(String(40), default="website", nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="new", nullable=False, index=True)
    internal_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    consent_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    ip_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)


class Staff(Base, TimestampMixin):
    __tablename__ = "staff"
    __table_args__ = (UniqueConstraint("tenant_id", "login_id", name="uq_staff_login"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    tenant_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    login_id: Mapped[str] = mapped_column(String(120), nullable=False)
    display_name: Mapped[str] = mapped_column(String(120), nullable=False)
    role: Mapped[str] = mapped_column(String(20), default="owner", nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class StaffSession(Base):
    __tablename__ = "staff_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    staff_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("staff.id", ondelete="CASCADE"), nullable=False, index=True
    )
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)


class AuditLog(Base):
    __tablename__ = "audit_log"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    tenant_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    actor_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    action: Mapped[str] = mapped_column(String(80), nullable=False)
    entity: Mapped[str] = mapped_column(String(60), nullable=False)
    entity_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    meta: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)


class EmailLog(Base):
    __tablename__ = "email_log"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_uuid)
    tenant_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    recipient_masked: Mapped[str] = mapped_column(String(120), nullable=False)
    template: Mapped[str] = mapped_column(String(60), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, nullable=False)
