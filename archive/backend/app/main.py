from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.gzip import GZipMiddleware
from fastapi.responses import FileResponse, HTMLResponse, PlainTextResponse, Response
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from . import seo
from .config import CORS_ORIGINS, FRONTEND_DIST
from .db import SessionLocal, get_db, init_db
from .routers import admin, public
from .seed import seed
from .services.tenant import site_bundle


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    db = SessionLocal()
    try:
        seed(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title="CoreSite MY — Klinik Pergigian Setapak",
    description="Multi-tenant website and appointment engine for Malaysian SMEs.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(GZipMiddleware, minimum_size=500, compresslevel=6)
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Booking-Token"],
)


@app.middleware("http")
async def security_headers(request, call_next):
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault(
        "Permissions-Policy", "camera=(), microphone=(), geolocation=()"
    )
    response.headers.setdefault(
        "Content-Security-Policy",
        "default-src 'self'; img-src 'self' data: blob: https:; "
        "style-src 'self' 'unsafe-inline'; script-src 'self'; "
        "font-src 'self' data:; connect-src 'self'; frame-src https://www.google.com https://maps.google.com; frame-ancestors 'none'; "
        "base-uri 'self'; form-action 'self'; object-src 'none'",
    )
    if (
        request.url.scheme == "https"
        or request.headers.get("x-forwarded-proto", "").lower() == "https"
    ):
        response.headers.setdefault(
            "Strict-Transport-Security", "max-age=31536000; includeSubDomains"
        )
    if request.url.path.startswith("/manage"):
        response.headers.setdefault("X-Robots-Tag", "noindex, nofollow")
    if request.url.path.startswith("/api/"):
        response.headers.setdefault("Cache-Control", "no-store")
    elif request.url.path.startswith("/assets/"):
        response.headers.setdefault(
            "Cache-Control", "public, max-age=31536000, immutable"
        )
    else:
        response.headers.setdefault("Cache-Control", "no-cache")
    return response


app.include_router(public.router)
app.include_router(admin.router)


@app.get("/api/health", tags=["meta"])
def health() -> dict:
    return {"status": "ok", "service": "coresite-my", "version": app.version}


# The HTML now differs per tenant, so shared caches must key on the host as well.
_VARY_TENANT = {"Vary": "Host, X-Forwarded-Host"}


@app.get("/robots.txt", include_in_schema=False)
def robots(request: Request, db: Session = Depends(get_db)) -> Response:
    tenant = seo.tenant_for_request(db, request)
    if not tenant:
        raise HTTPException(status_code=404)
    return PlainTextResponse(seo.robots_txt(seo.origin_for(db, tenant, request)))


@app.get("/sitemap.xml", include_in_schema=False)
def sitemap(request: Request, db: Session = Depends(get_db)) -> Response:
    tenant = seo.tenant_for_request(db, request)
    if not tenant:
        raise HTTPException(status_code=404)
    xml = seo.sitemap_xml(seo.origin_for(db, tenant, request), site_bundle(db, tenant))
    return Response(xml, media_type="application/xml")


if FRONTEND_DIST.exists():
    assets = FRONTEND_DIST / "assets"
    if assets.exists():
        app.mount("/assets", StaticFiles(directory=assets), name="assets")

    @app.api_route("/{full_path:path}", methods=["GET", "HEAD"], include_in_schema=False)
    def spa_fallback(full_path: str, request: Request, db: Session = Depends(get_db)):
        if full_path.startswith(("api/", "docs", "openapi.json")):
            raise HTTPException(status_code=404)
        candidate = (FRONTEND_DIST / full_path).resolve()
        dist_root = FRONTEND_DIST.resolve()
        if candidate.is_file() and dist_root in candidate.parents:
            return FileResponse(candidate)
        index = dist_root / "index.html"
        if not index.exists():
            raise HTTPException(status_code=404)
        shell = index.read_text(encoding="utf-8")
        tenant = seo.tenant_for_request(db, request)
        if not tenant:
            # Unknown host: the client shows its "unknown tenant" screen.
            return HTMLResponse(shell, status_code=404, headers=_VARY_TENANT)
        try:
            bundle = site_bundle(db, tenant)
            page = seo.render_index(
                shell, bundle, seo.origin_for(db, tenant, request), "/" + full_path
            )
        except Exception:
            # Never let a data problem turn the whole page into a 500. The plain shell
            # still loads and the client shows its own error state after its API call.
            logging.getLogger(__name__).exception("Could not render tenant head")
            return HTMLResponse(shell, headers=_VARY_TENANT)
        status = 200 if seo.is_known_path("/" + full_path, bundle) else 404
        return HTMLResponse(page, status_code=status, headers=_VARY_TENANT)
else:

    @app.get("/", include_in_schema=False)
    def api_root() -> dict:
        return {
            "service": "CoreSite MY",
            "message": "Frontend not built. Run `npm run build` in /frontend, or use the Vite dev server.",
            "docs": "/docs",
        }
