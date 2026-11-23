from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./data/coresite.db")
DEFAULT_TENANT_SLUG = os.getenv("DEFAULT_TENANT_SLUG", "setapak-dental-jb")
CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
    ).split(",")
    if origin.strip()
]
ADMIN_SESSION_HOURS = int(os.getenv("ADMIN_SESSION_HOURS", "12"))
FORWARD_TIMEOUT_SECONDS = float(os.getenv("FORWARD_TIMEOUT_SECONDS", "6"))
BOOKING_LEAD_MINUTES = int(os.getenv("BOOKING_LEAD_MINUTES", "60"))
RATE_LIMIT_MAX = int(os.getenv("RATE_LIMIT_MAX", "20"))
RATE_LIMIT_WINDOW_MINUTES = int(os.getenv("RATE_LIMIT_WINDOW_MINUTES", "10"))
APP_ENV = os.getenv("APP_ENV", "development").strip().lower()
ADMIN_BOOTSTRAP_PASSWORD = os.getenv("ADMIN_BOOTSTRAP_PASSWORD", "")
BOOKING_RATE_LIMIT_MAX = int(os.getenv("BOOKING_RATE_LIMIT_MAX", "10"))
BOOKING_RATE_WINDOW_MINUTES = int(os.getenv("BOOKING_RATE_WINDOW_MINUTES", "60"))
TENANT_TIMEZONE = "Asia/Kuala_Lumpur"
FRONTEND_DIST = BASE_DIR.parent / "frontend" / "dist"
