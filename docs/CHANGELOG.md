# Changelog

## 2026-11-21 — Language menu, FAQ breathing room and slower home reveals

- Replaced the segmented `EN / BM` pills with a compact language dropdown. The trigger shows the current code and chevron; the list shows full language names with a checkmark for the active one. Added escape/outside-click close, arrow/Home/End navigation, focus return and a mobile-safe right-aligned menu. Removed the duplicate switcher from the mobile drawer so the menu is never clipped by the drawer’s height animation.
- Moved the hours-graph “green dot = current time” remark outside the card, left-aligned beneath the graph and reduced to a single small line.
- Changed FAQ questions from Newsreader to Manrope, increased them to `1.16–1.22rem`, widened word spacing and row padding; answers now use `1.03–1.08rem` at `1.85` line-height with wider word spacing. The row stack gap increased from `0.75rem` to `1rem`.
- Slowed the homepage editorial scroll reveal from `1.15s` to `1.9s`, with a deeper blur and earlier trigger point; reduced-motion still renders instantly.
- Verification: typecheck, lint, 9/9 tests, production build; Playwright at 320/375/390/768/1024/1440 confirms the dropdown opens and selects, locale persists, Escape returns focus, FAQ has no horizontal overflow, and the hours legend sits outside the card.

## 2026-11-21 — Hours legend without the floating “Now” label

- Removed the floating “Now” text above the current-time marker in the hours graph, keeping the green vertical rule and dot.
- Added a quiet centred legend under the time axis: **Green dot = current time** (EN), **Titik hijau = masa sekarang** (MS), **绿点表示当前时间** (ZH). The legend only appears when the current-time dot is visible.
- Verification: typecheck, lint, 9/9 tests, production build; Playwright confirms the label is gone, the legend renders at 1440px and 390px, and no overflow or console errors are introduced.

## 2026-11-21 — WhatsApp buttons rest at the hover green

- All WhatsApp CTAs now use the former hover green (`#25D366`) as their resting colour, with deep ink text (`#052E1B`) and a matching border. This covers `.btn-whatsapp`, the stateful Message clinic / Open WhatsApp buttons, the contact-card action, the footer icon and the mobile action bar.
- Removed the hover background, text, border, shadow and lift changes. Hover now adds only the existing 2px ring at 3px offset — deep green `#0B3B25` on light surfaces, light green `#7BE495` on dark surfaces. No colour interpolation remains.
- Verification: typecheck, lint, 9/9 tests, production build; computed styles confirm the same green/text before and after hover, with only `outline` changing.

## 2026-11-21 — Bahasa Melayu switcher

- Replaced the `中文` language option with **BM** and moved the Setapak tenant to `locales: ["en", "ms"]`. Existing `zh` content remains in the database as a compatibility fallback, but it is no longer offered in the header or admin locale list.
- Added a complete Malay public dictionary in `frontend/src/lib/i18n.ms.ts` (navigation, booking, confirmation, contact, FAQ, legal, footer, consent, validation and accessibility labels) and a CMS translation layer in `backend/app/translations_ms.py`.
- Seeded Malay content for every page section, offering, FAQ entry and review, including the three public Google reviews with a visible “terjemahan” note. Existing databases receive the Malay layer at serialisation time; fresh seeds store it directly.
- Localised dates and times: `ms-MY` date formatting, Malay weekday names from the API, `PG` / `PTG` clock suffixes, and Malay booking WhatsApp messages. Added `malay` fallbacks for already-stored `zh` preferences so returning visitors land on the new language.
- Fixed the mobile booking step rail for the longer Malay labels: labels stack below the step number under 640px, keeping “Servis & masa”, “Butiran anda” and “Semak” readable at 320px.
- Verification: `npm run typecheck`, `npm run lint`, `npm test` (9/9), `npm run build`; Playwright at 320/375/768/1024/1280/1440 confirms the `EN / BM` switch, `lang="ms"`, persisted locale across reload, no horizontal overflow, no console errors, and Malay booking/FAQ/contact states.

## 2026-11-21 — Hours graph refresh

- Matched the supplied opening-hours reference: soft grey schedule bars, a blue bar for today, a pale-blue today row, and a green “Open now · Closes 11:00 PM” status instead of the old “7 days open” count.
- Added a live time marker: a green vertical rule, dot and “Now” label at the current position on today’s bar. The marker is derived from the clinic timezone and the closing time.
- Kept the existing staggered entrance and reduced-motion path; added `home.nowLabel` and `status.closesAt` in EN/ZH.
- Verification: typecheck, lint, production build; Playwright confirms the status text, today row, green marker and no horizontal overflow.

## 2026-11-21 — Preserved booking state and loading skeletons

- The FAQ support block is now centred under the accordion, and the “Questions about …” line plus body copy moved directly under the page heading as a small note instead of sitting in a separate right-hand column.
- Switching a service in the booking flow no longer resets the chosen date, time or the already-filled details form. Availability is reconciled only after the new service’s slots arrive; an unavailable time is cleared then, while the date and form values stay.
- Added full-page skeletons while the tenant bundle or a lazy route loads, an in-page confirmation skeleton, and a date/time skeleton while availability loads. Existing admin skeletons remain. Skeletons use the shared `skeleton` shimmer and expose `role="status"` / `aria-busy`.
- Booking’s step-one Continue control is disabled while the new service’s availability is still loading.
- Verification: typecheck, lint, 9/9 tests, production build; Playwright confirms the centred FAQ support button, note placement under the heading, preserved date/time/name/phone/consent after a service switch, skeleton presence on initial load, booking availability and confirmation, and no overflow or console errors.

## 2026-11-21 — Aceternity redirect links, smooth booking inputs and FAQ background

- Added `Link001`, the Aceternity redirect effect: the rule draws in from the left while the outward arrow rises into place. It is now used by the shared `TextLink`, the “Open in Google Maps” links on Contact/About and the “message the clinic instead” links in booking.
- Booking’s name and mobile fields now use the smooth-input caret treatment: the native caret is hidden and a spring-damped ink-blue caret tracks typing, selection and horizontal scrolling. It keeps the existing labels, errors, autocomplete hints and 44px field height, and falls back to an instant caret when reduced motion is requested.
- Reworked the FAQ to the Aceternity “Simple FAQs With Background” composition: a centered `max-w-3xl` column, left chevrons, one open row by default, and a near-white inset answer layer that sits just darker than the question card. The home FAQ teaser uses the same centered arrangement; the standalone FAQ page keeps its WhatsApp follow-up beneath the list.
- The Aceternity Pro registry entry is token-gated, so the FAQ was rebuilt in the project instead of adding a registry dependency. The interaction matches the published block preview: chevron rotation, height disclosure and a slow word-by-word text reveal inside the answer layer.
- Verification: typecheck, lint, 9/9 tests, production build; Playwright confirms the link rule/arrow at 44px, smooth caret on desktop and 390px touch emulation, booking validation still focuses/announces all three errors, step 3 reviews the typed values, FAQ opens with the near-white answer layer, the word-by-word reveal progresses across the answer (3 of 21 words at 0.5s, 11 at 1.5s, all by 2.8s), and no overflow or console errors.

## 2026-11-21 — Real Google reviews with names and ratings

- Replaced the ten generic “Google listing” cards with three public Google Maps reviews collected from the clinic listing on 2026-11-21: Food2Explore (5★), BK C (5★) and Hema Dezoz (5★).
- The review rail now shows each reviewer’s published name, their actual star rating, and the review text. English is the original; Chinese is a translation, labelled in the section copy. Only public names and review text were stored — no profile photos or profile links.
- The section copy now states that these are three of the clinic’s 853 Google reviews and points readers to Google Maps for the full set.
- Verification: typecheck, lint, 9/9 tests and production build; Playwright confirms three real cards, five-star labels, mobile/desktop rendering, Chinese translation and no console errors.

## 2026-11-21 — Hero canvas type now animates

- Restored `CanvasText` to the Aceternity source motion: the canvas `requestAnimationFrame` loop always runs, using the source sine curves (`phase`, `phase + 0.5`) and source canvas semantics.
- Removed the reduced-motion freeze for this one effect at the owner’s request, so the `11 PM` artwork keeps moving even when the device reports reduced motion. It is a deliberate, documented exception alongside the review rail.
- Kept the project path alias (`../../lib/utils`) and a stable palette reference so literal `colors` arrays do not restart the loop on every render.
- Verification: typecheck, lint, build; canvas pixel hash changes over time in light, dark and reduced-motion contexts; no console errors.

## 2026-11-21 — Audit follow-up: accessible errors and safer booking links

- Booking confirmation tokens moved out of the query string: the browser receives `/booking/<ref>#token=…`, never `?token=…`; the API sends the token in the `X-Booking-Token` header and the backend reads it from there. Added `X-Booking-Token` to the CORS allow-list.
- Contact and booking fields now link their error text with `aria-describedby`; error paragraphs carry stable ids and `role="alert"`; the consent checkboxes gained ids and invalid/describedby state.
- Mobile menu now traps Tab/Shift+Tab focus, locks body scroll while open, focuses the first link, closes on Escape and restores focus to the menu button.
- Hover lifts on booking dates/times, service cards and FAQ rows are restricted to `(hover: hover) and (pointer: fine)` so touch devices do not jump.
- Public privacy/terms pages are indexable again; `PageMeta` is now the single owner of the document title; the dead `theme-editorial` class toggle and unused `focus-cards` component were removed.
- Login rate limiting now checks both the client IP and the submitted identifier, so one shared proxy IP cannot lock every merchant out from one bucket.
- `/manage/*` responses now send `X-Robots-Tag: noindex, nofollow`.
- Verification: `typecheck`, `lint`, 9/9 tests, production build; Playwright contact validation announced error ids, mobile focus trap/scroll lock, fragment-token confirmation loads with no token in page/API URL, and touch hover lifts are suppressed.

## 2026-11-21 — CTA contrast, nav rhythm and continuous rail

- Desktop nav links now share one 44px inline-flex box and a 20px line box, so Home, Services, About, FAQ and Contact sit on the same baseline; the active underline moved inside the link box.
- Booking CTAs use the dark ink-blue treatment shown in the client reference in every state. Hover no longer changes the fill or text colour; it adds the outline/ring, keeps the 44px target and retains the lift. On the dark closing section and mobile action bar the booking CTA flips to a light surface so it stays visible.
- WhatsApp actions now gain a green `#0B3B25` outline on the bright-green hover, offset 3px so the page colour shows as a gap. On dark surfaces — the closing CTA, contact card, footer icon and mobile action bar — the ring switches to `#7BE495` so it stays visible. This covers every WhatsApp button, including the stateful Message clinic/Open WhatsApp controls.
- The review rail is now a slow, linear 80s marquee that keeps moving without pause, including when the device requests reduced motion — an explicit client request for this one rail. The light/dark cards no longer flip to dark on a light page when the OS is in dark mode; the edge mask was halved from 20% to 10%.
- The process note is now 1.05rem, medium weight and ink-coloured; the hero note is 14px medium.
- Verification: `typecheck`, `lint`, 9/9 tests, production build; Playwright light/dark/reduced-motion at 320–1440; rail moves under reduced motion at 80s, mask 10%, no controls; no overflow or console errors.

## 2026-11-21 — Infinite review rail and WhatsApp light green

- Replaced the stepped review carousel with the Aceternity `InfiniteMovingCards` rail. Ten bilingual Google-listing cards move continuously to the right at the source’s slow speed, with the source card treatment. The progress rule, previous/pause/next controls and “Read on Google” footer row were removed.
- The rail does not pause on hover (`pauseOnHover={false}`); it was later revised to keep moving under reduced motion at the client’s explicit request (see the entry above).
- Added the light-green WhatsApp action style (`#DCF8C6` surface, `#075E54` ink, `#25D366` hover) across every WhatsApp CTA, the mobile action bar, footer WhatsApp icon and service-page WhatsApp affordance.
- The hero Message clinic button now shares the same light-green/WhatsApp palette.
- Verification: typecheck, lint, 9/9 tests and production build pass; no console errors.

## 2026-11-21 — Ink-blue refinement, hover reveals and scroll type

- **Message clinic:** rebuilt on the Aceternity stateful-button interaction — loader, success check, reset — with a light-green `#D9F5E5` base, no border, and a deep-green `#0F7A3D` hover fill. Kept the project-only `redirectTo` and 44px target.
- **Double frames:** process cards now use a quiet outer tray (`#E9EEF5`) with an off-white gap and a softer inner card. The old top-left accent tab was removed; the Open map CTA uses the same frame treatment.
- **Service cards:** copy is hidden until hover or keyboard focus on pointer devices; touch and narrow screens keep it visible. Hover still shifts the artwork, lifts the card and eases in the shadow.
- **Booking:** selected date/time cards now use a clear pale-blue hover fill and accent border; controls remain 44px.
- **FAQ:** rows gained a soft glass-like white fill, hover lift/colour wash and matching chevron state, closer to the supplied Skiper reference.
- **Scroll type:** added `BlurReveal` to the home page’s editorial headings and body copy; text starts low and out of focus, then sharpens once when scrolled into view. All reduced-motion paths stay static.
- **Reviews:** the carousel now has ten labelled Google-listing cards, runs every 2.8s without pausing on pointer hover, and adds previous/play-next controls plus a position counter. No patient quotes were invented.
- **Links:** added the retracting/drawing underline treatment for inline text links, starting with “Read on Google”, “View all times” and “Contact”.
- **Lines and green:** removed the home section top/bottom rules; the WhatsApp front-desk card and mobile WhatsApp action now use WhatsApp green.
- Verification: `typecheck`, `lint`, 9/9 tests, production build; Playwright 320–1440; EN/ZH; no overflow or console errors; carousel advanced twice in 6s; hover and focus reveals measured.

## 2026-11-19 — Landing motion pass

- Replaced the FAQ plus/X toggle with a chevron that points down when closed and up when open; panels now animate height and opacity with accessible `aria-expanded` / `aria-controls` state.
- Added Motion (`motion/react`) for the animated mobile menu, FAQ disclosure, staggered section reveals, magnetic primary CTA, and press/hover micro-interactions.
- Added GSAP + ScrollTrigger for the hero entrance timeline and a subtle ring parallax on scroll.
- Added a pointer-following hero spotlight (desktop pointers only) and a soft pulse on the live open-status dot.
- All motion respects `prefers-reduced-motion`.
- Installed `motionsites` as a dev tool for future template research; its public registry currently returns 404, so no template was pulled.

## 2026-11-19 — Editorial rebuild, hardening, delivery checks

- Removed the hero eyebrow line and the pulsing "open now" pill across public pages; pages now open on the heading.
- Reworked the home hero to a two-column editorial layout with a next-available card, data-driven stats and a restrained pointer tilt/spotlight. Removed scroll-triggered section reveals in favour of static, readable sections with hover/focus states.
- Replaced the floating consent card with a slim, full-width consent bar; the privacy link is now part of the consent sentence.
- Header navigation uses a thin active underline; the brand lockup carries the neighbourhood instead of repeating it in the header.
- Services page became an editorial index with indicative pricing, deposit and quote columns; service detail gained a sticky price/booking card and a two-column fact grid.
- Booking service picker is a vertical form list; confirmation and contact pages use the same consent copy and safe external-link handling.
- Removed unverifiable copy from reviews; JSON-LD no longer publishes an aggregate rating or a hard-coded street address. CTA no longer implies same-night availability.
- Security: tightened CSP to `script-src 'self'`, added conditional HSTS, rate-limited admin login, escaped JSON-LD `<`, added `safeHttpUrl()` for map links, and covered it with tests.
- Performance: split vendor chunks (`react`, `motion`, `i18n`, `query`, `forms`, `icons`) so the entry bundle stays below the Vite warning threshold.
- Verification: `npm run typecheck && npm run lint && npm test && npm run build` (6 tests); 375/768/1280/1440 route sweep with no horizontal overflow; EN/ZH reduced-motion FAQ check; all SPA routes 200; traversal probes return the SPA shell only.

## 2026-11-19 — Revision v3: review fixes, warm editorial pass

Applied the second review pass and the supplied `demo2_revised_v2` patterns.

- Replaced the cold gray glass system with a warm porcelain palette (`#F2EFE8` page, `#16332C` deep green, `#A9761F` amber) and a serif/Manrope editorial type pairing.
- Removed every large-area blur/glass layer, the ambient background, GSAP, magnetic and scroll-progress effects. Motion is now limited to a short hero entrance, live-slot row animation and the map line draw, all gated by `prefers-reduced-motion`.
- Rebuilt the home hero around a light appointment card with live next slots, explicit availability, and a direct map/phone path. Hero H1 now uses a 320px-safe clamp and no text is clipped at 390px or 320px.
- Booking form is single-column: explicit service/date/time radiogroups, 44px time targets, summary above the submit button, error focus management, `aria-live` status, swipe date hint and a hard conflict reconcile.
- Upgraded `@hookform/resolvers` to the zod 4-compatible release. Invalid booking and contact submissions now return a `role="alert"` summary, focus the first invalid field, and no longer throw a raw `ZodError` in the console.
- Removed the numbering, repeated “same night” implication, extra review claims, rating duplication, footer staff login, mobile consent bar, hardcoded year/phone numbers and decorative background copy.
- Added a mobile sticky action bar (Book / WhatsApp / Call), a compact header language switch, and kept the mobile menu on every viewport.
- Restored a crawlable static title/description/OG fallback in `index.html`; React Helmet replaces them with per-page values. Added the generated `og.png` and refreshed the favicon.
- Added gzip to FastAPI; lazy-loaded all secondary routes; split vendor chunks; no GSAP chunk remains.
- Enforced 12px minimum interface text, 44px control targets, `aria-expanded`/`aria-controls` FAQ semantics, visible dark-surface focus rings, and a `safeHttpUrl` guard on map links.
- Removed untranslated brand-name and hardcoded-time leaks from the public shell; hours, prices, service names and FAQ copy come from the tenant API.
- Verification: `typecheck`, `lint`, `test` (9/9), `build`; Playwright at 320/360/390/768/1280/1440 across all public routes; no horizontal overflow, no console errors, reduced-motion H1 visible, missing-time alert focused.

Known limitation: no clinic, team or treatment photographs were supplied with the brief. The build contains no stock or synthetic photos; the OG card and map are original graphics. Drop real images into `frontend/public/images/` and wire them into the hero/About/service rows when available.

## 2026-11-19 — Compartment scroll system, warm stone + coral

Rebuilt the landing page around the requested 60/30/10 palette and four scroll compartments.

- **Palette locked:** `#F7F5EF` warm cream ground, `#524E48` warm-stone structure and lineframe, `#FF7849` coral for the reading progress bar, primary actions and the current sticky-card tab. Theme preset `slate-mist` and the seeded theme now carry the same values.
- **Global progress:** a fixed 2px coral bar tracks document scroll with no spring lag; it is visual-only and hidden from assistive technology.
- **Hero scale & dock:** the hero is now a 1.5px wireframe stage (65% white) that scales from 1.0 to 0.96 and rounds from 16px to 28px as the section leaves. The stage still contains the live appointment card and the same bilingual content.
- **Sticky process stack:** the three pillars are now Examination → Treatment plan → Transparent quote, rendered as pure-CSS sticky cards at 84–104px. Cards use opaque paper with the shared stone border and a coral index tab so the top card reads cleanly.
- **Subtle parallax:** the hours schedule panel translates 15px across its section; clinic facts (`Practice`, `Open`, `Deposit`) remain fixed and use the lineframe treatment. No doctor names or qualifications were invented.
- **Coral reserved:** primary form/booking actions, header Book action and current sticky tab; body copy stays stone/cream.
- **Accessibility:** reduced-motion disables the hero transform, radius interpolation and parallax; sticky positioning remains as structure. Focus rings use the darker coral-brown `--ring` for contrast.
- Updated the favicon and generated OG card to the new stone/coral palette; added the compartment rules to `docs/06-design-system.md`.
- Verification: typecheck, lint, 9/9 tests, production build, and Playwright at 320/390/1280/1440; stage scale/radius and progress width measured at four scroll positions, no horizontal overflow.

Still outstanding: no real clinic/team/treatment photography was supplied. No stock or synthetic photos were added.

## 2026-11-21 — Moss editorial, full-bleed glass, reply refinements

Refined the Setapak demo in response to the second visual review.

- Replaced the coral accent with a deeper moss palette (`#2A5F46` accent, `#223A30` structure) and made the hero, sections and map full-bleed so there are no white side gutters. Updated both the CSS token fallback and the seeded `slate-mist` theme, including the live `site_settings.theme` row.
- Switched display type from Fraunces to **Newsreader** at 500/600, with Noto Serif SC for Chinese. All `h1–h4`, brand lockup, service titles, FAQ questions and review values now share the serif display face; body stays Manrope / Noto Sans SC.
- Replaced pill controls with 14px rounded controls; retained a compact reveal treatment on the service focus cards (title, price and note appear on hover/focus, with sibling blur and a lift shadow).
- Rebuilt the hours compartment as a responsive open-hours graph (8 AM–11 PM window, seven day rows, today marker, animated bar draw, staggered blur-to-clear reveal). It remains readable at 320px and above.
- Added a Google Maps iframe embed (no API key) for the Taman Sri Tebrau address, plus the colour Google Maps mark on map links. Added `frame-src` for `www.google.com` / `maps.google.com` to the FastAPI CSP.
- Added the review carousel: 4.8 star row, two full centred cards on desktop, one full card plus half-visible blurred cards on mobile, 44px controls, pause/play, keyboard focus handling and reduced-motion autoplay suppression. The fallback cards are honest Google-listing facts; real quotes can be dropped into `reviews.items` when supplied.
- Added the sliding active indicator for primary navigation and the language switch, a clickable four-tile services grid with a “Special request” tile, and a services-only floating booking bar that slides away when the footer intersects it.
- Added a green WhatsApp treatment (brand mark + horizontal icon/label layout), colourful Google Maps icons, white-glass appointment/booking panels, slowed FAQ height/text reveal with motion blur, and the refreshed centered footer.
- Verification: `typecheck`, `lint`, `build`; Playwright at 320/375/768/1024/1280/1440/1600, EN + ZH; no horizontal overflow, no console errors, map frame loads in the production CSP, reduced-motion respected.

Known limitation: no individual Google review text was available through the public listing (the map view is limited and search results were blocked). The carousel therefore uses labelled Google-listing facts rather than invented testimonials; add the 12 review quotes to `home.reviews.items` when the clinic supplies them.

## 2026-11-21 — Motion and wizard pass

- **Service cards:** replaced the hover-only focus cards with an Aceternity-style `DirectionAwareHover` treatment. Titles, prices and notes are always visible over a moss gradient; pointer entry shifts the artwork, lifts the card and eases in a 700ms shadow. Keyboard focus gets the same lift plus a visible outline. Mobile keeps the content visible.
- **Primary buttons:** switched the `.btn-primary` / `.btn-accent` base to light green `#8FD3A8` with deep ink text and a deep-green `#0F5A35` hover. WhatsApp actions use the same light/deep pairing.
- **Header:** added a desktop services mega menu (hover and focus, Escape to close) listing live offerings, prices, opening hours and the all-services link. Mobile menu now lists the services directly.
- **Hero:** the canvas stripe highlight now waves on a 12s loop in moss and cream; the landing heading uses a slow blur-fade entrance.
- **FAQ:** added `FlipWords` rotation in the intro, staggered blur-rise rows, a slower 0.9s answer reveal and a patterned FAQ-stage background.
- **Booking:** rebuilt the single long form as a 3-step wizard (service + date/time → details → preview and confirm) with a step rail, animated step cards, a sticky selection summary, and a two-column desktop layout. Step 3 previews the entered name and phone. The date strip shows the next 14 days.
- **Reviews:** the carousel auto-advances every 4.2s with a progress rule and no user controls; it still pauses on hover/focus and respects reduced motion.
- **Contact:** added an Aceternity-style animated modal with the map, WhatsApp and Google Maps actions, both using the site icons. Map/WhatsApp buttons across the site use the same custom SVGs.
- **i18n:** EN/ZH keys for the wizard, FAQ rotation, mega menu and contact modal; Chinese 24-hour times retained.
- **Verification:** `npm run typecheck`, `npm run lint`, `npm test` (9/9), `npm run build`; Playwright production sweep at 320/375/768/1024/1280/1440 with no overflow or page errors; EN and ZH booking smoke tests; carousel auto-advance and FAQ word rotation observed. No test bookings left in the demo database.

## 2026-11-21 — Ink blue, softer booking, faster motion

- **Palette:** replaced moss with a premium ink-blue system — cool paper `#F2F5F9`, deep navy structure `#102A43`, blue accent `#1E4E79`, pale blue actions `#B7D0E6` with `#153E63` hover. Updated CSS tokens, backend `slate-mist` preset, live `site_settings.theme`, favicon, theme-color and OG card. Service artwork and button defaults were re-coloured; no brand green remains.
- **Service cards:** confirmed the title/price/note block is always rendered, not gated on hover. Hover/focus now only adds the artwork shift, lift and slow shadow.
- **Booking:** replaced the native `<select>` (and its blue OS menu) with a soft 18px custom listbox. Softened the step rail, date/time controls and selection summary into rounded inset cards; the active step uses a shared-layout `layoutId` pill, and step changes now animate in place without a blank AnimatePresence gap. Step 3 keeps the name/phone preview.
- **Motion timing:** hero heading blur-fade extended to 2s with a 24px blur; canvas stripes run on a 5.5s loop with greater amplitude; FAQ answer expands over 1.25s with a 1.3s blur reveal; reduced-motion still disables all of it.
- **Reviews:** carousel advances every 3s (progress rule follows) and cards are now text-forward Google-listing notes rather than large rating figures. The component still accepts real `home.reviews.items` comments. Google currently shows “Posting reviews is turned off” and “Suspicious high-rated reviews were recently removed” for this place, so no customer quotes were invented.
- **Verification:** typecheck, lint, 9/9 tests and production build; 320/375/768/1024/1280/1440 sweep with no overflow or page errors; EN/ZH booking smoke; custom listbox, contact modal, carousel auto-advance and canvas frame changes observed.

## 2026-11-22 — Doctors page and landing showcase

- Added a tenant-managed `doctors.intro` content section (`eyebrow`, `heading`, `body`, `items`) to the seed and to existing demo databases via an idempotent sync in `seed.py`. Each profile carries i18n name, role and bio plus a photo path, so real portraits can replace the placeholders without component edits.
- Added `/doctors`: an editorial intro followed by a 4-up portrait grid (2-up at tablet, 1-up on mobile) matching the supplied placement reference but using the live page tokens, serif display face and ink-blue theme. Added a bottom booking CTA and empty-state copy.
- Added `Doctors` to desktop, mobile and footer navigation, and a lazy-loaded route.
- Replaced the landing page's “Before treatment begins” process stack with a doctor showcase immediately below the hero. It uses the Aceternity-style `AnimatedTestimonials` interaction (stacked portrait cards, next/prev, autoplay, word-blur quote reveal) with translated labels and reduced-motion handling.
- Added `TextAnimationBlurFadeIn`, a local implementation of Aceternity's text-animation-blur-fade-in demo, and used it on the landing sections as they scroll into view. English reveals word by word; Chinese reveals character by character. `npx shadcn add @aceternity/...` could not run because the Aceternity registry requires an API token, so the component was built locally.
- Added four original SVG portrait placeholders under `frontend/public/images/` (no stock photography) and a small visible note that they are placeholders. The names Dr. Lim and Dr. Karwitta Krishnan come from existing Google reviews; the other two names and all bios are demo placeholders pending clinic confirmation (see `08-open-questions.md`).
- Verification: `npm run typecheck`, `npm run lint`, `npm test` (9/9), `npm run build`; Playwright production sweep at 320/375/768/1024/1280/1440 for `/` and `/doctors`, reduced-motion and normal motion, no horizontal overflow and no console/page errors.

### Doctor showcase follow-up

- Autoplay is always on (5s) on the landing-page doctor showcase. The previous/next arrows reset the timer but cannot pause rotation, and reduced-motion now only shortens the transition rather than disabling the swap.

### Animated testimonials source fidelity

- Restored the Aceternity component's original utilities and motion: 80px component padding, 320px portrait stage, 0.4s image transitions, 0.2s text fade, word blur stagger, 28px gray arrow controls, black/gray text and no image border. Kept only non-visual additions (typed button labels, empty guard, functional autoplay update). The landing-page section no longer overrides the component padding or prints the placeholder note under it.

### Doctor showcase contrast and link placement

- Removed the component's `dark:` variants. The site is light-only, but Tailwind's media-based dark variants were turning the doctor name white and the bio pale gray on light backgrounds for visitors whose OS was in dark mode.
- Name now uses the theme ink token, while role and bio use `text-muted` at `font-medium` so they stay readable without changing the source animation or layout.
- Moved “Meet the dentists” out of the intro column and placed it directly under the doctor portrait card, aligned with the previous/next controls.

### Header click target fix

- Added `isolate` to the `DirectionAwareHover` card root. The card’s full-bleed link uses `z-50`, which escaped the card’s stacking context and sat above the sticky header (`z-40`) while the cards scrolled underneath it, blocking nav clicks. Isolating the card keeps its internal layers contained without changing card hover or link behaviour. Verified header clicks at the overlap point and service-card navigation.
### demo2-fixes.patch applied (F1 to F9)

- Applied the review patch: per-tenant HTML head and inline site data (`backend/app/seo.py`, `main.py`), real `robots.txt` / `sitemap.xml` / 404 status / `HEAD`, rate limit keyed on the socket peer plus a stricter booking limit, staff bootstrap password from the environment, edited Malay text kept, hero canvas paused when off-screen, dead code removed (unranged CJK font imports, `@fontsource/fraunces`, `.hairline`).
- One hunk did not apply (`frontend/package.json`: LF file, CRLF hunk); the dependency line was removed by hand and `npm install` dropped the package.
- Added `doctors` to `seo.STATIC_PAGES` and `seo.SITEMAP_PAGES`: the patch's route list missed `/doctors`, which is in the header nav, so that page answered HTTP 404. Guarded by an extra assertion in `test_spa_routes_return_real_status_codes` and `test_robots_and_sitemap`.
- Gates: `tsc`, `eslint`, 13 frontend tests, `vite build`, 12 backend tests all pass; `frontend/dist/assets` contains no `noto-*-sc` files.
- Verified on a fresh SQLite copy: `/robots.txt` as text/plain, `/sitemap.xml` as XML including `/doctors`, `/nope-123` and `/services/nope` 404, `HEAD /` 200, unknown `Host` 404, `Vary: Host, X-Forwarded-Host`, inline `__SITE__` present; 24 lead POSTs with a rotating `X-Forwarded-For` give 20 accepted then 429 when uvicorn does not trust the header; `APP_ENV=production` without `ADMIN_BOOTSTRAP_PASSWORD` refuses to seed.
- Open, decisions not code: G1 to G14 in the review guide, the optional headline LCP change, the primary domain for canonical URLs, and Turnstile.
- Existing databases now get `home.seo.description` as well: `seed.ensure_seo_description` backfills the demo tenant when the page copy predates the field, so the meta description and link previews stop falling back to the hero rating line. Verified on the demo database: one row, still one row after a second seed run.
### Supabase data layer and frontend data gateway

- Added `supabase/migrations` 0001 to 0005: 15 tables with RLS on every tenant table, public reads only through definer RPCs (`site_bundle`, `availability`, `resolve_tenant_by_host`), and writes through `create_booking` (first booked wins), `cancel_booking`, `mark_whatsapp_sent`, `create_lead`, `claim_admin_invite` and `admin_overview`. Pending bookings hold their slot for 10 minutes; the slot grid starts at opening time and ends by closing; masked contacts only (Zero-PII).
- Added `tests/sql/run.mjs`: applies the real migrations and the generated seed to PGlite (Postgres 17 in WASM, no Docker) and asserts the rules above plus tenant isolation. `npm run test:sql` runs 41 checks.
- Added `scripts/sql/dump-seed.mjs`: generates `0005_seed.sql` from the demo database plus the public bundle, so Malay and Chinese strings are already filled in and locales are always en/ms/zh.
- `frontend/src/lib/api.ts` is now a facade over `frontend/src/lib/gateway/`: `rest` stays the default, and `local` (bundled seed + localStorage, demo login `owner@demo.local` / `demo1234`) runs the whole app with no backend. 13 new contract tests cover slots, holds, tokens, leads and the admin dashboard.
- The seed bundle is imported on demand, so neither the rest nor the Supabase build downloads it.
### Platform invites and the deploy guide

- Added `0006_admin.sql`: `admin_create_invite()` mints a 64-char one-time token (stored as sha256, returned once) for a tenant role or a platform admin, and `platform_overview()` returns every tenant with pending bookings, new leads and published services for the owner console. 47 PGlite checks now pass.
- Added `docs/10-deploy.md`: Cloudflare Pages + Supabase setup, environment variables, migration order, custom domain, the three local data-source modes, and the post-deploy curl matrix.

### Frontend-only architecture (backend retired)

- Retired the FastAPI + SQLite service: `backend/` moved to `archive/backend/` and nothing starts it. The demo on `:8011` is now `scripts/serve-dist.mjs` serving the static build with SPA fallback.
- Added the Supabase adapter and lazy data-source selection: `supabase` when `VITE_SUPABASE_URL` is configured, `local` (bundled seed, no backend) otherwise, `rest` only on request. The 47 KB seed and supabase-js stay out of the other modes' entry chunk.
- Added the `/platform` owner console (tenant overview, invite minting with a one-time token, invite list, members) and invite-claim on `/manage/login`. Platform-only accounts can sign in without a tenant membership.
- Updated README, AGENTS.md (architecture, no-backend rule, data-path rule, definition of done) and docs/10-deploy.md for the new shape.
### Auto-confirm and the front-desk calendar (SQL)

- `0007_autoconfirm_and_admin_booking.sql`: every booking is now `confirmed` immediately (first booked wins, no approval hop); the 10-minute pending hold is retired with the `pending` state. Added `offerings.images` (cover + detail URLs), `admin_create_booking()` for a caller booked over the phone (shares the same unique index, prepares the same WhatsApp link), `slot_available()` and `day_schedule()` (booked + free slots for one day).
- `0008_realtime.sql`: adds `bookings`, `offerings` and `site_settings` to the Supabase Realtime publication (guarded no-op under PGlite).
- `tests/sql/run.mjs` grew to 48 checks covering auto-confirm, front-desk booking (double-book and non-member refusals) and the day schedule.

### Standalone backstage (admin app split)

- Moved every backstage screen into `frontend/src/admin` with its own entry (`admin.html`) and build (`npm run build:admin` -> `frontend/dist-admin`). The tenant site no longer ships admin code (site entry 174 kB, backstage entry 74 kB + admin chunk 74 kB).
- Removed `/manage` and `/platform` from the tenant site and linked the footer to the backstage host (`VITE_BACKSTAGE_URL`); `/manage` is no longer a known site path in the Pages Functions, robots or sitemap.
- Backstage gets its own premium dark theme (`src/admin/admin.css`: deep ink surfaces, gold accent) and an icon-only rail that expands on hover while the work area blurs behind it.
- Adapter additions for the backstage: `adminCreateBooking`, `daySchedule`, `uploadServiceImage` and realtime `subscribeBookings`/`subscribeOfferings`; local demo data now auto-confirms bookings (43 frontend tests).
