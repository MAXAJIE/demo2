# 06 Design system — "clean, minimal, premium"

Built so any Malaysian SME (auto studio, clinic, bakery, B2B supplier) immediately looks like an authoritative, modern brand—elevating them above generic Facebook/Linktree pages.

## Direction in one line
Confident, calm, spacious. Big tight headlines, one quiet supporting spec line, generous whitespace, soft rounded surfaces, restrained color used by the **60/30/10 rule** (60% main background, 30% secondary surface, 10% accent/action).

## Visual language
- **Hero:** One punchy headline (2–5 words in EN or 4–10 characters in ZH) + a single concrete spec-style sub-line (e.g., *"9H Ceramic Coating. 2-Year Warranty. Mount Austin JB."* / *"全车纳米镀膜 · 两年质保 · 新山 Mount Austin"*).
- **Stat row:** Large metric number + small unit + tiny label underneath (e.g., `4.9 ★ GOOGLE RATING` · `1,200+ CARS SERVED` · `24 HR TURNAROUND`).
- **Surfaces:** Soft frosted/elevated cards (`22px` radius), `16px` controls (not pill buttons), subtle corner meta tags (`01 · FEATURED`).
- **Imagery:** Subtle optional tint/duotone overlay token so smartphone photos taken by local business owners blend harmoniously into the theme palette.
- **Avoid:** Garish neon colors, cluttered banners, flashing popups, or more than one accent color.

## Tokens (CSS variables; written by the admin theme editor)
`--bg`, `--surface`, `--surface-2`, `--text`, `--text-muted`, `--primary`, `--on-primary`, `--accent`, `--border`, `--ring`
- Radius: `--radius-card: 22px`, `--radius-control: 16px`; regular buttons use `16px`. The stateful WhatsApp/Message button is intentionally a pill so its loader/check can resize cleanly.
- Spacing: 8-pt scale. Max content width: `1200px`. Shadows: one soft elevation shadow only.

## Theme presets (Phase 1 ships these four)
| Preset | bg | surface | text | primary / on-primary | accent | best suited for |
|---|---|---|---|---|---|---|
| **slate-mist** (default, setapak) | `#F2F5F9` | `#FAFBFD` | `#122033` | `#102A43` / `#F2F5F9` | `#1E4E79` | Clinics, dental, B2B suppliers, professional services |
| **carbon-sage** (dark) | `#2B3140` | `#353C4D` | `#B8C7C0` | `#B8C7C0` / `#2B3140` | `#8FA79B` | Auto detailing, gyms/studios, tech, luxury |
| **crimson-pearl** | `#F2F1ED` | `#FAF9F6` | `#161616` | `#710014` / `#F2F1ED` | `#B38F6F` | Aesthetic clinics, salons, festive gift boxes |
| **sandalwood-plum** | `#E7D4BB` | `#F1E5D2` | `#101211` | `#48252F` / `#E7D4BB` | `#857861` | Artisan bakeries, cafes, wellness, hospitality |

**Contrast rule (enforced in tests & admin UI):** Every preset must pass WCAG AA: body text on `--bg`/`--surface` >= 4.5:1, large text and UI controls >= 3:1, `--on-primary` on `--primary` >= 4.5:1.

## Bilingual Typography (`en` + `ms`)
Setapak ships English and Bahasa Melayu. The font stack still carries self-hosted `Noto Sans SC` / `Noto Serif SC` as a compatibility fallback for legacy `zh` content, but the switcher only offers `en` and `ms`:
1. **Modern (default):** Display `Manrope` 700–800 + `Noto Sans SC` 700 · Body `Inter` 400/500 + `Noto Sans SC` 400/500
2. **Editorial luxury (default editorial / Setapak):** Display `Newsreader` 500–600 + `Noto Serif SC` 600 · Body `Manrope` + `Noto Sans SC`
3. **Industrial / Bold:** Display `Barlow Condensed` 700 + `Noto Sans SC` 700 · Body `Barlow` + `Noto Sans SC`
Scale: fluid `clamp()`; hero `48–104px` (auto-scaled slightly tighter for `zh` characters), h2 `32–52px`, body `16–18px`, line-height `1.55` (optimal for mixed EN/MS readability; the legacy ZH fallback keeps its taller 1.72 line-height).

## Page blueprints
- **Landing:** Hero (headline, spec line, primary CTA + WhatsApp CTA, image) -> stat row -> 3 value pillars -> featured offerings grid -> Google rating/reviews proof -> FAQ teaser -> conversion CTA band -> footer.
- **Offering detail:** Split screen: gallery left; title, RM price/deposit, primary CTA (Book / Order / Request Quote), inclusions list, dynamic spec table, offering FAQ.
- **Checkout / Booking Drawer or Page:** Two column; interactive selection + DuitNow QR / receipt proof upload (or slot picker in M5) + business hours, address, Google Maps link, direct WhatsApp button.
- **Admin:** Fixed sidebar (Dashboard, Offerings, Pages, Media, Bookings/Orders, Leads/RFQs, Theme & Labels, Settings, Staff), neutral UI inheriting active theme tokens.

## Motion & Accessibility
Entrances use a short fade + rise or blur-to-clear; actions animate on hover/focus only. The review rail is a continuous `InfiniteMovingCards` marquee at 80s per loop. At the client’s explicit request it keeps moving even when `prefers-reduced-motion` is active; every other motion component respects the preference.

## Scroll and motion system (setapak)

The landing page is full-bleed and section-led. Motion is limited to entrances, hover/focus feedback, the hours graph and the review rail; there is no scroll-jacking.

| Area | Effect | Implementation |
| --- | --- | --- |
| Loading | Skeleton surfaces | `Skeletons.tsx` and the shared `.skeleton` shimmer for tenant bundle, lazy routes, confirmation and availability |
| Global | 2px ink-blue reading progress | `ScrollProgress.tsx`, `useScroll().scrollYProgress`, fixed above the header |
| Home hero | Spotlight + canvas highlight | `Spotlight` gradients and `CanvasText` on the `11 PM` phrase; the canvas keeps moving by explicit client request (documented reduced-motion exception) |
| Home hours | Open-hours graph | `HoursGraph.tsx`; soft grey bars, blue today bar, pale today row, green open-now status and a timezone-aware green dot; a small left-aligned legend sits outside the card under the graph, and bars draw on first view |
| Home process | Sticky stack | Three `position: sticky` cards, `top: 84–104px`; a quiet outer tray + off-white inner card (double frame), no accent tab |
| FAQ | Aceternity simple FAQ | Centered `max-w-3xl` column, left chevron, one open row by default, a near-white inset answer layer and height/opacity disclosure plus a slow word-by-word reveal; questions use Manrope at 1.16–1.22rem with wider word spacing, and answers use 1.03–1.08rem at 1.85 line-height; both home and `/faq` use it |
| Redirect links | Aceternity `Link001` | Rule draws from the left while the arrow rises; shared `TextLink`, Google Maps links and booking WhatsApp links |
| Language | Dropdown selector | Header `EN` / `BM` trigger opens a listbox of full language names; keyboard arrows, Home/End, Escape, outside-click close and focus return |
| Booking inputs | Smooth caret | Spring-tracked custom caret on name and mobile fields; native caret hidden, selection/scroll aware, instant under reduced motion |
| Reviews | Infinite moving rail | Three public Google reviews with reviewer names, 5-star ratings and English/Malay text in a continuous left-moving Aceternity rail; 80s linear loop, 10% edge mask, no controls, keeps moving by explicit client request |
| Services | Direction-aware cards and float bar | Text stays visible; pointer entry shifts the artwork, lifts the card and eases in a 700ms shadow; keyboard focus gets the same lift |

Glass is limited to the appointment card, header shell, booking panel and services float bar; each has an `@supports not (backdrop-filter)` fallback. The accent is reserved for actions, active indicators and the progress bar. Every other motion component checks `useReducedMotion()`; the review rail and hero canvas are documented exceptions requested by the client. Sticky positioning remains because it is structural.
