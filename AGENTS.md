# AGENTS.md — CoreSite Malaysia Multi-Tenant Engine (read this first)

You are building **CoreSite**: a multi-tenant, industry-agnostic website and conversion engine built for local SMEs in Malaysia (appointment services, group studios/workshops, F&B pre-orders, and B2B suppliers). One shared codebase and one shared Supabase database serve all paying tenants via subdomain (`slug.yourdomain.my`) and custom domain routing.

Designed for **Lovable**, **OpenCode**, and **DeepAI Code** via a single GitHub repository. Build ONE milestone per session.

## Read order
1. `docs/01-product-brief.md` — Product scope, Malaysia business archetypes, and MVP gates
2. `docs/02-tech-stack.md` — Approved stack, multi-tenant hosting, environment variables, decision log
3. `docs/03-plan-book.md` — Re-sequenced milestones (M0–M6, M8; M7 intentionally removed)
4. `docs/04-auth-and-roles.md`, `docs/05-data-model.md` — Multi-tenant RLS security, Zero-PII data model
5. `docs/06-design-system.md` — Visual direction, CSS token system, EN/ZH typography, WCAG AA rules
6. `docs/07-skills-and-agent-workflow.md` — Tool-specific protocols (Lovable / OpenCode / DeepAI Code)
7. `docs/08-open-questions.md` — Resolved decisions and pending owner inputs

## Hard rules
- **TypeScript strict.** No `any` without an explicit comment explaining why.
- **Strict Multi-Tenant Isolation:** Every business table MUST have `tenant_id uuid not null references tenants(id) on delete cascade`. Every query and every RLS policy MUST filter by `tenant_id`. Never expose a public `SELECT` on `tenants` that leaks the full customer directory—use the `resolve_tenant_by_host(hostname)` RPC.
- **Zero-PII Storage Rule:** Never store end-customer sensitive personal data (IC numbers, home addresses, bank account numbers, or raw payment receipt files) in Postgres or permanent Storage buckets. Forward sensitive checkout/lead payloads directly via Edge Function webhooks to the merchant's WhatsApp / Google Sheet, storing only anonymized tracking metadata (`order_ref`, `amount_cents`, `status`).
- **No hardcoded copy, industry terms, brand names, colors, or fonts in components.** All UI domain nouns come from `site_settings.labels`; content comes from `i18n` JSONB (`en` and `zh`); colors and fonts come from CSS variables driven by `site_settings.theme`.
- **Graceful i18n Fallback:** MVP supports English (`en`) and Simplified Chinese (`zh`). Only `site_settings.default_locale` is required in DB checks so merchants can launch in a single language first without translation bottlenecks.
- **Security lives in Postgres RLS, not in the UI.** Hiding a button is never access control.
- **Secrets:** Never put `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, or webhook secrets in client code or git. Client gets only `VITE_*` variables.
- **Migrations:** All schema changes live in `supabase/migrations/*.sql`, replayable from empty. Never rely on Lovable GUI-only database edits without committing the SQL migration.
- **Accessibility & Mobile First:** WCAG 2.2 AA contrast & keyboard navigation. Test at `375px`, `768px`, and `1280px`.

## Definition of done (per milestone)
Acceptance criteria in `docs/03-plan-book.md` all met · `npm run typecheck && npm run lint && npm test && npm run build` pass · no console errors · works with multi-tenant demo seed data (`en` + `zh`) · short note appended to `docs/CHANGELOG.md`.

## When unsure
Ask the owner. Do not invent requirements. Record the question in `docs/08-open-questions.md`.
