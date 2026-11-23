# 02 Tech stack

| Layer | Choice | Why |
|---|---|---|
| Build | **Vite + React 18 + TypeScript** | Compatible across Lovable, OpenCode, and DeepAI Code; fast static builds |
| Styling | **Tailwind CSS + shadcn/ui (Radix)** | Themeable via CSS variables; accessible primitives |
| Routing | React Router | Standard SPA routing with tenant context provider at root |
| Data fetching | TanStack Query + supabase-js | Query keys scoped by `['tenant', tenantId, ...]` to prevent cache leaks |
| Forms | react-hook-form + zod | Shared validation schemas across client + Edge Functions |
| i18n | i18next + react-i18next for UI chrome; DB-driven `i18n` JSONB for tenant content | Supports `en` and `zh` in MVP with automatic single-language fallback |
| SEO | react-helmet-async, dynamic OG tags, JSON-LD (`LocalBusiness`) | Clean semantic metadata per tenant domain |
| Fonts | Self-hosted via Fontsource (`Manrope`, `Inter`, `Noto Sans SC`) | Crisp English + Simplified Chinese rendering with zero external Google Fonts calls |
| Backend | **Supabase (Single Shared DB)**: Postgres + Multi-Tenant RLS, Auth, Storage, Edge Functions (Deno), `pg_cron` | Keeps infrastructure cost at ~$25/mo total for 25+ tenants (~95% gross margin) |
| Notifications | **WhatsApp Click-to-Chat / Webhook Bridge** (primary) + **Resend** (secondary) | Matches Malaysian SME operational habits where WhatsApp is the primary inbox |
| Spam | Cloudflare Turnstile + Edge Function IP/phone rate limit | Protects public booking/lead endpoints from spam |
| Tests | Vitest + Testing Library; SQL/pgTAP cross-tenant RLS tests | Cross-tenant isolation is the #1 security priority |
| Hosting | **Vercel or Cloudflare Pages** (Wildcard `*.yourdomain.my` + custom domains) | Instant edge SSL and SPA fallback routing |

## Multi-Tenant Hostname Routing & Hosting
Supabase hosts database, auth, storage, and Edge Functions. The frontend SPA deploys to Vercel or Cloudflare Pages with wildcard subdomain support (`*.yourdomain.my`) and SPA rewrites:
- `vercel.json`: rewrite all paths to `/index.html`
- Cloudflare Pages: `_redirects` or `wrangler.jsonc` with `not_found_handling: "single-page-application"`
- On app boot, `TenantProvider` reads `window.location.hostname` (or `?tenant=slug` override in local dev) and calls `supabase.rpc('resolve_tenant_by_host', { p_hostname })` to load `tenant_id` and `public_site_settings`.

## Environment
- **Client (public):** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_TURNSTILE_SITE_KEY`, `VITE_ROOT_DOMAIN`
- **Supabase secrets (never client):** `RESEND_API_KEY`, `RESEND_FROM`, `TURNSTILE_SECRET`, `MERCHANT_FORWARD_WEBHOOK_SECRET`

## Repo layout
```
/src
  /app        (router, TenantProvider, QueryProvider)
  /components (ui, site, admin)
  /features   (offerings, booking, checkout, leads, theme, i18n, auth)
  /pages      (public, admin)
  /lib        (supabase, zod schemas, tenant-resolver, utils)
  /presets    (appointment.json, group-session.json, catalog-order.json, showcase-lead.json)
/supabase
  /migrations
  /functions  (forward-order-proof, send-email, invite-staff, send-reminders)
  seed.sql
  config.toml
/docs
```

## Decision log
- **D1 Custom shadcn admin (not react-admin):** Keeps theming consistent and Lovable/OpenCode-friendly.
- **D2 Single-DB Multi-Tenant (`tenant_id`) instead of 1-Supabase-project-per-client:** Essential for RM 220/mo unit economics in Malaysia. Enforced via strict `tenant_id` RLS policies and cross-tenant integration tests.
- **D3 Vite SPA, not Next.js:** Static edge deployment on Cloudflare Pages / Vercel with wildcard domains and full compatibility with Lovable.
- **D4 GitHub Single Source of Truth:** Because development rotates between Lovable, OpenCode, and DeepAI Code, all agents must pull/push through GitHub and write schema changes exclusively in `supabase/migrations/*.sql`.
- **D5 Zero-PII Forwarding Architecture:** Customer payment receipts and sensitive contact details are relayed immediately via Edge Function webhook to the merchant's WhatsApp/Google Sheet and purged/omitted from Postgres storage to minimize PDPA liability.

## Implementation note (2026-11-23, supersedes service details above)

The approved stack is implemented as a **frontend-only deploy**:

- Static SPA on Cloudflare Pages; no backend service runs anywhere.
- Supabase hosts Postgres, RLS policies and the business RPCs; the browser uses only
  the anon key. See `supabase/migrations/0001`–`0006` and `docs/10-deploy.md`.
- The few server-side behaviours (per-tenant HTML head, robots/sitemap, 404 status)
  are Cloudflare Pages Functions in `functions/`.
- The earlier FastAPI + SQLite implementation is archived in `archive/backend/` and
  is not part of the deploy.
