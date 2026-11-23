# Klinik Pergigian Setapak — website & booking console

Bilingual (English / Bahasa Melayu) marketing site with a manual-confirmation booking flow and a small front-desk console. Built to the CoreSite MY multi-tenant MVP spec with one tenant (`setapak-dental-jb`).

- `backend/` — FastAPI + SQLAlchemy + SQLite
- `frontend/` — React 18 + TypeScript + Vite + Tailwind
- `docs/` — product, data-model and design specs

## Run locally

Prerequisites: Node 20+, Python 3.12+.

### Backend

```powershell
cd backend
python -m venv .venv
.venv/Scripts/pip install -r requirements.txt
copy .env.example .env
.venv/Scripts/python -m uvicorn app.main:app --host 127.0.0.1 --port 8011
```

On macOS/Linux use `.venv/bin/pip`, `.venv/bin/python` and `cp .env.example .env`.

The database (`backend/data/coresite.db`) is created and seeded on first startup.

### Frontend (development)

```bash
cd frontend
npm install
npm run dev
```

Open `http://127.0.0.1:5173`. Vite proxies `/api` to `127.0.0.1:8011`.

### Production build

```bash
cd frontend
npm run build
```

FastAPI serves `frontend/dist` on `http://127.0.0.1:8011`, including SPA deep links (`/services/...`, `/book`, `/booking/:ref`, `/manage/...`).

## Access

- Site: `http://127.0.0.1:8011/`
- Front desk: `http://127.0.0.1:8011/manage`
- Demo login: `60177410100` / `demo1234`

Change the demo password before any public deployment. The login hint is only rendered by the Vite dev server.

## Intentionally blank settings

These were not supplied by the clinic, so they are empty in `seed.py` and the settings console:

| Field | Effect while blank |
| --- | --- |
| Contact email | No email address is shown or used |
| `bank_name`, `account_number`, `account_holder` | No bank transfer details are shown |
| `qr_image_url` | No DuitNow QR is displayed |
| `merchant_webhook_url` | Booking/lead payloads are not forwarded; “未设置转发” is shown in settings |

While payment details are blank, the confirmation page directs the customer to send the booking reference through WhatsApp, and the front desk confirms the slot manually. Filling the payment fields enables the manual QR/receipt-proof flow; setting the webhook enables forwarding of full contact payloads (the database itself stays zero-PII, storing only masked contacts).

## Data & privacy notes

- Full phone numbers and form payloads are not stored. Bookings keep a display name, a masked contact and an opaque cancel token.
- `FRONTEND_DIST` in `backend/app/config.py` points at `frontend/dist`; rebuild the frontend after editing it.
- The tenant is resolved from the hostname, or `?tenant=setapak-dental-jb` when using localhost.
- Content, hours, services and copy live in `backend/app/seed.py` and are editable in the front-desk console after seeding.
- Source copy is dated 19 November 2026 and uses the clinic’s public Google rating (4.8★, 850+ reviews) without invented testimonials.
- Landing palette: cool paper `#F2F5F9`, ink blue `#1E4E79`, structure `#102A43`; Newsreader / Noto Serif SC for display, Manrope / Noto Sans SC for body. The full-bleed hero, hours graph, review carousel, direction-aware service cards and services float bar are described in `docs/CHANGELOG.md`.
- No clinic, team or treatment photographs were supplied. The build deliberately contains no stock photography; the OG card is generated from the live palette and the map uses the official Google Maps embed. Add real images to `frontend/public/images/` when available.

## Checks

```bash
cd frontend
npm run typecheck
npm run lint
npm test
npm run build
```
