# Senior Webpage Audit — CoreSite Malaysia (Setapak Dental demo tenant)

- **Date:** 2026-11-21
- **Scope:** `frontend/` (public site + `/manage` admin SPA, `en`/`zh`) and the FastAPI delivery layer in `backend/app/`. No code was modified.
- **Method:** `senior-webpage-audit` (provided `.zip`) applied with the design standards from the installed `hallmark`, `unslop`, and `taste-skill` skills.
- **Verification run:** `tsc --noEmit` → clean · `eslint .` → clean · `vitest run` → 9/9 pass. Static trace plus live HTTP probes against the running stack (`:5173`, `:8011`).
- **Verdict:** strong visual craft and clean TypeScript, but the build currently **fails its own hard rules**: hardcoded tenant brand/industry content, a theme system that most components bypass, no crawlable multi-tenant SEO surface, and one Zero-PII violation.

---

## Installed skills

| Skill | Source | Installed at | Notes |
| :--- | :--- | :--- | :--- |
| `hallmark` | github.com/Nutlope/hallmark | `.agents/skills/hallmark` | v2.0.0; includes `references/` + `scripts/` (sloplint, capture) |
| `unslop` | github.com/heydamir/unslop | `.agents/skills/unslop` | Includes `references/` + snapshot/story scripts |
| `design-taste-frontend` | github.com/Leonxlnx/taste-skill | `.agents/skills/taste-skill` | v2.5.1; 39 MB incl. component/photo library |
| `senior-webpage-audit` | uploaded `senior-webpage-audit.zip` | `.agents/skills/senior-webpage-audit` | The audit framework used for this report |

Invoke by name in a prompt (e.g. “use hallmark to redesign `/`”, “use unslop on the booking panel”). The repos are installed as working copies, not via their own installers, so `git pull` in those repos is not wired up.

---

## Senior Webpage Audit Scorecard

| Pillar | Score | Status | Critical Findings | Auto-Fixed |
| :--- | :---: | :--- | :---: | :---: |
| 1. Code Hygiene | 6/10 | WARN | 2 | 0 |
| 2. UI & Motion Craft | 5/10 | WARN | 4 | 0 |
| 3. Auth & Cybersecurity | 6/10 | WARN | 3 | 0 |
| 4. SEO & Web Vitals | 3/10 | BLOCK | 5 | 0 |

Auto-fixed is **0 by instruction** (“don’t touch code yet”). All fixes below are proposals.

---

## Top risks, in order

1. **Every tenant inherits a dental clinic.** `index.html`, the logo, the JSON-LD, the SVG artwork and several components hardcode “Klinik Pergigian Setapak” / teeth / “dental slot”. This breaks the product’s core promise (industry-agnostic, no hardcoded brand).
2. **Crawlers and social bots only ever see Setapak.** The SPA is client-rendered and `index.html` carries that tenant’s title/OG/description. WhatsApp/Maps/Facebook previews for *any* tenant will show this clinic; `og.png` is a single shared card.
3. **No indexation infrastructure.** No canonical, no `og:url`, no `hreflang`, no `robots.txt`, no `sitemap.xml`; unknown paths return `index.html` with HTTP 200 (soft 404s). The FastAPI fallback even serves HTML for `/robots.txt` and `/sitemap.xml`.
4. **Theme tokens are decorative, not authoritative.** Core surfaces/actions are hardcoded hex (`#B7D0E6`, `#0B2238`, `#075E54`, `#25D366`, `#FBFCFE`, `#DCE8F3`). In the `carbon-sage` preset, `text-accent-on` on `bg-accent` is **2.45:1**, and the footer’s `text-white/75` on a light primary is **1.30:1** — both WCAG AA failures.
5. **Zero-PII rule is violated by merchant bank details.** A bank account number is stored in `site_settings.payment_config`, returned by `GET /api/v1/site`, and rendered on the confirmation page.
6. **Auto-moving carousel has no pause control** (`pauseOnHover={false}`, no controls) — WCAG 2.2.2 failure for content that moves for more than 5 seconds.
7. **Session/cancel tokens travel in URLs and `sessionStorage`**, and rate limiting can be bypassed (spoofable `X-Forwarded-For`) or accidentally shared via proxy (`request.client.host` on login).
8. **Motion animates layout properties** (`height`, `width`, `layout`) and `filter: blur()` on the hero/step transitions — the opposite of the 60 fps rule and a direct LCP/INP cost.

---

## Pillar 3 first — Security & Auth alerts (high visibility)

| Severity | Anchor | Finding | Suggested fix |
| :--- | :--- | :--- | :--- |
| **P0** | `backend/app/services/tenant.py:81-92`, `:373`; `backend/app/routers/admin.py:77`; `frontend/src/types.ts:46-52`; `pages/BookingConfirmationPage.tsx:152-154` | Merchant `account_number` (and `account_holder`) is persisted in Postgres/SQLite and served publicly through `/api/v1/site`. Direct contradiction of the Zero-PII rule (“never store … bank account numbers”). | Keep only `bank_name`, `account_holder`, `qr_image_url` + `configured` in the bundle. Move the account number to an Edge Function/secret-backed endpoint or a merchant-owned payment link; return it only to an authenticated owner. |
| **P1** | `backend/app/routers/admin.py:77` | Authenticated admin payload returns the full `payment_config`, including `merchant_webhook_url` (a signing secret) to the browser. | Mask it (`••••` + last 4) and expose a “configured / rotate” state only. Never round-trip the raw URL. |
| **P1** | `backend/app/routers/public.py:61-79`; `backend/app/routers/admin.py:99` | Public rate limiting trusts the first `X-Forwarded-For` value (spoofable → unlimited bookings/leads); admin login uses `request.client.host`, so behind a proxy every staff member shares one bucket (lockout DoS). | Use a trusted-proxy allowlist to derive the client IP; key admin login on `(ip, identifier)`; move buckets to Redis/DB so limits survive multiple workers. |
| **P1** | `frontend/src/pages/BookingPage.tsx:231-232`; `backend/app/routers/public.py:246-260` | `cancel_token` is placed in the page URL (`?token=…`) and sent as a query param; tokens leak via Referer, browser history, proxy logs and shared screenshots. | Put the token in the URL fragment (`#token=`) or POST body; set `Referrer-Policy: no-referrer` on the confirmation route. |
| **P1** | `frontend/src/lib/api.ts:17-39` | Admin bearer token lives in `sessionStorage` — readable by any XSS. The audit manual’s standard is `HttpOnly; Secure; SameSite`. | Server-set `HttpOnly` cookie with `SameSite=Lax/Strict` + CSRF token for mutations, or document an explicit risk acceptance (Tier 2). |
| **P1** | `frontend/src/app/TenantProvider.tsx:15-32`; `backend/app/routers/public.py:57`; `backend/app/services/tenant.py:35-40` | `?tenant=` overrides host resolution for both reads and writes. Any host can transact against any tenant, and a custom domain can be repainted with another tenant’s site. | In production, reject `?tenant=` when the request host maps to a tenant; keep it behind an explicit demo/dev flag. Validate `X-Forwarded-Host` against known domains. |
| **P2** | `backend/app/main.py:47-69` | Headers are decent but incomplete: HSTS has no `preload`, no `Cross-Origin-Opener-Policy`/`Cross-Origin-Resource-Policy`, CSP `img-src https:` is broad, and `connect-src 'self'` breaks if `VITE_API_BASE` points to another origin. | Tighten `img-src` to known hosts, add `frame-ancestors 'none'` (already) plus COOP/CORP, add `preload` once HTTPS is permanent, and derive `connect-src` from the API origin. |
| **P2** | `frontend/src/pages/BookingConfirmationPage.tsx` (proof upload); `backend/app/routers/public.py` proof route | Proof uploads have no rate limit and forward a base64 receipt (up to 5 MB) straight to the merchant webhook — an unauthenticated spam amplifier for the merchant’s WhatsApp/Sheet. | Add `_limit(request, "proof")`, cap per booking, and validate webhook response codes/idempotency. |
| **P2** | Architecture vs `AGENTS.md` | “Security lives in Postgres RLS” — but tenant isolation is enforced only in FastAPI query filters (`tenant_id == …`). There is no RLS, no `supabase/migrations`. One missed `.where()` = cross-tenant leak. | Decide and document: (a) migrate to the mandated Supabase/RLS model, or (b) formally amend `AGENTS.md` and add automated cross-tenant isolation tests (currently `backend/tests/` is empty). |

**Positive:** passwords use scrypt with per-user salt and constant-time compare; sessions are hashed before storage and revocable; every admin route re-verifies the session server-side and scopes by `staff.tenant_id`; role checks exist on mutations; booking/lead payloads are Zod/Pydantic validated; `dangerouslySetInnerHTML`, `innerHTML`, and `eval` are absent; `target="_blank"` links use `rel="noreferrer"`.

---

## Pillar 1 — Code Hygiene

| Severity | Anchor | Finding | Suggested fix |
| :--- | :--- | :--- | :--- |
| **P1** | `pages/BookingPage.tsx` (910 lines), `pages/HomePage.tsx` (670), `pages/ContactPage.tsx` (431) | Components exceed the 250-line threshold by 2–4×; wizard steps, summary, and form sections are inline. | Extract `BookingStepDateTime`, `BookingDetailsForm`, `BookingSummary`; extract hero/services/FAQ sections of `HomePage`. (Tier 2: multi-file refactor.) |
| **P1** | `app/TenantProvider.tsx:51`; `src/index.css` | `.theme-editorial` is toggled on `<html>` but **no CSS rule uses it** — the typography switch is dead. | Either implement `.theme-editorial` type scale/font rules or remove the toggle and the `typography` field. |
| **P1** | `lib/i18n.ts:222,271,512,625,673,681`; `pages/HomePage.tsx:129-131,150-151`; `components/site/MobileActions.tsx:18-19`; `pages/ContactPage.tsx:105`; `pages/AboutPage.tsx:20`; `pages/FaqPage.tsx:19` | Domain copy is hardcoded in English/Chinese inside components (“dental slot”, “看诊”, “Today”, “今天”). | Move every user-facing sentence to `i18n` JSONB / `site_settings.labels`. Only generic chrome (nav, save, cancel) belongs in the static catalog. |
| **P1** | `components/site/ReviewsCarousel.tsx:14-95` | A 10-item `SUMMARY` array of full marketing copy, prices, and claims lives in a component. It also hardcodes `4.8` (`:126`, `HomePage.tsx:571`). | Move to `content.home.reviews` in the DB; rating from tenant data or a verified source. |
| **P2** | `components/site/Logo.tsx:3-20` | `ToothMark` is the brand logo for every tenant. | Tenant-supplied logo/mark (URL + monogram fallback); tooth path only in the dental demo seed. |
| **P2** | `components/ui/focus-cards.tsx` | Not rendered anywhere (only its `FocusCard` type is imported); ~130 lines of dead component + CSS. | Delete the file, keep the type in `types.ts` or inline it. |
| **P2** | `pages/HomePage.tsx:47-99` (palette + 3 SVG artworks); `pages/HomePage.tsx:203-205` (spotlight gradients); `pages/ServicesPage.tsx:139` | Brand colors baked into SVG strings/gradients and Tailwind arbitrary values. | Generate artwork from theme tokens (e.g. `currentColor` + `var(--accent)`), or ship tenant-uploaded imagery. |
| **P2** | `pages/HomePage.tsx:129-131`; `components/site/Header.tsx:134-136`; `components/site/Footer.tsx:23-25` | Copy is parsed to derive UI values: `spec_line.split("·")[0]` becomes the location, rating, and header subtitle. A copy edit silently breaks the layout. | Add explicit `site.location_label`, `site.rating`, `site.tagline` fields. |
| **P2** | `docs/CHANGELOG.md` (2026-11-21 entries) vs `components/site/ReviewsCarousel.tsx:165-171` | Changelog claims carousel “pause/play, keyboard focus handling, 4.2 s advance”; code has `pauseOnHover={false}`, no controls, and an 80 s CSS scroll. | Correct the record, or restore the claimed behaviour (preferred — see WCAG 2.2.2 below). |
| **P3** | `app/TenantProvider.tsx:78-84` | `document.title` is imperatively set in the provider, racing `react-helmet-async` on every route. | Remove; let `PageMeta` own the title. |
| **P3** | `app/TenantProvider.tsx:105-112` | Boot state is a spinner, not a layout-matched skeleton. | Render header/hero-shaped skeletons to keep CLS at 0. |

---

## Pillar 2 — UI, Motion & Design Craft

| Severity | Anchor | Finding | Suggested fix |
| :--- | :--- | :--- | :--- |
| **P0** | `components/site/ReviewsCarousel.tsx:165-171`; `components/ui/infinite-moving-cards.tsx:40-83` | Auto-scrolling content runs for 80 s, repeats forever, and **cannot be paused** (`pauseOnHover={false}`, no button). WCAG 2.2.2 requires pause/stop/hide for movement > 5 s. | Re-enable hover/focus pause **and** add a visible pause/play control (44 px). Keep `prefers-reduced-motion` stop. |
| **P0** | `src/index.css:112-137,184,192,338,374`; `components/site/Footer.tsx:45-120`; `components/ui/stateful-button.tsx:109` | Hardcoded colors bypass `site_settings.theme`. Concrete failures: `carbon-sage` accent/on-accent **2.45:1**, footer `white/75` on light primary **1.30:1**, `crimson-pearl` accent/on-accent **2.83:1**. | Route every color through tokens; add `accentOn`/`accentInk` to `ThemeTokens` and `applyTheme`; replace `text-white/*` in `.section-dark` with `text-on-brand/*`; add contrast assertions per preset. |
| **P1** | `components/site/Header.tsx:328`; `components/site/FaqAccordion.tsx:73-80`; `pages/BookingPage.tsx:400-404` | Animates `height: auto`, `layout`, and `filter: blur()` — layout/paint work on every frame. | Use `grid-template-rows: 0fr→1fr` or transform/opacity; reserve height; drop `layout` from step transitions. |
| **P1** | `pages/HomePage.tsx:181-190,217-235`; `components/ui/canvas-text.tsx:150-170` | Hero `<h1>` starts at `opacity: 0` + 24 px blur; the highlighted word is a **canvas** with `role="img"` and an invisible DOM span. LCP waits on JS + canvas draw, and the canvas `rAF` loop runs forever (even scrolled away). | Render the headline as real, visible text at first paint; make the canvas a decorative overlay with a static text fallback; pause `rAF` with `IntersectionObserver` / `visibilitychange`. |
| **P1** | `pages/BookingPage.tsx:583,650`; `pages/ServicesPage.tsx:56,119`; `components/site/FaqAccordion.tsx:30` | `hover:-translate-y-*` is not wrapped in `@media (hover: hover) and (pointer: fine)` (the CSS `.btn` correctly is). Touch taps leave cards stuck in hover/overflow. | Use the same hover guard (or `active:` feedback) for all lift effects. |
| **P2** | `pages/BookingPage.tsx:565-620`; `pages/BookingPage.tsx:285-360` | `role="radiogroup"`/`role="option"` widgets lack roving `tabIndex` and arrow-key navigation; disabled dates are `disabled` radios; the custom listbox only reacts to `ArrowDown` on open. | Use native `<select>`/`<input type=radio>` or implement the full combobox/radiogroup keyboard contract. |
| **P2** | `pages/BookingPage.tsx` (name/phone/consent); `pages/ContactPage.tsx:278-345` | Every input sets `aria-invalid` but **no error text is linked** (`aria-describedby` count across `src`: 0). Screen readers announce “invalid” with no reason. | Give each error `<p>` an id and wire `aria-describedby`; add `role="alert"` or a live-region summary on submit. |
| **P2** | `components/ui/stateful-button.tsx:100-124`; `components/ui/canvas-text.tsx:20` | A generic WhatsApp-colored button and a default dental-blue canvas palette live in `components/ui/`. | Make colors props/tokens; keep UI primitives brand-neutral. |
| **P2** | `pages/ContactPage.tsx:126-146`; `pages/BookingPage.tsx:538,897`; `pages/ServicesPage.tsx:139`; `components/site/Footer.tsx:91` | WhatsApp green (`#075E54/#25D366/#DCF8C6`) hardcoded in six places. | One `--whatsapp-*` token triple driven by `site_settings.theme` or a `brand_assets` row. |
| **P3** | `pages/LegalPage.tsx:27` | Privacy/Terms are `noindex`. Legal pages are public trust content; deindexing them removes them from brand searches. | Keep indexable (or justify); only auth/app/confirmation routes should be noindex. |
| **P3** | `components/site/MobileActions.tsx`; `SiteLayout` | Mobile menu lacks focus trap and body scroll-lock; opening it leaves background links tabbable. | Trap focus, lock scroll, return focus to the toggle on close. |

---

## Pillar 4 — SEO & Core Web Vitals

| Severity | Anchor | Finding | Suggested fix |
| :--- | :--- | :--- | :--- |
| **P0** | `frontend/index.html:7-23` | Static `<title>`, description, OG and Twitter tags are hardcoded to “Klinik Pergigian Setapak · Dental care until 11 PM”. Non-JS crawlers and social/WhatsApp unfurlers get the wrong tenant for every site. | Generate `index.html` per tenant at the edge/SSR, or at minimum remove tenant-specific copy and inject host-based meta server-side. |
| **P0** | `frontend/index.html:11`; `frontend/public/og.png`; `components/site/PageMeta.tsx:23-37` | One shared 1200×630 OG card for all tenants; `og:image` is `/og.png` on every route. | Per-tenant, per-page OG generation (brand, page title, locale); include `og:image:alt`. |
| **P0** | No `robots.txt` / `sitemap.xml` anywhere in `frontend/public` or `backend`; `backend/app/main.py:95-106` | `/robots.txt` and `/sitemap.xml` return **200 + `index.html`** (verified live). No sitemap, no canonical, no `hreflang` for `en`/`zh`. | Serve real `robots.txt` (per host) and a DB-driven `sitemap.xml`; add self-referencing canonical + `hreflang` (`en-MY`, `zh-Hans-MY`, `x-default`). |
| **P0** | `client/src/App.tsx` + backend SPA fallback | The whole public site is client-rendered. Google may render it, but most social bots, Maps, and LLM crawlers do not; content is invisible without JS. Unknown routes return 200 (soft 404). | Move public routes to SSR/SSG (Next.js/Remix/Astro or Vite SSR) with host-based tenant resolution; return real 404/410 for unknown routes. |
| **P0** | `components/site/PageMeta.tsx:20-41` | Missing: canonical, `og:url`, `og:site_name`, `twitter:title`, `twitter:description`, `hreflang`. The static `og:site_name` is marked `data-rh` and may be replaced/removed once Helmet hydrates. | Extend `PageMeta` with `url`, `canonical`, `siteName`, and locale alternates. |
| **P1** | `components/site/PageMeta.tsx:44-70`; `app/SiteLayout.tsx:25` | `DentistJsonLd` is injected globally with `@type: "Dentist"` and English `dayOfWeek` names for every tenant. | Derive `@type` and localized day names from `site_settings.archetype`/`labels`; emit `LocalBusiness`/`Organization` for non-clinic archetypes. |
| **P1** | `components/site/PageMeta.tsx:47-66` | JSON-LD has no `url`, `image`, `priceRange`, `geo`, `sameAs`, or `addressLocality`/`postalCode`; `addressCountry` is hardcoded `"MY"`. | Complete the LocalBusiness graph from tenant settings. |
| **P1** | `frontend/dist/assets/*.woff2` (verified: 4× Noto Sans SC + 1× Noto Serif SC, ~12 MB of CJK font files) | Full CJK fonts ship for both languages even when a tenant is English-only. | Subset per locale at build time (`pyftsubset`/Fontsource subsets) and load CJK only when `locale === "zh"`; add `font-display: swap`. |
| **P1** | `backend/app/main.py:95-106` | `/manage` returns `index.html` with 200 and the dental title; `noindex` only exists after JS runs. | Send `X-Robots-Tag: noindex, nofollow` for `/manage/*` at the server; add `Disallow: /manage/` to `robots.txt`. |
| **P2** | `components/site/PageMeta.tsx:31`; page descriptions | Descriptions are tenant hero copy, not 140–160-char CTR copy; `HomePage` passes `spec_line`, which is a schedule/rating string. | Per-page description fields in `content`, with length linting. |
| **P2** | `pages/LegalPage.tsx:27` | Legal routes `noindex` (see Pillar 2). | Index them, or add a documented rationale. |
| **P3** | `components/ui/infinite-moving-cards.tsx`; `ReviewsCarousel.tsx` | Review cards are `<li>` text without semantic review markup; no `Review`/`AggregateRating` JSON-LD despite an on-page 4.8 claim. | Add `AggregateRating` only if the rating is verifiable; otherwise remove the claim. |

---

## Pending Approval Queue (Tier 2 — do not auto-apply)

1. **Architecture: RLS vs app-layer tenancy.** `AGENTS.md` mandates Postgres RLS, but the stack is FastAPI + SQLAlchemy (SQLite default) with `tenant_id` filters. Choose: migrate to Supabase/RLS (large, breaking) or amend the rule and add isolation tests. Blast radius: every table and query.
2. **Public rendering model.** Moving public routes to SSR/SSG touches build, hosting, and routing. Needed for the multi-tenant SEO and social-preview promises; not a safe auto-fix.
3. **Brand/token system reset.** Replacing hardcoded WhatsApp/ink colors with tokens and adding `accentOn`/`accentInk` changes the visual output of all presets. Requires a design sign-off.
4. **Auth transport change.** Moving the admin token from `sessionStorage` bearer to `HttpOnly` cookies changes the API contract (`Authorization` header → cookie + CSRF).
5. **Component decomposition.** Splitting `BookingPage` (910), `HomePage` (670), and `ContactPage` (431) is a multi-file refactor; behaviour must be preserved with tests first.
6. **Zero-PII payment refactor.** Removing `account_number` from `site_settings` changes admin settings, the public bundle, and the confirmation UI — and needs the client’s consent on how DuitNow details are delivered.

---

## Tier 1 quick wins (safe, ready after approval)

- Delete `components/ui/focus-cards.tsx` (unrendered) and the unused `.theme-editorial` toggle.
- Add `aria-describedby` + `role="alert"` to the four booking/contact error messages.
- Re-enable carousel pause on hover/focus and add a pause/play button.
- Replace `text-white/*` with `text-on-brand/*` in `.section-dark` and `Footer`.
- Remove the imperative `document.title` in `TenantProvider`; let `PageMeta` own it.
- Wrap `hover:-translate-y-*` utilities in the hover/pointer media query.
- Add `X-Robots-Tag: noindex, nofollow` for `/manage/*` and a real `robots.txt`/`sitemap.xml` route.
- Move `?tenant=` override behind a dev/demo flag.
- Add rate limiting to the proof-upload endpoint.
- Add `og:url`, `canonical`, `og:site_name` to `PageMeta` (per-tenant origin, no query params).

---

## Verification evidence

| Check | Result |
| :--- | :--- |
| `npx tsc --noEmit` | Pass, no output |
| `npx eslint .` | Pass, no output |
| `npx vitest run` | 2 files / 9 tests passed |
| Live `GET /robots.txt` (`:8011`) | `200` + HTML (`<!doctype html>`) — soft-404/HTML, not a robots file |
| Live `GET /sitemap.xml` (`:8011`) | `200` + HTML |
| Live `GET /manage` (`:8011`) | `<title>Klinik Pergigian Setapak · Johor Bahru</title>`, no server-side noindex |
| `frontend/public` | `favicon.svg`, `images/`, `og.png` only (1200×630) |
| `frontend/dist` | 13 MB; ~12 MB is CJK `.woff`/`.woff2`; largest JS chunks: React 196 K, motion 156 K, index 144 K |
| Contrast math | `carbon-sage` accent/on-accent **2.45:1**; footer white-on-primary **1.30:1**; `crimson-pearl` **2.83:1**; default slate footer **8.54:1** |
| Static scans | 0 `any`, 0 `@ts-ignore`, 0 `dangerouslySetInnerHTML`, 0 `innerHTML`/`eval`, 0 `aria-describedby` |

Not verified in this pass (no browser automation available in this session): rendered 375/768/1280 layouts, real Lighthouse trace, Google Rich Results validation, and live EN/ZH visual diff. The 60-second checklist below covers those.

---

## 60-second human browser smoke checklist

1. **Tenant resolution:** open `http://setapak-dental-jb.localhost:5173/` and then `?tenant=<other-slug>` — confirm the brand, logo, hero, services, and OG tags all change; then confirm `?tenant=` does not work on a mapped custom domain in production.
2. **Social preview:** paste `/`, `/services`, `/book` into a link previewer (or `curl -A "facebookexternalhit"` against a production build) — confirm each tenant gets its own title/image, not “Klinik Pergigian Setapak”.
3. **Theme presets:** switch `site_settings.theme.preset` to `carbon-sage` and `crimson-pearl`; check the active date/time pill, footer links, and WhatsApp buttons for unreadable text (the two known failures will be visible).
4. **Booking keyboard pass:** Tab through service listbox → 14-day strip → time slots → details; arrow keys should move within each radiogroup, and `:focus-visible` must be visible. Paste a screen reader over the name/phone errors.
5. **Reduced motion:** enable OS reduce-motion, reload `/`; hero text must be visible immediately (no blur/opacity gate), carousel/FAQ/canvas must be static.
6. **View source:** confirm `<link rel="canonical">`, `og:url`, `hreflang`, `robots.txt`, `sitemap.xml`, and `X-Robots-Tag` on `/manage` — all currently absent.
7. **Confirmation:** open a booking confirmation and inspect the URL — the `token` should not be in the query string or the `Referer` of subsequent requests.
