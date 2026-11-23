# Klinik Pergigian Setapak — website & booking console

Marketing site with a manual-confirmation booking flow, a front-desk console and an
owner console. Built to the CoreSite MY multi-tenant spec, currently for one tenant
(`setapak-dental-jb`), in English, Bahasa Melayu and Simplified Chinese.

**Frontend-only deploy.** The browser runs a static SPA; data and auth live in
Supabase (Postgres + RLS + auth) and the few server-side bits are Cloudflare Pages
Functions deployed with the site. There is no backend service to host.

- `frontend/` — React 18 + TypeScript + Vite + Tailwind (the only deployable)
- `supabase/migrations/` — schema, RLS policies, RPCs and the generated demo seed
- `functions/` — Cloudflare Pages Functions: per-tenant HTML head, `robots.txt`, `sitemap.xml`, 404/HEAD
- `tests/` — `tests/sql` (PGlite) and `tests/functions` (node:test)
- `scripts/` — bundle/seed generators, local static server
- `docs/` — product, data-model, design, admin-access and deploy specs
- `archive/backend/` — the retired FastAPI + SQLite implementation, kept for reference only

## Run locally

Prerequisites: Node 20+ (Node 26 recommended). No Python and no database server.

```bash
cd frontend
npm install
npm run dev            # http://127.0.0.1:5173
```

That is the whole app: the bundled demo seed plus `localStorage`, no backend at all.

| Data source | How to select it | What it talks to |
|---|---|---|
| `local` (default without configuration) | `npm run dev` | bundled seed + localStorage |
| `supabase` (default when configured) | set `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` | your Supabase project |
| `rest` | `VITE_DATA_SOURCE=rest npm run dev` | the archived FastAPI demo, if you start it |

### Access

| Surface | URL | Login |
|---|---|---|
| Site | `/` | — |
| Front desk | `/manage` | `owner@demo.local` / `demo1234` (local demo only) |
| Owner console | `/platform` | same demo account locally; a Supabase account listed in `platform_admins` in production |
| Booking link | `/booking/<ref>#token=…` | the token is in the link |

Staff accounts are **invite-only**: there is no sign-up page. The owner mints a
one-time invite in `/platform` (email + role), sends the link, and the invite works
once, for that email, within 72 hours. See `docs/09-admin-access.md`.

## Build and serve

```bash
cd frontend
npm run build                                   # -> frontend/dist
node ../scripts/serve-dist.mjs dist 8011        # local static server with SPA fallback
```

Deployment (Cloudflare Pages + Supabase) is in `docs/10-deploy.md`. In production
the Pages Functions provide the per-tenant `<head>`, `robots.txt`, `sitemap.xml` and
real 404 statuses; a plain static server serves the shell only.

## Checks

```bash
cd frontend
npm run typecheck
npm run lint
npm test                     # vitest, 40 tests
npm run build
cd ..
npm run test:sql             # PGlite: schema, RLS, bookings, invites (47 checks)
node --test tests/functions  # SEO parity (12 tests)
```

## Data and privacy

- Full phone numbers are not stored. Bookings keep a display name, a masked contact
  (`6012***789`) and an opaque 32-character token; only its sha256 hash is in the
  database.
- Content, hours, services and copy live in the seed (`supabase/migrations/0005_seed.sql`,
  generated from `frontend/src/content/setapak.bundle.json`) and are editable in the
  front-desk console.
- The tenant is resolved from the `Host` header (`resolve_tenant_by_host`); on
  localhost the seeded `localhost` domain row resolves the demo tenant.
- Source copy is dated 19 November 2026 and uses the clinic's public Google rating
  (4.8★, 850+ reviews) without invented testimonials.
- Landing palette: cool paper `#F2F5F9`, ink blue `#1E4E79`, structure `#102A43`;
  Newsreader / Noto Serif SC for display, Manrope / Noto Sans SC for body. CJK fonts
  load on demand only when Chinese is selected.
- No clinic, team or treatment photographs were supplied. The build deliberately
  contains no stock photography; the OG card is generated from the live palette and
  the map uses the official Google Maps embed. Add real images to
  `frontend/public/images/` when available.

## Intentionally blank settings

These were not supplied by the clinic, so they are empty in the seed and the
settings console:

| Field | Effect while blank |
| --- | --- |
| Contact email | No email address is shown or used |
| `bank_name`, `account_number`, `account_holder` | No bank transfer details are shown |
| `qr_image_url` | No DuitNow QR is displayed |
| `merchant_webhook_url` | Booking/lead payloads are not forwarded |

While payment details are blank, the confirmation page directs the customer to send
the booking reference through WhatsApp, and the front desk confirms the slot
manually.
