---
name: senior-webpage-audit
description: Principal-level code, UI/UX motion, authentication/cybersecurity, and dual-track SEO audit with tiered auto-remediation. Auto-triggers after building any new webpage, route, or major UI/feature, or whenever asked to review, polish, harden, optimize SEO, or pre-ship check a webpage or web application (Next.js, React, Tailwind, Framer Motion, GSAP, Supabase, Clerk, Auth.js, or vanilla HTML/CSS/JS).
---

# Senior Webpage Audit

Perform an uncompromising Principal Engineer review across four pillars: **Code Hygiene**, **UI & Motion Craft**, **Auth & Cybersecurity**, and **Technical SEO & Web Vitals**. Auto-fix safe issues and critical obvious security leaks immediately, hold high-risk architectural/DB/brand changes behind explicit approval, and deliver a verifiable **Engineering Scorecard**.

## When to Trigger

- **Automatic Post-Build Gate**: Run automatically immediately after creating or substantially modifying a webpage, route, layout, or interactive feature.
- **Explicit Audit Request**: Run whenever the user asks to review, audit, polish, refactor, secure, check SEO, or verify production readiness of a webpage or web app.

## Scan Scope & Cross-Linkage

1. **Code & UI Scope**: Inspect all newly created or modified files (`git diff` when available) plus their direct child components, hooks, and stylesheets.
2. **Global Security & SEO Linkage**: Whenever auditing any page or feature, always cross-check global routing tables, auth middleware, `next.config.*` / server headers, environment variable usage, `robots.txt`, `sitemap.xml`, and root layout metadata so local changes never break global security or indexation rules.

## Modular Reference Manuals

Load the corresponding reference file on demand during each audit phase for exhaustive checklists and implementation patterns:

- `references/01-code-hygiene.md`: Dead code eradication, anti-overengineering rules, strict TypeScript/async safety, and RSC/bundle optimization.
- `references/02-ui-motion-craft.md`: Anti-AI-slop design standards, 60fps GPU-only animations, CLS prevention, loading/empty/error states, and WCAG AA accessibility.
- `references/03-auth-cybersecurity.md`: Secret leak remediation, server-side session/IDOR checks, XSS/CSRF input sanitization, and security response headers.
- `references/04-seo-web-vitals.md`: Dual-track SEO (public SaaS landing pages vs. `noindex` authenticated dashboards), JSON-LD schemas, OG tags, and Core Web Vitals.

## Tiered Action Policy: Auto-Fix vs. Hard Red Lines

Classify every finding into **Tier 1 (Auto-Fix)** or **Tier 2 (Confirm-First)** before editing files.

### Tier 1: Auto-Fix Immediately (Execute & Log)

Apply fixes directly to the codebase and record exact `file:line` diffs in the report:

- **Code Hygiene**: Remove unused imports, dead variables, orphaned CSS classes, and commented-out code blocks; replace implicit `any` or redundant `as any` with proper types; add missing `try/catch` or cleanup for unhandled Promises; inline single-use trivial wrapper functions; push `'use client'` down to leaf interactive components where safe.
- **UI & Accessibility**: Fix broken responsive overflows, sticky mobile hover rules, missing image dimensions (`width`/`height` or `aspect-*`), missing `alt` attributes, missing `:focus-visible` keyboard rings, and missing `prefers-reduced-motion` guards.
- **SEO & Metadata**: Add or fix missing `<title>`, `<meta name="description">`, canonical URLs, Open Graph / Twitter Card tags, semantic landmarks (`<main>`, `<nav>`, `<article>`), single-`H1` hierarchy, JSON-LD structured data on public pages, and `noindex, nofollow` directives on authenticated dashboard/app routes.
- **Security Hardening & Obvious Critical Leaks**: Add missing security headers (`CSP`, `HSTS`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`); immediately strip exposed private keys/secrets from client-side files; patch obvious missing server-side session checks on unprotected mutations/endpoints and highlight them prominently in the report.

### Tier 2: Hard Red Lines (STOP & Ask Confirmation First)

Never execute these changes silently. Present the risk, rationale, and exact proposed patch in the **Pending Approval Queue** and wait for user sign-off:

1. **Database & API Contracts**: Modifying database schemas, migrations, Supabase RLS policies, or breaking API request/response payload shapes.
2. **File Deletion & Major Architecture Refactors**: Deleting entire files or executing multi-component architectural splits (e.g., breaking up >250-line components across 3+ files or changing state management patterns).
3. **Brand Copy & Visual Identity**: Rewriting existing brand messaging/copy, altering core design tokens, changing color palettes, or shifting the established visual design style.

## 4-Pillar Audit Workflow

Execute all four passes in order, consulting the corresponding `references/` file for detailed rules:

### Step 1: Principal Code Hygiene (`references/01-code-hygiene.md`)

- **Zero Dead Code**: Purge unused imports, variables, types, CSS selectors, and commented-out blocks.
- **Anti-Overengineering**: Flatten prop drilling deeper than 3 levels, eliminate single-use pass-through wrappers, and flag files over 250 lines or deeply nested JSX ternaries for decomposition.
- **Strict Type & Async Safety**: Eliminate `any` escapes, enforce boundary validation, and verify every async operation handles rejection and unmount cleanup.
- **Bundle & Rendering Discipline**: Audit `'use client'` boundaries and replace full-library barrel imports with tree-shakeable imports.

### Step 2: UI, Motion & Design Craft (`references/02-ui-motion-craft.md`)

- **Eliminate AI Template Slop**: Replace generic unmotivated gradients, repetitive card-shadow clutter, and flat typographic hierarchy with intentional scale contrast, balanced headings, and strict 4pt/8pt spacing rhythm.
- **60fps GPU Motion & Touch Safety**: Ensure animations only mutate `transform` and `opacity`, wrap hover animations in `@media (hover: hover) and (pointer: fine)` so touch devices never stick, and verify zero Cumulative Layout Shift (`CLS = 0`).
- **Complete State Coverage**: Verify every data-driven or async view renders a dimension-matched **Skeleton loading state**, an actionable **Empty state**, and a recoverable **Error state**.
- **Media & WCAG AA+ Accessibility**: Enforce explicit image aspect ratios, LCP hero priority, lazy loading below the fold, keyboard Tab focus rings, >= 4.5:1 contrast, and `prefers-reduced-motion` support.

### Step 3: Auth & Cybersecurity (`references/03-auth-cybersecurity.md`)

- **Client Secret Scan**: Verify zero private keys (`SUPABASE_SERVICE_ROLE_KEY`, secret API tokens, signing secrets) appear in client bundles or `NEXT_PUBLIC_*` / `VITE_*` variables.
- **Zero-Trust Auth & IDOR**: Confirm every Server Action, API route, and protected page verifies authenticated user identity server-side and scopes queries by authenticated `user.id` / tenant ID (flag missing Supabase RLS policies in Tier 2).
- **XSS, CSRF & Input Sanitization**: Enforce schema validation on all inputs, audit `dangerouslySetInnerHTML` and dynamic URLs, and verify `HttpOnly` + `Secure` + `SameSite` cookie attributes.
- **Security Headers & CORS**: Verify strict `CSP`, `HSTS`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, and restricted CORS origins.

### Step 4: Dual-Track Technical SEO & Core Web Vitals (`references/04-seo-web-vitals.md`)

- **Public vs. Private Route Isolation**: Ensure public SaaS/marketing pages are fully indexable with rich metadata and JSON-LD, while authenticated dashboard/app/auth routes enforce `noindex, nofollow` and stay excluded from `sitemap.xml`.
- **Metadata & Social Cards**: Verify unique titles (50-60 chars), meta descriptions (140-160 chars), self-referencing canonical URLs, and complete 1200x630 Open Graph / Twitter Card tags.
- **Semantic Structure & JSON-LD**: Enforce one `H1` per page, sequential `H1 -> H2 -> H3` order, semantic HTML5 landmarks, crawlable `<a href>` links, and valid Schema.org JSON-LD (`SoftwareApplication`, `Organization`, `FAQPage`, or `Article`).
- **Core Web Vitals**: Optimize LCP (< 2.5s), INP (< 200ms), and CLS (< 0.1).

## Adaptive Verification Protocol

Generate concrete proof proportional to the active environment:

- **When CLI or Headless Browser / Playwright MCP is available**: Run build, typecheck, and lint commands; inspect rendered DOM, computed styles, HTTP response headers, JSON-LD scripts, and mobile (`390x844`) vs. desktop (`1440x900`) viewports; report exact command outputs and zero-error confirmation.
- **When in Static / Web-Only Sandbox (no CLI or browser)**: Execute a full-chain static trace across imports, client-to-server data boundaries, auth middleware, CSS rules, and metadata inheritance, citing exact `file:line` anchors for every verified invariant.
- **Always Include**: End every report with a **60-Second Human Browser Smoke Checklist** tailored to the exact modified routes and interactions.

## Mandatory Output Format: Engineering Scorecard

Always deliver the final review using this exact structure:

```markdown
## Senior Webpage Audit Scorecard

| Pillar | Score | Status | Critical Findings | Auto-Fixed |
| :--- | :---: | :--- | :---: | :---: |
| 1. Code Hygiene | X/10 | PASS / WARN / BLOCK | N | N |
| 2. UI & Motion Craft | X/10 | PASS / WARN / BLOCK | N | N |
| 3. Auth & Cybersecurity | X/10 | PASS / WARN / BLOCK | N | N |
| 4. SEO & Web Vitals | X/10 | PASS / WARN / BLOCK | N | N |

### Security & Auth Alerts (High-Visibility)
- **[AUTO-PATCHED / ACTION REQUIRED]** `path/to/file.ts:line` - Concise description of vulnerability, blast radius, and exact fix applied or required.

### Auto-Fixed Log (Tier 1)
- **[Pillar]** `path/to/file.tsx:line` - What was changed and the engineering reason.

### Pending Approval Queue (Tier 2 Red Lines)
- **[Category: DB/RLS | Major Refactor | Brand/Tokens]** `path/to/file.ts:line`
  - **Why Confirmation Is Required**: Specific risk or architectural impact.
  - **Proposed Change**: Concise diff or SQL/code snippet awaiting sign-off.

### Verification Evidence
- **Automated / Static Trace Proof**: Exact build/typecheck/DOM/header results or `file:line` static trace verification.
- **60-Second Human Browser Smoke Checklist**:
  1. [Exact route & user action to verify layout, motion, and responsive behavior]
  2. [Exact auth/session boundary check]
  3. [Exact View-Source / DevTools check for meta, canonical, JSON-LD, or security headers]
```

## Gotchas

- Never rewrite brand voice, marketing headlines, or established color tokens under the guise of "UI polish" without putting them in the Tier 2 approval queue.
- Never trust client-side route guards alone for authentication; always verify server-side enforcement in middleware, Server Components, Server Actions, or API handlers.
- Do not add `noindex` globally in root layouts when auditing hybrid SaaS apps; isolate `noindex` strictly to authenticated dashboard/app route groups so public landing pages remain crawlable.
