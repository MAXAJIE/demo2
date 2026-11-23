# Pillar 3: Auth & Cybersecurity Hardening Manual

Enforce defense-in-depth across client bundles, authentication boundaries, data mutations, and HTTP headers.

## 1. Secret & Credential Leak Audit (Immediate Auto-Patch)

Scan all client-exposed files, environment prefixes, and static configs:

- **Client Env Prefix Violations**: Ensure secret keys (`SUPABASE_SERVICE_ROLE_KEY`, Stripe `sk_live_*`/`sk_test_*`, `AUTH_SECRET`, `JWT_SECRET`, database URLs, private API keys) NEVER use `NEXT_PUBLIC_*`, `VITE_*`, or `REACT_APP_*` prefixes and are never imported inside `'use client'` modules.
- **Hardcoded Credentials**: Scan for hardcoded bearer tokens, API keys, webhook secrets, or basic-auth strings in source code and remove them immediately, referencing server-only `process.env.*` variables instead.

## 2. Zero-Trust Authentication & Authorization (IDOR Prevention)

Never rely solely on client-side redirects or UI hiding to protect data or actions:

- **Server-Side Identity Verification**:
  - Every Server Action, Route Handler (`/api/*`), and protected Server Component must verify the active session server-side (e.g., `await supabase.auth.getUser()`, Clerk `await auth()`, or Auth.js `await auth()`).
  - Note for Supabase: Prefer `supabase.auth.getUser()` over `getSession()` on the server because `getUser()` revalidates the auth token against the Supabase Auth server.
- **Prevent Insecure Direct Object Reference (IDOR)**:
  - Never trust a `userId`, `orgId`, or `role` sent in a request body or URL parameter without verifying ownership against the server-authenticated session.
  - Scope every read, update, and delete query with `.eq('user_id', user.id)` (or verified tenant membership).
- **Supabase RLS & Schema Changes (Tier 2 Guardrail)**:
  - Verify Row-Level Security (RLS) is enabled on all user-facing tables. If a table lacks RLS or requires policy updates, do NOT modify DB schemas silently; place the exact `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` and `CREATE POLICY` SQL in the **Tier 2 Pending Approval Queue**.
- **Middleware Gate**: Ensure protected routes (`/dashboard/*`, `/app/*`, `/settings/*`) redirect unauthenticated visitors in `middleware.ts` (or edge guard) before sensitive layout data renders.

## 3. Input Validation, XSS, CSRF & Cookie Security

- **Strict Server Input Validation**: Validate all incoming JSON bodies, FormData, query strings, and webhook payloads with a schema validator (e.g., Zod) before executing business logic or database queries.
- **XSS Prevention**:
  - Audit every occurrence of `dangerouslySetInnerHTML`, `innerHTML`, `document.write`, `eval()`, and `new Function()`.
  - If rendering user-authored HTML/Markdown is required, sanitize it with `DOMPurify` (or `isomorphic-dompurify`) before insertion.
  - Validate user-supplied URLs (`href` / `src`) to block `javascript:` and `data:` protocol injection; enforce `rel="noopener noreferrer"` on `target="_blank"` links.
- **CSRF & Session Cookies**:
  - Verify custom state-changing endpoints validate origin/CSRF tokens or rely on framework-protected Server Actions.
  - Ensure custom auth cookies set `HttpOnly: true`, `Secure: true`, and `SameSite: 'lax'` (or `'strict'`).

## 4. HTTP Security Headers & CORS Hardening (Auto-Fix Safe)

Audit `next.config.*`, `middleware.ts`, or server response config and ensure these headers are present:

- **`Content-Security-Policy` (CSP)**: Restrict `default-src 'self'`, `object-src 'none'`, `base-uri 'self'`, and `frame-ancestors 'none'` (adjusting `script-src`, `style-src`, `img-src`, and `connect-src` for verified first-party providers like Supabase/Clerk/analytics).
- **`Strict-Transport-Security` (HSTS)**: `max-age=63072000; includeSubDomains; preload`.
- **`X-Content-Type-Options`**: `nosniff`.
- **`Referrer-Policy`**: `strict-origin-when-cross-origin`.
- **`Permissions-Policy`**: `camera=(), microphone=(), geolocation=()`.
- **CORS Discipline**: Never return `Access-Control-Allow-Origin: *` alongside `Access-Control-Allow-Credentials: true`. Whitelist explicit trusted origins.
