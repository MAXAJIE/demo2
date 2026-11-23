# 05 Data model (Multi-Tenant Postgres)

All owner-editable text uses the **`i18n` shape**: `jsonb` like `{"en":"Full Ceramic Coating","zh":"全车纳米陶瓷镀膜"}`. Helper `t(value, locale)` checks `value[locale]`, falls back to `value[default_locale]`, then the first non-empty key in `value` (so single-language entry never renders blank).

Timestamps: `timestamptz` UTC, displayed in `site_settings.timezone` (default `'Asia/Kuala_Lumpur'`). Every business table includes `id uuid pk default gen_random_uuid()`, `tenant_id uuid not null references tenants(id) on delete cascade`, `created_at`, and `updated_at`.

## Enums
- `staff_role`: `owner`, `manager`, `editor`, `front_desk`
- `business_archetype`: `appointment`, `group_session`, `catalog_order`, `showcase_lead`
- `offering_kind`: `service`, `session`, `program`, `membership`, `product`, `package`
- `booking_status`: `pending`, `confirmed`, `declined`, `cancelled`
- `booking_mode`: `approval`, `auto`
- `checkout_mode`: `none`, `external_link`, `manual_qr_proof`, `gateway_redirect`
- `lead_status`: `new`, `contacted`, `closed`

## Tables
- **tenants**: `id` uuid pk, `slug` text unique, `status` (`active` | `suspended`), `plan` text default `'starter'`.
- **tenant_domains**: `hostname` text pk (e.g. `austin-detailing.yourdomain.my` or `www.austindetailing.com.my`), `tenant_id` uuid fk, `is_primary` bool.
- **platform_admins**: `user_id` uuid pk references `auth.users`.
- **site_settings** (`tenant_id` unique):
  - `brand_name` i18n, `logo_media_id` uuid, `favicon_media_id` uuid
  - `preset_key` text, `archetype` business_archetype
  - `default_locale` text default `'en'`, `locales` text[] default `'{en,zh}'`, `timezone` text default `'Asia/Kuala_Lumpur'`
  - `theme` jsonb (CSS tokens + typography + layout preset)
  - `features` jsonb (`{"booking":true,"pricing":true,"faq":true,"blog":false}`)
  - `labels` jsonb (i18n dictionary overriding UI nouns such as `offerings_plural`, `offerings_singular`, `book_cta`, `session_label`, `staff_label`)
  - `contact` jsonb (`email`, `phone`, `whatsapp`, `address`, `map_url`, `socials`, `opening_hours`)
  - `booking_mode` booking_mode default `'approval'`, `reminder_hours` int default 24
  - `checkout_mode` checkout_mode default `'manual_qr_proof'`, `payment_config` jsonb (`qr_media_id`, `bank_name`, `account_number`, `account_holder`, `merchant_webhook_url`)
  - `analytics` jsonb, `consent_text` i18n
- **page_content**: `tenant_id` uuid, `page` text, `section` text, `data` jsonb (fields are `i18n`), `sort` int. Unique `(tenant_id, page, section)`.
- **offerings**: `tenant_id` uuid, `slug` text, `kind` offering_kind, `title` i18n, `summary` i18n, `body` i18n, `price_cents` int null, `deposit_cents` int null, `currency` text default `'MYR'`, `price_note` i18n, `checkout_url` text null, `image_media_ids` uuid[], `attributes` jsonb, `status` (`draft` | `published`), `sort` int, `seo` jsonb. Unique `(tenant_id, slug)`.
- **faq_items**: `tenant_id` uuid, `question` i18n, `answer` i18n, `offering_id` uuid null, `sort` int, `published` bool.
- **media**: `tenant_id` uuid, `storage_path` text (`{tenant_id}/...`), `alt` i18n, `width` int, `height` int, `mime` text, `size` int.
- **leads** (Zero-PII minimized): `tenant_id` uuid, `lead_ref` text, `display_name` text, `offering_id` uuid null, `summary_note` text, `locale` text, `source` text, `status` lead_status, `internal_notes` text, `consent_at` timestamptz, `ip_hash` text. *(Full contact/address/RFQ payload relayed via Edge Function webhook to merchant's private WhatsApp/Google Sheet).*
- **availability_rules** (`appointment`): `tenant_id` uuid, `weekday` int (0–6), `start_time` time, `end_time` time, `slot_minutes` int, `buffer_minutes` int, `offering_id` uuid null, `active` bool.
- **blackout_dates**: `tenant_id` uuid, `date_from` date, `date_to` date, `reason` text.
- **scheduled_sessions** (`group_session`): `tenant_id` uuid, `offering_id` uuid, `starts_at` timestamptz, `ends_at` timestamptz, `capacity` int, `host_name` text, `location` text, `cancelled` bool.
- **bookings** (Zero-PII minimized): `tenant_id` uuid, `booking_ref` text, `offering_id` uuid, `session_id` uuid null, `starts_at` timestamptz, `ends_at` timestamptz, `quantity` int default 1, `status` booking_status, `customer_display_name` text, `customer_contact_masked` text (e.g. `6012***890` for admin cross-reference), `amount_cents` int null, `payment_verified` bool default false, `locale` text, `cancel_token` text unique, `confirmed_by` uuid null, `reminder_sent_at` timestamptz null, `consent_at` timestamptz.
- **staff**, **audit_log**, **email_log**: all scoped with `tenant_id` uuid.

## Booking & Checkout Integrity
- **M2 `manual_qr_proof` Edge Function (`forward-order-proof`):** Accepts customer order/booking form + receipt image in memory, validates Turnstile + rate limit, inserts a Zero-PII tracking row (`booking_ref` / `lead_ref`), posts full details + ephemeral receipt link to the merchant's configured webhook (Make/n8n/Google Sheet) or email, discards raw PII from Postgres, and returns `booking_ref` + pre-formatted `wa.me` link so the customer notifies the merchant on WhatsApp in 1 tap.
- **M5 `create_booking` RPC (`SECURITY DEFINER`):** Enforces `tenant_id` boundaries, locks `scheduled_sessions` row (`FOR UPDATE`) or checks `availability_rules` + `tstzrange` overlap exclusion per tenant, and returns `cancel_token`.
