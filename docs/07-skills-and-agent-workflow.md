# 07 Skills and agent workflow

## Multi-Agent Hygiene (Lovable + OpenCode + DeepAI Code)
Because you are developing across **Lovable**, **OpenCode**, and **DeepAI Code**, follow these strict synchronization rules to avoid broken builds and lost migrations:
1. **GitHub is the Single Source of Truth:** Always `git pull` before starting a session in OpenCode or DeepAI Code, and push immediately after a milestone passes checks.
2. **Never use Lovable's visual DB editor without a migration file:** Whenever Lovable modifies Supabase tables or RLS, verify the SQL is saved under `supabase/migrations/` and pushed to GitHub.
3. **One Milestone Per Session:** Never ask an agent to build two milestones at once; context bloat causes subtle RLS and TypeScript errors.

## Tool-Specific Usage Guide
- **Lovable:** Best for rapid UI scaffolding (`M0`, `M2` public pages, `M3` admin forms, `M6` visual polish). Paste `AGENTS.md` and `docs/06-design-system.md` into Lovable Project Knowledge.
- **OpenCode / DeepAI Code:** Best for strict backend logic, Postgres migrations, multi-tenant RLS policy tests (`M1`), Edge Functions (`forward-order-proof`), and atomic booking RPCs (`M5`) where terminal access runs `supabase db reset`, `typecheck`, and `vitest` directly.

## Session protocol
1. Read `AGENTS.md`, then the active milestone in `docs/03-plan-book.md`.
2. Output a concise plan (files to create/touch, `tenant_id` security checks, risks).
3. Build the smallest vertical slice first (SQL migration -> RLS test -> UI component -> verify).
4. Run `npm run typecheck && npm run lint && npm test && npm run build`. Fix all errors before finishing.
5. Append a summary to `docs/CHANGELOG.md` and log any open items in `docs/08-open-questions.md`.
6. Stop strictly at the milestone boundary.

## Prompt starter (copy-paste for Lovable / OpenCode / DeepAI Code)
> "Follow AGENTS.md and docs/03-plan-book.md. Implement milestone M{n} exactly. Do not start other milestones. Remember this is a single-DB multi-tenant architecture (`tenant_id` on every business table) supporting `en` and `zh` with Zero-PII storage. State your implementation plan first, then build, then verify every acceptance criterion."

## Quality gates
Typecheck (`tsc --noEmit`) · Lint · Unit tests (Vitest) · Cross-tenant RLS isolation tests · Playwright smoke tests (tenant resolution, `en`/`zh` switch, DuitNow QR checkout flow, admin login) · Lighthouse mobile (`>= 85` Perf, `>= 95` A11y).
