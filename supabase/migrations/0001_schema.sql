-- 0001_schema.sql — CoreSite multi-tenant schema (Postgres 15+, Supabase compatible)
--
-- Every business table carries tenant_id with on delete cascade. Identity comes
-- from Supabase Auth (auth.users); authorisation lives in tenant_members,
-- platform_admins and admin_invites (see docs/09-admin-access.md).
--
-- No extensions are required: gen_random_uuid() is core since Postgres 13. Host
-- and email comparisons use lower() indexes instead of citext so the schema runs
-- unchanged on PGlite (used by tests/sql) and on Supabase.
--
-- Zero-PII: bookings and leads store a masked contact only. The full phone number
-- exists only in the request that builds the WhatsApp link.

begin;

-- Shared updated_at trigger.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Tenants and routing
-- ---------------------------------------------------------------------------
create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,79}$'),
  status text not null default 'active' check (status in ('active', 'paused', 'archived')),
  plan text not null default 'starter' check (plan in ('starter', 'growth', 'pro')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.tenants is 'One row per paying SME. Never exposed to anon: resolve through resolve_tenant_by_host()/site_bundle().';

create table public.tenant_domains (
  hostname text primary key check (hostname = lower(hostname) and hostname <> ''),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);
create index tenant_domains_tenant_idx on public.tenant_domains (tenant_id);
create unique index tenant_domains_one_primary on public.tenant_domains (tenant_id) where is_primary;
comment on table public.tenant_domains is 'Hostnames that resolve to a tenant; exactly one primary per tenant becomes the canonical origin.';

-- ---------------------------------------------------------------------------
-- Site configuration and content
-- ---------------------------------------------------------------------------
create table public.site_settings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null unique references public.tenants(id) on delete cascade,
  brand_name jsonb not null default '{}'::jsonb,
  preset_key text not null default 'appointment',
  archetype text not null default 'appointment'
    check (archetype in ('appointment', 'group_session', 'catalog_order', 'showcase_lead')),
  default_locale text not null default 'en' check (default_locale in ('en', 'ms', 'zh')),
  locales jsonb not null default '["en"]'::jsonb
    check (jsonb_typeof(locales) = 'array' and jsonb_array_length(locales) > 0),
  timezone text not null default 'Asia/Kuala_Lumpur',
  theme jsonb not null default '{}'::jsonb,
  features jsonb not null default '{}'::jsonb,
  labels jsonb not null default '{}'::jsonb,
  contact jsonb not null default '{}'::jsonb,
  booking_mode text not null default 'approval' check (booking_mode in ('approval', 'auto')),
  reminder_hours integer not null default 24 check (reminder_hours between 0 and 240),
  checkout_mode text not null default 'manual_qr_proof'
    check (checkout_mode in ('none', 'manual_qr_proof', 'deposit_online')),
  payment_config jsonb not null default '{}'::jsonb,
  analytics jsonb not null default '{}'::jsonb,
  consent_text jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on column public.site_settings.contact is 'Free-form i18n contact block. closes_at ("HH:MM") caps the slot grid and replaces availability_rules.end_time for the last start.';

create table public.page_content (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  page text not null check (page ~ '^[a-z][a-z0-9_]{1,59}$'),
  section text not null check (section ~ '^[a-z][a-z0-9_]{1,59}$'),
  data jsonb not null default '{}'::jsonb,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, page, section)
);
create index page_content_tenant_page_idx on public.page_content (tenant_id, page, sort);

create table public.offerings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9][a-z0-9-]{0,119}$'),
  kind text not null default 'service' check (kind in ('service', 'package', 'session', 'product')),
  title jsonb not null default '{}'::jsonb,
  summary jsonb not null default '{}'::jsonb,
  body jsonb not null default '{}'::jsonb,
  price_cents integer check (price_cents is null or price_cents >= 0),
  deposit_cents integer check (deposit_cents is null or deposit_cents >= 0),
  currency text not null default 'MYR' check (char_length(currency) = 3),
  price_note jsonb not null default '{}'::jsonb,
  checkout_url text,
  image_media_ids jsonb not null default '[]'::jsonb
    check (jsonb_typeof(image_media_ids) = 'array'),
  attributes jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  sort integer not null default 0,
  seo jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, slug)
);
create index offerings_public_idx on public.offerings (tenant_id, status, sort);
comment on column public.offerings.attributes is 'duration_min drives slot length; the last start is closes_at minus this duration.';

create table public.faq_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  offering_id uuid references public.offerings(id) on delete cascade,
  question jsonb not null default '{}'::jsonb,
  answer jsonb not null default '{}'::jsonb,
  sort integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index faq_items_tenant_idx on public.faq_items (tenant_id, sort);
create index faq_items_offering_idx on public.faq_items (offering_id);

-- ---------------------------------------------------------------------------
-- Availability
-- ---------------------------------------------------------------------------
create table public.availability_rules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  offering_id uuid references public.offerings(id) on delete cascade,
  weekday integer not null check (weekday between 0 and 6),
  start_time text not null check (start_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  -- Legacy upper bound kept for reference only: the grid ends at contact.closes_at.
  end_time text not null check (end_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  slot_minutes integer not null default 45 check (slot_minutes between 5 and 240),
  buffer_minutes integer not null default 0 check (buffer_minutes between 0 and 120),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index availability_rules_tenant_idx on public.availability_rules (tenant_id, weekday);
create index availability_rules_offering_idx on public.availability_rules (offering_id);
comment on column public.availability_rules.buffer_minutes is 'Stored for future use; the slot grid ignores it (owner decision 2026-11-23).';

create table public.blackout_dates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  date_from date not null,
  date_to date not null,
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (date_to >= date_from)
);
create index blackout_dates_tenant_idx on public.blackout_dates (tenant_id, date_from);

-- ---------------------------------------------------------------------------
-- Bookings: first booking wins, 10-minute holds (docs/09-admin-access.md)
-- ---------------------------------------------------------------------------
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  booking_ref text not null,
  offering_id uuid not null references public.offerings(id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'declined', 'cancelled', 'completed')),
  customer_display_name text not null check (char_length(customer_display_name) between 1 and 120),
  customer_contact_masked text not null check (char_length(customer_contact_masked) between 4 and 40),
  amount_cents integer check (amount_cents is null or amount_cents >= 0),
  deposit_cents integer check (deposit_cents is null or deposit_cents >= 0),
  payment_verified boolean not null default false,
  locale text not null default 'en' check (locale in ('en', 'ms', 'zh')),
  -- SHA-256 of the confirmation-page token; the raw token is never stored.
  cancel_token_hash text not null unique,
  whatsapp_sent_at timestamptz,
  confirmed_by uuid references auth.users(id) on delete set null,
  reminder_sent_at timestamptz,
  consent_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (char_length(booking_ref) between 6 and 30),
  unique (tenant_id, booking_ref)
);
-- First booked wins. This single index is the whole concurrency story for
-- single-chair tenants; the loser gets slot_unavailable from create_booking().
create unique index uq_booking_active_slot
  on public.bookings (tenant_id, starts_at)
  where status in ('pending', 'confirmed');
create index bookings_tenant_time_idx on public.bookings (tenant_id, starts_at);
create index bookings_tenant_status_idx on public.bookings (tenant_id, status);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  lead_ref text not null,
  display_name text not null check (char_length(display_name) between 1 and 120),
  contact_masked text not null check (char_length(contact_masked) between 4 and 40),
  offering_id uuid references public.offerings(id) on delete set null,
  summary_note text not null check (char_length(summary_note) between 1 and 1500),
  locale text not null default 'en' check (locale in ('en', 'ms', 'zh')),
  source text not null default 'website_contact',
  status text not null default 'new' check (status in ('new', 'contacted', 'closed')),
  internal_notes text,
  consent_at timestamptz not null,
  ip_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, lead_ref)
);
create index leads_tenant_status_idx on public.leads (tenant_id, status, created_at desc);

-- ---------------------------------------------------------------------------
-- Audit trail
-- ---------------------------------------------------------------------------
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity text not null,
  entity_id uuid,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_tenant_time_idx on public.audit_log (tenant_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Admin access (invite-only, two tiers)
-- ---------------------------------------------------------------------------
create table public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  note text,
  created_at timestamptz not null default now()
);
comment on table public.platform_admins is 'Tier 2: the owner of the platform. Bootstrapped by hand in SQL, never through the app.';

create table public.tenant_members (
  user_id uuid not null references auth.users(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  role text not null default 'staff' check (role in ('owner', 'manager', 'staff')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (user_id, tenant_id)
);
create index tenant_members_tenant_idx on public.tenant_members (tenant_id) where active;

create table public.admin_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email = lower(email) and position('@' in email) > 1),
  tenant_id uuid references public.tenants(id) on delete cascade,
  role text not null check (role in ('owner', 'manager', 'staff', 'platform')),
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check ((role = 'platform') = (tenant_id is null))
);
create index admin_invites_email_idx on public.admin_invites (lower(email));
create index admin_invites_open_idx on public.admin_invites (expires_at) where used_at is null;

-- ---------------------------------------------------------------------------
-- Rate limiting (anonymous form protection)
-- ---------------------------------------------------------------------------
create table public.rate_events (
  id bigint generated always as identity primary key,
  tenant_id uuid references public.tenants(id) on delete cascade,
  scope text not null,
  ip_hash text not null,
  at timestamptz not null default now()
);
create index rate_events_lookup_idx on public.rate_events (scope, ip_hash, at desc);
comment on table public.rate_events is 'Only a hash of the client address is stored. Old rows are pruned by check_rate_limit().';

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'tenants', 'site_settings', 'page_content', 'offerings', 'faq_items',
    'availability_rules', 'blackout_dates', 'bookings', 'leads'
  ]
  loop
    execute format(
      'create trigger %I_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      t, t
    );
  end loop;
end;
$$;

commit;
