"""Per-tenant HTML head, bootstrap data, robots.txt and sitemap.xml.

The frontend is a client-rendered SPA. Without this module every URL receives the
same static <head> and the first paint waits for an extra /api/v1/site round trip.
Here the server fills the shell for the tenant that owns the host:

* <title>, description, Open Graph tags and a canonical URL
* the site bundle as inline JSON (read by the frontend as react-query initialData)
* a real 404 status for paths the router does not know
"""
from __future__ import annotations

import html
import json
import re
from xml.sax.saxutils import escape as xml_escape

from fastapi import Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import Tenant, TenantDomain
from .services.tenant import resolve_tenant

# Public pages. Keep in step with <Route> paths in frontend/src/App.tsx.
STATIC_PAGES = frozenset(
    {"services", "book", "about", "doctors", "faq", "contact", "privacy", "terms"}
)
SITEMAP_PAGES = ("", "services", "about", "doctors", "faq", "contact", "book", "privacy", "terms")

_META_RH = re.compile(r'<meta\s+data-rh="true"[^>]*>\s*', re.DOTALL)
_TITLE = re.compile(r"<title>.*?</title>\s*", re.DOTALL)
_HTML_LANG = re.compile(r'<html lang="[^"]*"')
_ROOT = '<div id="root"></div>'

_OG_LOCALE = {"en": "en_MY", "ms": "ms_MY", "zh": "zh_MY"}
_HTML_LANG_TAG = {"en": "en", "ms": "ms", "zh": "zh-Hans"}


def tenant_for_request(db: Session, request: Request) -> Tenant | None:
    return resolve_tenant(
        db,
        host=request.headers.get("x-forwarded-host") or request.headers.get("host"),
        slug=request.query_params.get("tenant"),
    )


def origin_for(db: Session, tenant: Tenant, request: Request) -> str:
    """Canonical origin: the tenant's primary domain, else the host that was asked for."""
    primary = db.scalar(
        select(TenantDomain.hostname).where(
            TenantDomain.tenant_id == tenant.id, TenantDomain.is_primary.is_(True)
        )
    )
    if primary:
        return f"https://{primary}"
    scheme = request.headers.get("x-forwarded-proto") or request.url.scheme
    host = request.headers.get("x-forwarded-host") or request.headers.get("host") or ""
    return f"{scheme}://{host}"


def is_known_path(path: str, bundle: dict) -> bool:
    parts = [part for part in path.split("/") if part]
    if not parts:
        return True
    first = parts[0]
    if first == "manage":
        return True
    if len(parts) == 1:
        return first in STATIC_PAGES
    if len(parts) == 2 and first == "services":
        return parts[1] in {item["slug"] for item in bundle.get("offerings", [])}
    if len(parts) == 2 and first == "booking":
        return True
    return False


def _pick(value: dict | None, locale: str, fallback: str = "") -> str:
    value = value or {}
    return value.get(locale) or value.get("en") or fallback


def _json_for_script(data: dict) -> str:
    return (
        json.dumps(data, ensure_ascii=False, separators=(",", ":"))
        .replace("<", "\\u003c")
        .replace("\u2028", "\\u2028")
        .replace("\u2029", "\\u2029")
    )


def render_index(index_html: str, bundle: dict, origin: str, path: str) -> str:
    """Return the SPA shell with this tenant's head tags and bootstrap data."""
    site = bundle["site"]
    locale = site.get("default_locale") or "en"
    hero = (bundle.get("content", {}).get("home") or {}).get("hero") or {}
    brand = _pick(site.get("brand_name"), locale)
    # Same formula as PageMeta.tsx so the hydrated head matches what crawlers saw.
    title = f"{brand} · {_pick(hero.get('eyebrow'), locale, 'Johor Bahru')}"
    home = bundle.get("content", {}).get("home") or {}
    # A dedicated home.seo.description wins; older tenants fall back to the hero line.
    description = _pick((home.get("seo") or {}).get("description"), locale) or _pick(
        hero.get("spec_line"), locale
    )
    url = origin + ("/" + path.strip("/") if path.strip("/") else "/")
    image = f"{origin}/og.png"

    def meta(attr: str, key: str, content: str) -> str:
        return f'    <meta data-rh="true" {attr}="{key}" content="{html.escape(content, quote=True)}" />\n'

    head = (
        f"    <title>{html.escape(title)}</title>\n"
        + meta("name", "description", description)
        + meta("property", "og:type", "website")
        + meta("property", "og:site_name", brand)
        + meta("property", "og:title", title)
        + meta("property", "og:description", description)
        + meta("property", "og:url", url)
        + meta("property", "og:locale", _OG_LOCALE.get(locale, "en_MY"))
        + meta("property", "og:image", image)
        + meta("property", "og:image:width", "1200")
        + meta("property", "og:image:height", "630")
        + meta("property", "og:image:alt", brand)
        + meta("name", "twitter:card", "summary_large_image")
        + meta("name", "twitter:image", image)
        + f'    <link rel="canonical" href="{html.escape(url, quote=True)}" />\n'
    )

    out = _META_RH.sub("", index_html)
    out = _TITLE.sub("", out)
    out = out.replace("</head>", head + "  </head>", 1)
    out = _HTML_LANG.sub(f'<html lang="{_HTML_LANG_TAG.get(locale, "en")}"', out, count=1)
    data = f'<script id="__SITE__" type="application/json">{_json_for_script(bundle)}</script>'
    return out.replace(_ROOT, _ROOT + "\n    " + data, 1)


def robots_txt(origin: str) -> str:
    return (
        "User-agent: *\n"
        "Allow: /\n"
        "Disallow: /manage\n"
        "Disallow: /booking/\n"
        "Disallow: /api/\n"
        f"Sitemap: {origin}/sitemap.xml\n"
    )


def sitemap_xml(origin: str, bundle: dict) -> str:
    paths = ["/" + page if page else "/" for page in SITEMAP_PAGES]
    paths += [f"/services/{item['slug']}" for item in bundle.get("offerings", [])]
    urls = "".join(f"  <url><loc>{xml_escape(origin + path)}</loc></url>\n" for path in paths)
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls + "</urlset>\n"
    )
