# 08 Open questions and assumptions

## Resolved Decisions (Locked)
- **Database Tenancy (`D2`):** Single shared Supabase database with `tenant_id` isolation + hostname routing (`*.yourdomain.my` and custom domains).
- **M7 Setup Wizard:** Removed. Founder provisions new Malaysian SME tenants via SQL seed / super-admin script in <10 minutes.
- **MVP Languages:** English (`en`) + Bahasa Melayu (`ms`) + Simplified Chinese (`zh`), all three exposed in the switcher (owner decision, 2026-11-23). CJK fonts load on demand only when `zh` is active.
- **Zero-PII Compliance:** Sensitive customer details and payment receipt screenshots are forwarded via Edge Function webhook to the merchant's WhatsApp/Google Sheet and are NOT stored in Postgres.
- **Hosting (2026-11-23):** Static frontend on Cloudflare Pages with Pages Functions for head/SEO, robots/sitemap, Turnstile verification and webhooks. No backend server we host; data and auth in Supabase. Localhost runs the frontend alone through a local data adapter.
- **Admin access (2026-11-23):** two tiers — customer staff at `/manage`, platform owner at `/platform` — invite-only, public sign-up disabled, one-time expiring invite tokens. Design in `09-admin-access.md`.
- **Slot rules (2026-11-23):** last slot must end by closing time (anchored to opening time); `buffer_minutes` = 0. Pending bookings hold a slot for 10 minutes unless the WhatsApp message is marked sent; first booking wins (partial unique index), no multi-patient capacity.
- **Subdomain/domain:** not yet chosen; localhost now, canonical origin from `SITE_ORIGIN` or the request host.

## Open (owner to decide before/during build)
1. **Platform Root Domain (`VITE_ROOT_DOMAIN`):** Confirm the wildcard domain you will buy/use for client demos and subdomains (e.g., `yourstudio.my` or `pages.yourstudio.my`).
2. **M2 Merchant Proof Relay Target:** For `manual_qr_proof` in M2, confirm whether the Edge Function should relay order + receipt details to a **Make.com / Google Apps Script webhook URL** (configured per tenant in `site_settings.payment_config`) plus Resend email, alongside the customer's one-tap `wa.me` WhatsApp redirect.
3. **Carbon Navy exact hex** (`06-design-system.md`): Currently `#2B3140` paired with `#B8C7C0`. Confirm or adjust during M0.
4. **Super-Admin Bootstrap Email:** Provide the founder email address to seed into `platform_admins` in `supabase/seed.sql`.
5. **Doctor directory content:** Confirm the real doctor names, roles, bios, languages and portrait files. Dr. Lim and Dr. Karwitta Krishnan are named in existing Google reviews; Dr. Tan and Dr. Nabila and all bios are demo placeholders. Replace `doctors.intro.items` in `backend/app/seed.py` and the `/images/doctor-placeholder-*.svg` files before launch.

## Assumptions made (change if wrong)
- Default currency is `MYR` (`RM`), and default timezone is `Asia/Kuala_Lumpur`.
- Booking `approval` mode is active in Phase 1; `auto` confirm is schema-ready but UI-disabled until Phase 2.
- Four theme presets (`slate-mist`, `carbon-sage`, `crimson-pearl`, `sandalwood-plum`) and four universal business archetypes (`appointment`, `group_session`, `catalog_order`, `showcase_lead`) ship in Phase 1.


## Implementation status (2026-11-23)

- **Frontend-only:** the FastAPI service is archived; `scripts/serve-dist.mjs` serves the static build locally and Cloudflare Pages serves it in production.
- **Verified here:** the SQL layer (47 PGlite checks), the Pages Function SEO port (12 node tests, byte-identical to the old Python output), the local data adapter and the platform console (40 vitest tests), production builds in all three data-source modes.
- **Not verified here:** no live Supabase project (RPC JSON shapes trusted from the migrations; RLS exercised in PGlite with a shim), no real Pages deploy (`wrangler` routing and `ASSETS` behaviour rest on documented behaviour), no browser/headless smoke test (none installed), so the `/platform` console and invite claim were type-checked and unit-tested but not clicked through.
- **Known gaps to close before real bookings:** Turnstile verification, a trusted client IP for rate limiting (must come from a Pages Function proxy), payment proof upload (intentionally 501), platform-to-tenant switching (the console links to the public site instead), and the theme preset catalogue (only the current preset is exposed).
- **Canonical URLs** come from the requested host in the Pages Function; the tenant's primary domain is not yet preferred (set it when the clinic's domain exists).


## Admin-console roadmap decisions (2026-11-23, owner-approved)

- **Standalone admin site.** One shared backstage on its own host (e.g. admin.yourdomain.my) serving every tenant; login + account picks the workspace. `/manage` and `/platform` are removed from the tenant marketing site. New customer = one tenant row + one account (zero marginal cost).
- **Auto-confirm.** Every booking (online and front-desk) is written `status = confirmed` immediately; the approval hop is gone. `payment_verified` stays separate and is set later by the WhatsApp proof step. The 10-minute unsent hold is retired with the `pending` state.
- **Front-desk appointment.** Staff can add a booking for a caller (service -> day -> free slot -> name + phone) through a new `admin_create_booking` RPC that shares the first-booked-wins unique index; the system prepares the same WhatsApp confirmation link for staff to send.
- **Day schedule view.** One-day timeline of booked slots (time, name, service, status) plus the remaining free slots.
- **Services editor = step-by-step wizard** (Details EN/MS/ZH -> Pricing -> Image -> Review, Next/Preview/Submit) with cover + detail images cropped client-side to two fixed aspect ratios and uploaded to a Supabase Storage bucket.
- **Realtime communication.** Supabase Realtime on bookings/offerings/site_settings so the site and the admin calendar reflect each other live (slots, confirmations/cancellations, service and settings edits).
- **Premium admin theme.** The backstage gets its own dark premium theme (deep ink + gold/amber accent, proposed); tenant sites keep the current light theme.
- **Hidden dev console.** No nav link anywhere; `/platform` on the admin host is reachable only by the platform_admin account, which sees every workspace.
