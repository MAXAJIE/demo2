from datetime import date, timedelta

import pytest

from app import seo
from app.config import FRONTEND_DIST
from app.seed import bootstrap_password
from app.translations_ms import with_ms

LEAD = {
    "customer_name": "Test Patient",
    "customer_phone": "0123456789",
    "message": "Enquiry about scaling",
    "consent": True,
    "locale": "en",
}


# --- Malay content -----------------------------------------------------------------
def test_with_ms_keeps_a_stored_malay_string():
    out = with_ms({"en": "Open until 11 PM", "ms": "Dibuka hingga 11 malam (diubah klinik)"})
    assert out["ms"] == "Dibuka hingga 11 malam (diubah klinik)"


def test_with_ms_fills_a_missing_or_empty_malay_string():
    assert with_ms({"en": "Book a slot"})["ms"]
    assert with_ms({"en": "Book a slot", "ms": ""})["ms"]
    # unknown English falls back to English rather than raising
    assert with_ms({"en": "Never translated", "ms": ""})["ms"] == "Never translated"


# --- Bootstrap password --------------------------------------------------------------
def test_production_refuses_the_demo_password():
    with pytest.raises(RuntimeError):
        bootstrap_password("production", "")
    with pytest.raises(RuntimeError):
        bootstrap_password("production", "short")
    assert bootstrap_password("production", "a-long-enough-secret") == "a-long-enough-secret"


def test_development_keeps_the_demo_password():
    assert bootstrap_password("development", "") == "demo1234"
    assert bootstrap_password("development", "mine") == "mine"


def test_seeded_staff_can_log_in_in_development(client):
    ok = client.post("/api/v1/admin/login", json={"identifier": "60177410100", "password": "demo1234"})
    assert ok.status_code == 200


# --- Rate limiting -------------------------------------------------------------------
def test_rate_limit_ignores_a_spoofed_forwarded_for(client):
    codes = [
        client.post(
            "/api/v1/leads", json=LEAD, headers={"X-Forwarded-For": f"10.9.8.{i}"}
        ).status_code
        for i in range(24)
    ]
    assert codes[:20] == [201] * 20
    assert set(codes[20:]) == {429}


# --- Slot grid -------------------------------------------------------------------------
def _days(client, offering="scaling-polishing-checkup"):
    res = client.get(f"/api/v1/availability?offering={offering}&days=21")
    assert res.status_code == 200
    body = res.json()
    return body.get("days", body)


def test_slot_grid_is_anchored_to_the_last_appointment(client):
    by_weekday = {}
    for day in _days(client)[2:]:  # skip today/tomorrow: lead time can trim them
        weekday = date.fromisoformat(day["date"]).weekday()  # Mon=0
        if day["slots"]:
            by_weekday[weekday] = (day["slots"][0]["time"], day["slots"][-1]["time"])
    assert by_weekday[0] == ("12:00", "22:30")  # Monday opens 12:00
    assert by_weekday[3] == ("14:15", "22:30")  # Thursday opens 14:00, grid starts 14:15
    assert by_weekday[6] == ("10:30", "22:30")  # Sunday opens 10:00, grid starts 10:30


# --- SEO -----------------------------------------------------------------------------
def test_robots_and_sitemap(client):
    robots = client.get("/robots.txt")
    assert robots.status_code == 200
    assert robots.headers["content-type"].startswith("text/plain")
    assert "Disallow: /manage" in robots.text and "Sitemap:" in robots.text

    sitemap = client.get("/sitemap.xml")
    assert sitemap.status_code == 200
    assert "xml" in sitemap.headers["content-type"]
    assert "/services/scaling-polishing-checkup" in sitemap.text
    assert "/doctors" in sitemap.text


def test_render_index_fills_head_and_escapes_inline_json():
    shell = (
        '<html lang="en"><head><meta data-rh="true" name="description" content="old" />'
        "<title>old</title></head><body><div id=\"root\"></div></body></html>"
    )
    bundle = {
        "site": {"brand_name": {"en": "A <b> & Co"}, "default_locale": "en"},
        "content": {"home": {"hero": {"eyebrow": {"en": "Johor Bahru"}, "spec_line": {"en": "d"}}}},
        "offerings": [],
        "evil": "</script><script>alert(1)</script>",
    }
    out = seo.render_index(shell, bundle, "https://example.my", "/about")
    assert "<title>A &lt;b&gt; &amp; Co · Johor Bahru</title>" in out
    assert 'rel="canonical" href="https://example.my/about"' in out
    assert 'content="old"' not in out
    assert "</script><script>alert(1)" not in out
    assert 'id="__SITE__"' in out


@pytest.mark.skipif(not (FRONTEND_DIST / "index.html").exists(), reason="frontend not built")
def test_spa_routes_return_real_status_codes(client):
    home = client.get("/")
    assert home.status_code == 200
    assert 'rel="canonical"' in home.text and 'id="__SITE__"' in home.text
    assert client.get("/services/scaling-polishing-checkup").status_code == 200
    assert client.get("/doctors").status_code == 200  # in the header nav, must not 404
    assert client.get("/manage/bookings").status_code == 200
    assert client.get("/does-not-exist").status_code == 404
    assert client.get("/services/does-not-exist").status_code == 404
    assert client.head("/").status_code == 200
    assert "Host" in home.headers["vary"]


def test_head_description_prefers_seo_over_the_hero_line():
    shell = '<html lang="en"><head><title>x</title></head><body><div id="root"></div></body></html>'
    base = {
        "site": {"brand_name": {"en": "B"}, "default_locale": "en"},
        "content": {"home": {"hero": {"spec_line": {"en": "hero line"}}}},
        "offerings": [],
    }
    assert 'content="hero line"' in seo.render_index(shell, base, "https://x.my", "/")
    base["content"]["home"]["seo"] = {"description": {"en": "Plain sentence for search results."}}
    assert 'content="Plain sentence for search results."' in seo.render_index(shell, base, "https://x.my", "/")


@pytest.mark.skipif(not (FRONTEND_DIST / "index.html").exists(), reason="frontend not built")
def test_a_data_error_still_serves_the_plain_shell(client, monkeypatch):
    import app.main as main

    def boom(*_args, **_kwargs):
        raise RuntimeError("database unavailable")

    monkeypatch.setattr(main, "site_bundle", boom)
    page = client.get("/")
    assert page.status_code == 200
    assert 'id="__SITE__"' not in page.text
    assert 'id="root"' in page.text
