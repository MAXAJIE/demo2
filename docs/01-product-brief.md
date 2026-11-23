# 01 Product brief

## What
CoreSite is a multi-tenant, bilingual (`en` + `zh`) website and conversion engine built for local SMEs in Malaysia. Instead of selling raw source code to technical buyers, the studio operates CoreSite as a **Done-For-You hosted subscription** (e.g., upfront setup fee + RM 220/month), provisioning each client in minutes inside one shared database.

## Target customers & end users
- **Tenants (paying SME clients):** High-ticket local service providers (auto detailing, dental/aesthetic clinics, tuition/workshops), F&B pre-order kitchens/bakeries, and B2B suppliers in Johor Bahru / Klang Valley who currently rely on manual WhatsApp replies and screenshot payment checks.
- **End visitors (consumers):** Local customers browsing on mobile via Google Maps, Instagram, Facebook, or TikTok to view transparent pricing, book a slot, place a pre-order, or request a quote. Visitors never create accounts.

## Universal Business Archetypes (configured via JSON preset per tenant)
| Archetype (`business_archetype`) | Target Malaysian SMEs | Offerings (`offerings`) | Conversion Flow | Primary CTA |
|---|---|---|---|---|
| `appointment` | Auto detailing, clinics, salons, 1-on-1 consultants | Services, treatments, packages | **1-on-1 time slots** (weekly rules + buffers) | Book Appointment / 立即预约 |
| `group_session` | Fitness studios, workshops, classes, seminars | Scheduled sessions, class passes | **Scheduled sessions with capacity** | Reserve a Spot / 预订名额 |
| `catalog_order` | Custom bakeries, meal prep, festive gift boxes, sample packs | Menu items, bundles, products | **Item selection + date/window + DuitNow QR / deposit** | Order Now / 立即订购 |
| `showcase_lead` | B2B hardware/packaging suppliers, contractors | Product catalog, technical specs | **RFQ / WhatsApp inquiry or external link** | Request Quote / 获取报价 |

## Phased Delivery Cutline (Fastest Path to First Paying Customers)
- **Sprint 1 — Sellable Demo & Payment MVP (`M0` + `M1` + `M2`):**
  - Multi-tenant hostname routing (`demo1.yourdomain.my`), `en` + `zh` bilingual switcher, mobile-first conversion pages (Landing, Offerings, Offering Detail, FAQ, Legal), and **`manual_qr_proof` checkout** (displays merchant DuitNow QR + bank copy button + receipt upload forwarded directly to merchant WhatsApp/Google Sheet without storing PII).
  - *Goal:* Generate live interactive demo URLs for JB merchants in 10 minutes to close initial clients.
- **Sprint 2 — Self-Serve Merchant Admin (`M3`):**
  - Tenant-scoped admin panel so merchants (or studio operator) can edit prices, text, images, DuitNow QR, and theme presets without code deploys.
- **Sprint 3 — WhatsApp & Booking Automation (`M4` + `M5` + `M6` + `M8`):**
  - Automated WhatsApp pre-filled order/booking handoff + Resend email backup, atomic slot/capacity locking (`appointment` & `group_session`), and full Malaysia industry seed presets.
- **Intentionally Excluded (`M7` Removed):**
  - Self-serve buyer setup wizard and automated multi-project provisioning CLI are removed. New tenants are onboarded via a single SQL seed script / super-admin CLI in under 5 minutes.

## Phase 2 (design for it, do not build now)
Native FPX/e-wallet webhooks (Billplz / HitPay) · Bahasa Melayu (`ms`) third locale pack · blog module · block page builder · `auto` booking confirmation UI · Cal.com embed.
