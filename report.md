# CoreSite Malaysia — Webpage Re-evaluation (Revision 3)

**Generated:** 2026-11-21 18:25 (Asia/Kuala_Lumpur)
**Scope:** current working tree — public site + `/manage`, FastAPI delivery layer
**Supersedes:** `report.md` rev. 2 (14:46) and `docs/audits/2026-11-21-senior-webpage-audit.md`
**Skills applied:** `senior-webpage-audit`, `hallmark`, `unslop`, `design-taste-frontend`
**Code changes made:** none.
**Out of scope:** the continuous review rail and the always-moving hero canvas are documented owner decisions; they are not assessed as defects here.

---

## 1. Executive verdict

This pass was substantial and mostly corrective. Verified as fixed since 14:46:

- Booking tokens moved out of the query string (`#token` + `X-Booking-Token`).
- `aria-describedby` + `role="alert"` wired on every booking/contact error.
- Mobile menu focus trap, scroll lock, Escape close, focus restore.
- Hover lifts restricted to `(hover: hover) and (pointer: fine)`.
- Legal pages indexable again; `PageMeta` owns the title.
- Dead `theme-editorial` class and `focus-cards` component removed.
- Login rate limit now keys on IP **and** identifier.
- `X-Robots-Tag: noindex, nofollow` on `/manage/*`.
- Full-page, route, availability and confirmation skeletons with `role="status"`.
- Booking date/time/details survive a service switch.

Remaining blockers are the same structural ones: the tenant brand/industry is still hardcoded, there is still no crawlable SEO surface, the theme contract is still bypassed by literal colors (two presets fail AA), and the merchant bank-account field is still part of the public payment contract.

**Overall: 6.0 / 10 — WARN.** No new regressions this pass.

---

## 2. Scorecard

| Pillar | Score | Δ vs rev. 2 | Status | Driver |
| :--- | :---: | :---: | :--- | :--- |
| 1. Code Hygiene | **7/10** | ▲1 | WARN | Dead code removed, skeletons added; 959/682/448-line pages, hardcoded copy, unused media fields |
| 2. UI & Motion Craft | **7/10** | ▲2 | WARN | Error semantics, focus trap, hover guards, skeletons fixed; theme contrast and hero LCP remain |
| 3. Auth & Cybersecurity | **7/10** | ▲1 | WARN | Token transport + noindex fixed; payment PII, sessionStorage, spoofable XFF, tenant override remain |
| 4. SEO & Web Vitals | 3/10 | — | **BLOCK** | Client-only rendering, hardcoded tenant meta, no canonical/robots/sitemap/hreflang, 12 MB fonts |

---

## 3. Verified fixes (current tree)

| Item | Evidence |
| :--- | :--- |
| Confirmation token no longer in URL query | `pages/BookingPage.tsx:235` (`#token=`), `lib/api.ts:135` (`X-Booking-Token`), `backend/app/main.py:42` CORS allow-list |
| Error text announced | `pages/BookingPage.tsx:740,769,792`, `pages/ContactPage.tsx:282,303,324,346`; `role="alert"` on each error `<p>` |
| Mobile menu focus trap | `components/site/Header.tsx:105-142` |
| Touch-safe hover lifts | `index.css:113` media query + `hover-lift-md` usage |
| Legal pages indexable | `pages/LegalPage.tsx:27` no `noindex` |
| Title ownership | `PageMeta` only; `TenantProvider` has no `document.title` |
| Dead code removed | `focus-cards.tsx` gone; `theme-editorial` gone from `TenantProvider` |
| Login limit | `backend/app/routers/admin.py:99-104` (IP + identifier) |
| `/manage` noindex | `backend/app/main.py:70`; verified live header |
| Skeletons | `components/site/Skeletons.tsx`, route + availability + confirmation states |
| Booking state preserved | Changelog + `pages/BookingPage.tsx` reconciliation logic |

Checks: `tsc --noEmit` pass · `eslint .` pass · 9/9 tests pass · `vite build` 8.48 s pass.

---

## 4. P0 — must fix before ship

### 4.1 Every tenant is still a dental clinic

- **Where:** `frontend/index.html:7-23`; `components/site/Logo.tsx:3,36`; `components/site/PageMeta.tsx:60`; `pages/HomePage.tsx:64-99,150-151`; `components/site/MobileActions.tsx:18-19`; `pages/ContactPage.tsx:105`; `pages/AboutPage.tsx:20`; `pages/FaqPage.tsx:19`; `lib/i18n.ts:222,271,512,625,673,681`
- **What:** static title/OG say “Klinik Pergigian Setapak · Dental care until 11 PM”; tooth logo; `@type: "Dentist"`; tooth SVG art; “dental slot”/“看诊” WhatsApp prefills.
- **Fix:** tenant-generated HTML/meta, neutral logo fallback, archetype-driven JSON-LD, generic copy from `i18n`/`labels`.

### 4.2 No crawlable multi-tenant SEO surface

- **Where:** `frontend/index.html`; `components/site/PageMeta.tsx` (0 canonical / `og:url` / `hreflang`); `backend/app/main.py:97-106`; `frontend/public` (no robots/sitemap)
- **Verified live:** `/robots.txt` and `/sitemap.xml` → `200 text/html`; `/manage` correct `X-Robots-Tag` now, but `/manage` HTML is still the Setapak title.
- **Fix:** per-host SSR/edge HTML, real robots + DB sitemap, canonical/`og:url`/`hreflang`, real 404 statuses.

### 4.3 Theme bypass and preset contrast failures

- **Where:** `index.css:6-9` (`--hours-*`), `:127-173` (buttons), `:220,228`, `:374`, `:409-410`; `components/site/Footer.tsx:45-120`; `pages/HomePage.tsx:47-99,203-205,227`; `pages/ContactPage.tsx:126-146`; `components/site/ReviewsCarousel.tsx:109`; `app/TenantProvider.tsx:38-51`; `types.ts:5-17`
- **What:** `applyTheme` writes 10 tokens only; `ThemeTokens` has no `accentOn`/`accentInk`; `--hours-*` are global and never tenant-driven; footer hardcodes `text-white/*`.
- **Measured:** `carbon-sage` accent text **2.45:1**, `crimson-pearl` **2.83:1**, footer on `carbon-sage` primary **1.30:1**. `slate-mist` is 8.54:1.
- **Fix:** add `accentOn`/`accentInk` + `hours` tokens to the contract, replace `text-white/*` with `text-on-brand/*`, add per-preset contrast tests.

### 4.4 Zero-PII payment field still exposed

- **Where:** `backend/app/services/tenant.py:81-92,373`; `backend/app/routers/admin.py:77`; `types.ts:46-52`
- **What:** `account_number`/`account_holder` are storable in `site_settings.payment_config` and serialized into public `/api/v1/site`. Demo values are empty (`configured: false`), but the contract permits it. Admin payload also returns `merchant_webhook_url`.
- **Fix:** remove the field from storage/public bundle; merchant-owned payment link or owner-only endpoint; mask the webhook URL.

---

## 5. P1 / P2 — remaining

| Severity | Anchor | Finding | Fix |
| :--- | :--- | :--- | :--- |
| P1 | `components/ui/smooth-input.tsx:210` | Native caret hidden (`caretColor: transparent`) with a motion caret; no forced-colors fallback | Keep native caret for forced-colors/touch, or gate the enhancement |
| P1 | `pages/HomePage.tsx:197,226` | Hero text starts at `opacity: 0` + 24 px blur; LCP waits on JS | Render text visible at first paint; animate only transform/opacity |
| P1 | `components/site/Header.tsx:369`; `components/site/FaqAccordion.tsx:91`; `pages/BookingPage.tsx:404` | Animates `height: auto` and `layout` | `grid-template-rows` / transform-only transitions |
| P1 | `pages/BookingPage.tsx` (959), `HomePage.tsx` (682), `ContactPage.tsx` (448) | 2–4× the 250-line threshold | Split into step/section components (Tier 2) |
| P1 | `App.tsx` / routing | Client-only render; unknown paths return HTTP 200 | SSR/SSG + real 404s |
| P1 | `frontend/dist` | 13 MB build; **12 MB** CJK fonts | Subset per locale, load CJK only for `zh` |
| P1 | `app/TenantProvider.tsx:19`; `backend/app/services/tenant.py:43-47` | `?tenant=` overrides host resolution for reads and writes | Disable outside demo/dev |
| P1 | `lib/api.ts:27,35` | Admin token in `sessionStorage` | HttpOnly cookie + CSRF, or documented risk acceptance |
| P1 | `backend/app/routers/public.py:61-65` | Public rate limit trusts spoofable `X-Forwarded-For` | Trusted proxy extraction |
| P1 | Architecture | No Postgres RLS despite `AGENTS.md` | RLS migration or amend the rule + isolation tests |
| P2 | `docs/06-design-system.md:28` vs `src/lib/*.test.ts` | “Contrast enforced in tests” — only 2 test files, none cover themes | Add preset contrast tests |
| P2 | `backend/app/models.py:138` | `Offering.image_media_ids` exists but is never serialized or exposed | Wire it (see §6) |
| P2 | `frontend/index.html`; `PageMeta.tsx:23-37` | One shared `og.png` for every tenant; no `og:url`/canonical | Per-tenant OG + canonical |
| P2 | `PageMeta.tsx:47-68` | English `dayOfWeek`, hardcoded `addressCountry: "MY"` | Localize + tenant settings |
| P3 | `pages/LegalPage.tsx` etc. | Meta descriptions use hero copy, not 140–160-char copy | Dedicated `seo.description` fields |

---

## 6. Image placement plan (the sketch you asked for)

### 6.1 The core rule

The page already has **four natural image-shaped holes**. Use those instead of inserting new ones:

1. The three home service cards currently hold abstract SVG art → replace with photos. **Zero layout change, least abrupt.**
2. The services list cards are text-only → add a card-top image. Standard, expected.
3. The service detail header has no visual → add one banner at the section boundary.
4. About and Contact each have an empty visual role in an existing column/card.

**Do not add a hero photo by default.** The hero is a centered text composition with the canvas highlight and the appointment card overlapping it; a photo there would compete with the H1, push the appointment card down, and delay LCP. If a hero photo is required, use the optional right-column variant in §6.6.

### 6.2 Slot table

| # | Page / section | Placement | Ratio | Sizes | Loading | Content |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | Home → 3 service cards | replaces SVG art, full card | **4:5** | 480 / 800 / 1200 | lazy | one photo per offering (room, tool, result) |
| 2 | Home → process section | left column, under the note | **3:2** | 600 / 900 / 1400 | lazy | team at work / front desk |
| 3 | Services list | card header, above the number row | **16:10** | 600 / 900 / 1200 | lazy | offering photo |
| 4 | Service detail | after the header block, before body | **16:9** | 900 / 1400 / 1800 | lazy | service/room/result |
| 5 | About | right column, under the motto | **4:3** | 800 / 1200 | lazy | team or clinic |
| 6 | Contact | inside the “visit” card, above address | **3:2** | 800 / 1200 | lazy | shopfront / entrance |
| 7 | Booking | **none** (optional 16:9 selected-service thumb in summary) | 16:9 | 600 | lazy | skip in MVP |
| 8 | Confirmation | existing QR only | — | — | — | no extra |
| — | FAQ, legal, admin | **no images** | — | — | — | text/utility pages |

### 6.3 Home — desktop

```
┌──────────────────────────────────────────────────────────────┐
│ HEADER                                                       │
├──────────────────────────────────────────────────────────────┤
│                    eyebrow                                   │
│                 H1 (11 PM canvas)                            │
│              ★ 4.8 · Book · WhatsApp                         │
│   ┌──────────── appointment card ─────────────────────────┐  │
│   │ hours | next slots | address + map CTA                │  │
│   └───────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────────┤
│ PROCESS 0.72fr                     STICKY CARDS 1.28fr      │
│ H2                                 ┌ 01 ──────────────────┐  │
│ note                               └──────────────────────┘  │
│ ┌────────────────────┐             ┌ 02 ──────────────────┐  │
│ │ IMG 3:2            │             └──────────────────────┘  │
│ │ team / front desk  │             ┌ 03 ──────────────────┐  │
│ └────────────────────┘             └──────────────────────┘  │
├──────────────────────────────────────────────────────────────┤
│ SERVICES heading                                View all →   │
│ ┌ IMG 4:5 ─────────┐ ┌ IMG 4:5 ─────────┐ ┌ IMG 4:5 ──────┐ │
│ │ title / price    │ │ title / price    │ │ title / price │ │
│ └──────────────────┘ └──────────────────┘ └───────────────┘ │
├──────────────────────────────────────────────────────────────┤
│ HOURS copy            │  HoursGraph        (no new image)    │
├──────────────────────────────────────────────────────────────┤
│ REVIEWS rail                          (existing, no change)  │
├──────────────────────────────────────────────────────────────┤
│ LOCATION copy         │  Map iframe        (no new image)    │
├──────────────────────────────────────────────────────────────┤
│ FAQ (no image)                                               │
├──────────────────────────────────────────────────────────────┤
│ CTA band (no image)                                          │
└──────────────────────────────────────────────────────────────┘
```

Why this is not abrupt: image 1 replaces an existing visual at the same size; image 2 sits in the text column under the note, aligned to the column edge; both share the card radius and the section’s 24 px rhythm.

### 6.4 Home — mobile

```
HEADER
eyebrow / H1 / rating / CTA
[appointment card]
──────────────────────
PROCESS H2
note
[IMG 3:2 team]
01 card
02 card
03 card
──────────────────────
SERVICES H2
[IMG 4:5] title · price   ← one card per row
...
```

On mobile the process photo comes **after the heading and note**, never between the eyebrow and H1. Service cards keep the 4:5 crop so all three rows feel like one set.

### 6.5 Services list / Service detail

```
SERVICES
H1                              body copy
────────────────────────────────────────────
┌ card ──────────────┐   ┌ card ──────────────┐
│ IMG 16:10          │   │ IMG 16:10          │
│ 01 · 45 min        │   │ 02 · 60 min        │
│ Title              │   │ Title              │
│ summary            │   │ summary            │
│ price        →     │   │ price        →     │
└────────────────────┘   └────────────────────┘
...                      ┌ Special request ──┐
                         │ (keep solid, no   │
                         │  photo)           │
                         └───────────────────┘

SERVICE DETAIL
Back to all
┌───────────────────────────────┬──────────────────┐
│ H1                            │ Price / booking  │
│ summary                       │ (sticky)         │
│ [duration|format|deposit|..]  │                  │
└───────────────────────────────┴──────────────────┘
┌──────────────────────────────────────────────────┐
│ IMG 16:9  service / room / result                │
└──────────────────────────────────────────────────┘
About this service (body) ...
```

The detail image is a **section boundary**, not an insertion into copy: header → image → body. On mobile it falls between the header and the body, after the price card, which is the natural break.

### 6.6 About / Contact (+ optional hero)

```
ABOUT
┌──────────────────────────┬────────────────────────────┐
│ H1                       │ MOTTO                      │
│                          │ ┌────────────────────────┐ │
│                          │ │ IMG 4:3 team/clinic    │ │
│                          │ └────────────────────────┘ │
├──────────────────────────┴────────────────────────────┤
│ paragraphs               │ contact aside (sticky)     │
│ CTA                      │ address / hours / phone    │
└───────────────────────────────────────────────────────┘

CONTACT
H1 / intro
───────────────────────────────────────────────
┌ WhatsApp card ──────────┐  ┌ Form ──────────────┐
├─────────────────────────┤  │ ...                │
│ ┌─────────────────────┐ │  │                    │
│ │ IMG 3:2 storefront  │ │  │                    │
│ └─────────────────────┘ │  │                    │
│ address / hours / phone │  │                    │
└─────────────────────────┘  └────────────────────┘
```

The About photo belongs to the motto column, so it reads as part of the page header. The Contact photo is the header of the “where to find us” card — people see the shopfront immediately above the address.

**Optional hero variant** (only if a strong photo exists; ≥1280 only):

```
┌───────────────────────────────┬──────────────────────┐
│ eyebrow                       │                      │
│ H1 (canvas)                   │   IMG 4:5            │
│ rating / CTA / WhatsApp       │   clinic interior    │
│                               │                      │
├───────────────────────────────┴──────────────────────┤
│ appointment card (full width under both columns)     │
└──────────────────────────────────────────────────────┘
```

If you use this variant, the image is the LCP element: `fetchpriority="high"`, no blur-in, explicit 4:5 box, and a max 250 KB AVIF/WebP.

### 6.7 What would feel abrupt — avoid these

1. A photo between the H1 and its summary, or between a form label and its field.
2. A photo behind the hero headline or appointment card.
3. A full-bleed photo band between the CTA section and the footer.
4. Mixed aspect ratios inside the 3-card row or the 2-column services grid.
5. A photo between the FAQ question and its answer, or inside the booking wizard.
6. Stock photos of other businesses/people; inconsistent color grading across cards.
7. Text over a busy photo without the existing dark scrim.
8. A photo that pushes the appointment card or the contact form below the fold on mobile.

### 6.8 Data model and admin (so this is tenant-driven)

The DB already has a hook: `backend/app/models.py:138` (`Offering.image_media_ids`, JSON, unused). Wire it rather than hardcoding paths.

```
Offering (public serialize)
  image: { url, width, height, alt: { en, zh }, focal: { x, y } } | null

PageContent.data.media
  home_process:   { ...image }
  about_team:     { ...image }
  contact_store:  { ...image }
  og_image:       { ...image }   // 1200×630 per tenant

SiteSettings / Media
  media rows: tenant_id, storage_path, mime, width, height, blurhash
  storage:    tenant/<id>/...   (EXIF stripped, no customer photos)
```

Admin: the design doc already reserves a **Media** tab (`docs/06-design-system.md:41`). Add upload or URL, crop/focal point, EN/ZH alt text, delete, and an OG image slot. Keep `customer`/receipt images out of this store (Zero-PII).

### 6.9 Suggested rollout order

| Phase | Slot | Why first |
| :--- | :--- | :--- |
| 1 | Home service cards (3) | Replaces existing art, highest visual payoff, zero layout risk |
| 2 | Services list card headers | Makes the catalogue scannable |
| 3 | Service detail banner | Gives each offering a landing visual |
| 4 | About team photo | Human trust, natural motto column |
| 5 | Contact storefront | “Recognise the shopfront” before visiting |
| 6 | Optional hero variant | Only with a strong photo and LCP budget |

---

## 7. Verification evidence (fresh)

| Check | Result |
| :--- | :--- |
| `npx tsc --noEmit` | Pass |
| `npx eslint .` | Pass |
| `npx vitest run` | 2 files / 9 tests pass |
| `npx vite build` | Pass, 8.48 s; entry 151.9 kB (50.6 kB gzip) |
| `frontend/dist` | 13 MB; 12 MB CJK fonts; one 1200×630 `og.png` |
| `GET /robots.txt` / `/sitemap.xml` | `200 text/html` (still not real files) |
| `GET /manage` | `200`, Setapak title, `x-robots-tag: noindex, nofollow` ✔ |
| `/api/v1/site` payment | `account_number: ""`, `configured: false` (field still exposed) |
| `frontend/public/images` | empty (no tenant imagery yet) |
| Contrast | primary 14.64 · dark CTA 14.11 · WhatsApp 6.68/7.49 · carbon accent 2.45 · crimson 2.83 · carbon footer 1.30 |
| Static scans | 0 `any`, 0 `@ts-ignore`, 0 `dangerouslySetInnerHTML`/`eval` |

Not re-verified: rendered 320–1440 layouts, Lighthouse/CWV trace, Rich Results, screen-reader pass (no browser automation in this session).

---

## 8. 60-second smoke checklist

1. **Image slots:** after wiring one offering image, confirm the card keeps its 4:5 box (no CLS), the copy overlay still has a readable scrim, and mobile keeps copy visible.
2. **Process photo:** confirm it sits under the note in the left column and does not overlap the sticky cards at 768–1024 px.
3. **Service detail:** confirm the 16:9 banner sits between the price card row and the body, not inside the summary.
4. **About/Contact:** confirm the photos align to the motto/aside columns and do not push the booking CTA below the fold on mobile.
5. **Theme:** switch `carbon-sage` and `crimson-pearl`; confirm accents, footer, and the hours graph (blue/green tokens) follow the tenant.
6. **Tenant:** open `?tenant=<other>` and a second host; confirm title/logo/JSON-LD/OG change (they still won’t).
7. **SEO:** `curl -i /robots.txt`, `/sitemap.xml`, `/manage`; confirm content types and `X-Robots-Tag`.
8. **Caret:** tab into name/phone with Windows High Contrast or forced colors; confirm a caret is still visible.
