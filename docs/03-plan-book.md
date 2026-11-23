# 03 Plan book (Malaysia fast-track work order)

Build in strict milestone order. Do not start a milestone until the previous one passes its acceptance criteria. *(Note: Original M7 self-serve setup wizard is permanently removed; new tenants are onboarded via SQL seed / super-admin).*

## M0 Foundation & Multi-Tenant Shell
Vite/TS/Tailwind/shadcn scaffold, lint/format, CI, Supabase local config, env handling, routing shell, `TenantProvider` (resolves tenant via `window.location.hostname` or `?tenant=` dev query), i18n skeleton (`en` + `zh` with automatic fallback), **theme token system** (CSS variables), **label token system** (configurable domain nouns), self-hosted fonts (`Manrope`, `Inter`, `Noto Sans SC`), SPA fallback configs.
**Accept:** `npm run build` passes; switching `?tenant=demo-a` vs `?tenant=demo-b` changes brand, colors, fonts, language (`en`/`zh`), and domain labels everywhere; zero hardcoded vertical nouns or colors in components.

## M1 Multi-Tenant Data, Auth & RLS Isolation
Migrations for all multi-tenant tables in `05-data-model.md` (`tenants`, `tenant_domains`, `site_settings`, `page_content`, `offerings`, `faq_items`, `media`, `leads`, `availability_rules`, `blackout_dates`, `scheduled_sessions`, `bookings`, `staff`, `audit_log`, `email_log`); `resolve_tenant_by_host` RPC; tenant-scoped `has_tenant_role` helper; storage buckets prefixed by `{tenant_id}/`; seed with 2 distinct sample Malaysian tenants (`jb-auto-detailing` and `kl-artisan-bakery`).
**Accept:** Automated SQL/RLS tests prove: (1) `anon` can only read published content for the resolved `tenant_id` and cannot list all tenants; (2) Tenant A's `owner`/`staff` gets zero rows and permission denied when querying or mutating Tenant B's records; (3) migrations replay cleanly from empty.

## M2 Public Site & DuitNow QR Checkout (Sellable MVP Gate)
Landing, offerings list, offering detail, About, FAQ, Privacy/Terms (Malaysia PDPA-aware templates); `en`/`zh` language switcher; SEO tags (`LocalBusiness` JSON-LD); cookie consent banner; **`manual_qr_proof` checkout drawer** (displays merchant DuitNow QR + one-tap copy bank account + receipt image upload -> Edge Function `forward-order-proof` relays payload + temporary signed link to merchant webhook/WhatsApp without persisting PII in DB, then opens pre-filled WhatsApp confirmation message for the customer).
**Accept:** Lighthouse mobile: Performance >= 85, Accessibility >= 95; works seamlessly in `en` and `zh` on `375px` mobile viewport; a new demo tenant can be spun up in <10 minutes via seed SQL and used for live sales pitches in Johor Bahru.

## M3 Lightweight Tenant Admin Core
Tenant-scoped admin shell (`/admin`), login, dashboard, offerings CRUD (dynamic attribute fields per archetype), FAQ CRUD, page content editor (single-language entry allowed with optional translation indicator—never blocks publishing), media library (auto-scoped to `{tenant_id}/`), theme & label editor with live preview, site settings (`en`/`zh` toggle, WhatsApp number, DuitNow QR image, checkout mode), staff invites.
**Accept:** A tenant owner logs in, updates prices, Chinese/English copy, DuitNow QR, or theme preset, and sees it live immediately without affecting any other tenant.

## M4 Leads, RFQs & WhatsApp/Email Relay
Contact / quote-request form (zod + Turnstile + rate limit) -> `leads` (stores anonymized lead ref + relays full message to merchant WhatsApp/Sheet webhook + optional Resend email); admin leads inbox (status, internal notes, CSV export).
**Accept:** Submitting RFQ form triggers merchant notification, blocks bots, enforces per-tenant rate limits, and stores consent timestamp.

## M5 Atomic Booking & Order Reservations
Per `05-data-model.md`:
- `group_session`: scheduled sessions with capacity limits.
- `appointment`: weekly availability rules -> generated time slots, buffers, blackout dates.
- `catalog_order`: item selection + delivery/pickup date window + DuitNow QR deposit or external checkout link.
- `showcase_lead`: booking disabled (RFQ / WhatsApp / external link only).
Booking mode: **`approval` (Phase 1)**; `auto` schema-ready. Atomic booking via Postgres RPC (`FOR UPDATE` row lock / `tstzrange` overlap exclusion). Owner approve/decline/cancel in admin with one-click WhatsApp status template + Resend email fallback + `pg_cron` reminder job (default 24h before). All times stored UTC, displayed in `Asia/Kuala_Lumpur`.
**Accept:** Concurrency test: two simultaneous bookings for the last slot -> exactly one succeeds. Reminders sent once (idempotent).

## M6 Malaysia Industry Presets & Demo Seeds
`/src/presets/{appointment,group-session,catalog-order,showcase-lead}.json` populated with realistic Malaysian SME copy (`en` + `zh`), RM pricing, domain labels, and properly licensed placeholder imagery documented in `docs/ASSETS.md`. Preset switcher in admin Settings.
**Accept:** Applying any of the 4 presets transforms a blank tenant into a realistic, ready-to-pitch Malaysian business site in one click.

## M8 Hardening, Security Audit & Launch Packaging
Cross-tenant penetration & RLS audit, storage path traversal check, CSP/security headers, Zero-PII log verification, WCAG 2.2 AA audit, error/empty states, automated DB backup guide, and operator SOP for onboarding new RM 220/mo clients in 10 minutes.
**Accept:** All checks in `AGENTS.md` pass on a clean install with zero cross-tenant leakage.

## Phase 2 backlog (do not build now)
Native Billplz / HitPay / Stripe webhook reconciliation · Bahasa Melayu (`ms`) preset pack · blog module · block page builder · booking auto-confirm UI · Cal.com/Calendly embed · dark-mode toggle for visitors.
