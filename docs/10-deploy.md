# 10 Deploy: Cloudflare Pages + Supabase, no server of ours

The site is a static SPA. Everything dynamic is either Supabase (Postgres + RLS +
auth, hosted by Supabase) or a Pages Function next to the static files (edge,
deployed with the site). Nothing runs on a machine you maintain.

```
browser ──► Cloudflare Pages (static build + /functions)
                │            │
                │            └──► Supabase REST/RPC (anon key, RLS enforced)
                └──► /assets (immutable)
```

## 1. Supabase project

1. Create the project (Singapore region is closest for Malaysia).
2. Run the migrations **in order** in the SQL editor, or with the CLI:
   `supabase link --project-ref <ref> && supabase db push`.
   - `0001_schema.sql` — tables, indexes (first-booked-wins unique index)
   - `0002_rls.sql` — row level security + the two-tier helpers
   - `0003_functions_read.sql` — `site_bundle`, `availability`, `resolve_tenant_by_host`
   - `0004_functions_write.sql` — booking, lead, cancel, invite claim, admin overview
   - `0005_seed.sql` — the demo tenant (skip for a real client; see §6)
   - `0006_admin.sql` — invite minting + `platform_overview`
3. Auth settings:
   - **Disable "Allow new users to sign up"** — invite-only. No sign-up UI exists,
     but this closes the API path too.
   - Email provider: enable; set the invite/reset templates.
   - (Recommended) enable TOTP MFA for the platform owner.
4. Create your own account (Auth → Users), then make it the platform owner:
   ```sql
   insert into public.platform_admins (user_id) values ('<your-auth-user-uuid>');
   ```
5. Copy **Project URL** and the **anon public key** (never the service-role key).

## 2. Cloudflare Pages project

- Build command: `npm ci && npm run build` (run inside `frontend/`, or set the
  root directory to `frontend`).
- Output directory: `dist`.
- Functions directory: `functions` (Pages picks it up automatically).
- Environment variables (Production):
  | Name | Value | Used by |
  |---|---|---|
  | `VITE_SUPABASE_URL` | `https://<ref>.supabase.co` | browser bundle |
  | `VITE_SUPABASE_ANON_KEY` | anon key | browser bundle |
  | `SUPABASE_URL` | same URL | Pages Functions |
  | `SUPABASE_ANON_KEY` | same anon key | Pages Functions |
  | `SITE_ORIGIN` | `https://<your-domain>` | canonical URLs in HTML head |
  | `TURNSTILE_SECRET` | *(later)* | form verification |

  `VITE_*` are inlined at build time; the non-prefixed ones are only readable by
  the Functions. No secret ever reaches the browser.

## 3. Domain

Add the custom domain in Pages, then point the DNS record. The tenant is resolved
from the `Host` header: insert/update the domain first:

```sql
insert into public.tenant_domains (hostname, tenant_id, is_primary)
values ('clinic.example.my', '<tenant-uuid>', true)
on conflict (hostname) do update set is_primary = true;
```

`resolve_tenant_by_host()` and `site_bundle()` use it; the primary domain becomes
the canonical URL.

## 4. Local development

Three data sources, chosen at build/run time by `VITE_DATA_SOURCE`:

| Mode | Command | Talks to |
|---|---|---|
| `rest` (default) | `npm run dev` | the FastAPI demo on `127.0.0.1:8011` |
| `local` | `VITE_DATA_SOURCE=local npm run dev` | bundled seed + localStorage, **no backend** |
| `supabase` | `VITE_DATA_SOURCE=supabase VITE_SUPABASE_URL=... VITE_SUPABASE_ANON_KEY=... npm run dev` | your Supabase project |

`local` demo login: `owner@demo.local` / `demo1234` (UI demo only, not security).

## 5. Deploy checklist (after `wrangler pages deploy`)

```bash
BASE=https://clinic.example.my
curl -s $BASE/about | grep -o 'rel="canonical"[^>]*'        # the real domain
curl -s $BASE/about | grep -c 'id="__SITE__"'               # 1 (inline bundle)
curl -s -o /dev/null -w "%{http_code}\n" $BASE/does-not-exist   # 404
curl -s $BASE/robots.txt | head -3                          # plain text
curl -s $BASE/sitemap.xml | head -3                         # XML, no /manage
curl -sI $BASE/ | head -1                                   # 200 for HEAD
curl -s -o /dev/null -w "%{http_code}\n" $BASE/api/v1/site  # nothing served there
```

Then in a browser: no CJK font on first load, one booking completes to the
confirmation page, `/manage` refuses a stranger, an invite link works once.

## 6. Adding a real client (not the demo)

1. Do **not** run `0005_seed.sql` for a real tenant.
2. Insert the tenant, its domain, `site_settings`, page content, offerings,
   availability rules, FAQ (copy `0005_seed.sql` as the template).
3. Invite the clinic owner from `/platform` (or `admin_create_invite()`), send
   them the link over WhatsApp.
4. They log in and edit their own services and settings; you keep `/platform`.

## 7. Backups

Supabase runs its own daily backups on paid plans. For a free project, run a
scheduled `pg_dump` from your machine or GitHub Action and store it outside the
repo. A SQLite file is no longer the source of truth.

## 8. What is still open

- Turnstile: keys + verify call in the booking and contact functions (F4).
- Rate limiting keys on a hash supplied by the caller; the trusted value must
  come from a Pages Function proxy, never from the browser (documented in
  `0004_functions_write.sql`).
- Payment proof upload: intentionally unsupported without a server; keep it as a
  WhatsApp step, or add an Edge Function with a private bucket and short TTL.
