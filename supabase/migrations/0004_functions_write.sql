-- 0004_functions_write.sql — booking, lead, hold release and admin RPCs
--
-- Everything a visitor can trigger runs as a definer function: validation,
-- masking and the first-booked-wins insert happen in one transaction. The raw
-- phone number never reaches a table; it only becomes part of the WhatsApp URL
-- returned to the caller (Zero-PII).
--
-- Error codes are raised as the message of a P0001 exception; the frontend
-- adapter maps them to ApiError codes (slot_taken, slot_unavailable, ...).

begin;

-- ---------------------------------------------------------------------------
-- Shared pieces
-- ---------------------------------------------------------------------------
create or replace function public.sha256_hex(p_text text)
returns text
language sql
immutable
as $$ select encode(sha256(convert_to(coalesce(p_text, ''), 'utf8')), 'hex') $$;

-- Percent-encode just enough for a wa.me ?text= value.
create or replace function public.url_encode(p_text text)
returns text
language sql
immutable
as $$
  select replace(
           replace(
             replace(
               replace(
                 replace(coalesce(p_text, ''), '%', '%25'),
                 ' ', '%20'),
               E'\n', '%0A'),
             '#', '%23'),
           '&', '%26');
$$;

create or replace function public.whatsapp_text(
  p_brand text, p_ref text, p_service text, p_when text,
  p_name text, p_phone text, p_locale text
)
returns text
language plpgsql
immutable
as $$
begin
  if p_locale = 'zh' then
    return '你好 ' || p_brand || '，我想确认预约。' || E'\n预约编号：' || p_ref
        || E'\n服务：' || p_service || E'\n时间：' || p_when || E'\n姓名：' || p_name
        || E'\n联络号码：' || p_phone || E'\n\n请确认这个时段，谢谢。';
  end if;
  return 'Hi ' || p_brand || ', I''d like to confirm this appointment.' || E'\nBooking ref: '
      || p_ref || E'\nService: ' || p_service || E'\nTime: ' || p_when || E'\nName: ' || p_name
      || E'\nPhone: ' || p_phone || E'\n\nPlease confirm the slot. Thank you.';
end;
$$;

-- WhatsApp URL for a booking. Pass null as the number when the message is being
-- rebuilt on the confirmation page (the phone is not stored, so the line goes).
create or replace function public.booking_whatsapp_url(
  p_tenant uuid, p_ref text, p_offering_id uuid, p_starts_at timestamptz,
  p_name text, p_number text, p_locale text
)
returns text
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_settings record;
  v_offering record;
  v_when text;
  v_phone text := coalesce(p_number, '—');
  v_message text;
  v_tz text := 'Asia/Kuala_Lumpur';
begin
  select * into v_settings from public.site_settings where tenant_id = p_tenant;
  select * into v_offering from public.offerings where id = p_offering_id;
  v_tz := coalesce(nullif(v_settings.timezone, ''), 'Asia/Kuala_Lumpur');

  v_when := case p_locale
    when 'zh' then to_char(p_starts_at at time zone v_tz, 'YYYY"年"MM"月"DD"日" HH24:MI')
    when 'ms' then replace(replace(
        to_char(p_starts_at at time zone v_tz, 'DD/MM/YYYY FMHH12:MI AM'), 'AM', 'PG'), 'PM', 'PTG')
    else to_char(p_starts_at at time zone v_tz, 'Dy, FMDD Mon YYYY · FMHH12:MI AM')
  end;

  v_message := public.whatsapp_text(
    coalesce(v_settings.brand_name ->> p_locale, v_settings.brand_name ->> 'en', ''),
    p_ref,
    coalesce(v_offering.title ->> p_locale, v_offering.title ->> 'en', ''),
    v_when, p_name, v_phone, p_locale
  );
  -- The confirmation page cannot know the phone number; drop that line.
  v_message := replace(replace(v_message, E'联络号码：—\n', ''), E'Phone: —' || E'\n', '');

  if coalesce(v_settings.contact ->> 'whatsapp', '') = '' then
    return '';
  end if;
  return 'https://wa.me/' || public.normalize_phone(v_settings.contact ->> 'whatsapp')
      || '?text=' || public.url_encode(v_message);
end;
$$;

revoke all on function public.booking_whatsapp_url(uuid, text, uuid, timestamptz, text, text, text) from public;

create or replace function public.booking_json(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'ref', b.booking_ref,
    'status', b.status,
    'starts_at', public.iso_z(b.starts_at),
    'ends_at', public.iso_z(b.ends_at),
    'customer_name', b.customer_display_name,
    'customer_contact_masked', b.customer_contact_masked,
    'deposit_cents', b.deposit_cents,
    'amount_cents', b.amount_cents,
    'payment_verified', b.payment_verified,
    'locale', b.locale,
    'offering', case when o.id is null then null else jsonb_build_object(
      'id', o.id, 'slug', o.slug, 'kind', o.kind, 'title', o.title, 'summary', o.summary,
      'body', o.body, 'price_cents', o.price_cents, 'deposit_cents', o.deposit_cents,
      'currency', o.currency, 'price_note', o.price_note, 'attributes', o.attributes,
      'duration_min', (o.attributes ->> 'duration_min')::int,
      'status', o.status, 'sort', o.sort
    ) end
  )
  from public.bookings b
  left join public.offerings o on o.id = b.offering_id
  where b.id = p_id;
$$;

revoke all on function public.booking_json(uuid) from public;

create or replace function public.lead_json(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'id', l.id,
    'ref', l.lead_ref,
    'name', l.display_name,
    'contact_masked', l.contact_masked,
    'message', l.summary_note,
    'status', l.status,
    'locale', l.locale,
    'source', l.source,
    'internal_notes', coalesce(l.internal_notes, ''),
    'created_at', public.iso_z(l.created_at)
  )
  from public.leads l
  where l.id = p_id;
$$;

revoke all on function public.lead_json(uuid) from public;

-- ---------------------------------------------------------------------------
-- Rate limiting. p_ip_hash must come from a trustworthy caller (the Pages
-- Function / edge proxy); when it is null nothing is counted, because a value
-- sent by the browser would be spoofable. Turnstile is the real gate.
-- ---------------------------------------------------------------------------
create or replace function public.check_rate_limit(
  p_scope text,
  p_ip_hash text,
  p_limit int,
  p_window interval
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count int;
begin
  if p_ip_hash is null or p_ip_hash = '' then
    return;
  end if;
  delete from public.rate_events where at < now() - interval '1 day';
  select count(*) into v_count
    from public.rate_events
   where scope = p_scope and ip_hash = p_ip_hash and at > now() - p_window;
  if v_count >= p_limit then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  insert into public.rate_events (scope, ip_hash) values (p_scope, p_ip_hash);
end;
$$;

revoke all on function public.check_rate_limit(text, text, int, interval) from public;

-- ---------------------------------------------------------------------------
-- Holds: a pending booking the patient never sent on WhatsApp holds its slot
-- for 10 minutes (owner decision 2026-11-23).
-- ---------------------------------------------------------------------------
create or replace function public.release_expired_holds(p_tenant uuid)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_released int;
begin
  update public.bookings
     set status = 'cancelled', updated_at = now()
   where tenant_id = p_tenant
     and status = 'pending'
     and whatsapp_sent_at is null
     and created_at < now() - interval '10 minutes';
  get diagnostics v_released = row_count;
  return v_released;
end;
$$;

revoke all on function public.release_expired_holds(uuid) from public;

-- ---------------------------------------------------------------------------
-- create_booking
-- ---------------------------------------------------------------------------
create or replace function public.create_booking(
  p_offering_slug text,
  p_starts_at timestamptz,
  p_customer_name text,
  p_customer_phone text,
  p_locale text default 'en',
  p_consent boolean default false,
  p_host text default null,
  p_ip_hash text default null,
  p_website text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_tenant uuid := public.resolve_tenant_for(p_host, null);
  v_offering record;
  v_name text := regexp_replace(coalesce(p_customer_name, ''), '\s+', ' ', 'g');
  v_locale text := case when p_locale in ('en', 'ms', 'zh') then p_locale else 'en' end;
  v_starts timestamptz := date_trunc('minute', p_starts_at);
  v_duration int;
  v_ends timestamptz;
  v_ref text;
  v_token text;
  v_id uuid;
  v_avail jsonb;
  v_available boolean := false;
  v_when text;
begin
  if coalesce(p_website, '') <> '' then
    raise exception 'invalid_submission' using errcode = 'P0001';
  end if;
  if not coalesce(p_consent, false) then
    raise exception 'consent_required' using errcode = 'P0001';
  end if;
  if v_tenant is null then
    raise exception 'unknown_tenant' using errcode = 'P0001';
  end if;
  if char_length(v_name) < 2 or char_length(v_name) > 80 then
    raise exception 'invalid_name' using errcode = 'P0001';
  end if;
  if not public.is_valid_phone(p_customer_phone) then
    raise exception 'invalid_phone' using errcode = 'P0001';
  end if;
  if p_starts_at is null then
    raise exception 'starts_at_required' using errcode = 'P0001';
  end if;

  perform public.check_rate_limit('booking', p_ip_hash, 10, interval '1 hour');
  perform public.release_expired_holds(v_tenant);

  select * into v_offering
    from public.offerings o
   where o.tenant_id = v_tenant and o.slug = p_offering_slug and o.status = 'published';
  if not found then
    raise exception 'offering_not_found' using errcode = 'P0001';
  end if;

  v_duration := greatest(45, least(coalesce((v_offering.attributes ->> 'duration_min')::int, 45), 120));
  v_ends := v_starts + make_interval(mins => v_duration);

  v_avail := public.availability(v_offering.slug, 30, p_host);
  select exists (
    select 1
      from jsonb_array_elements(v_avail -> 'days') as day
     cross join lateral jsonb_array_elements(day -> 'slots') as slot
     where slot ->> 'starts_at' = public.iso_z(v_starts)
  ) into v_available;
  if not v_available then
    raise exception 'slot_unavailable' using errcode = 'P0001';
  end if;

  v_ref := upper(left(regexp_replace(v_offering.slug, '[^a-zA-Z]', '', 'g'), 3))
        || '-' || to_char(now() at time zone coalesce(nullif((
             select timezone from public.site_settings where tenant_id = v_tenant
           ), ''), 'Asia/Kuala_Lumpur'), 'YYMMDD')
        || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 4));
  v_token := replace(gen_random_uuid()::text, '-', '');

  begin
    insert into public.bookings (
      tenant_id, booking_ref, offering_id, starts_at, ends_at, status,
      customer_display_name, customer_contact_masked, amount_cents, deposit_cents,
      locale, cancel_token_hash, consent_at
    ) values (
      v_tenant, v_ref, v_offering.id, v_starts, v_ends, 'pending',
      v_name, public.mask_phone(p_customer_phone), v_offering.price_cents, v_offering.deposit_cents,
      v_locale, public.sha256_hex(v_token), now()
    )
    returning id into v_id;
  exception when unique_violation then
    raise exception 'slot_taken' using errcode = 'P0001';
  end;

  insert into public.audit_log (tenant_id, action, entity, entity_id, meta)
  values (v_tenant, 'booking.created', 'booking', v_id, jsonb_build_object('ref', v_ref));

  return jsonb_build_object(
    'booking', public.booking_json(v_id) || jsonb_build_object('cancel_token', v_token),
    'whatsapp_url', public.booking_whatsapp_url(
      v_tenant, v_ref, v_offering.id, v_starts, v_name, p_customer_phone, v_locale
    ),
    'forwarded', 'not_configured',
    'forward_error', null
  );
end;
$$;

revoke all on function public.create_booking(text, timestamptz, text, text, text, boolean, text, text, text) from public;
grant execute on function public.create_booking(text, timestamptz, text, text, text, boolean, text, text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- booking_status / cancel / whatsapp-sent (token is matched by hash)
-- ---------------------------------------------------------------------------
create or replace function public.booking_status(
  p_ref text,
  p_token text,
  p_host text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_tenant uuid := public.resolve_tenant_for(p_host, null);
  v_booking public.bookings;
begin
  if v_tenant is null then
    raise exception 'unknown_tenant' using errcode = 'P0001';
  end if;
  select * into v_booking
    from public.bookings
   where tenant_id = v_tenant
     and booking_ref = upper(trim(p_ref))
     and cancel_token_hash = public.sha256_hex(p_token);
  if not found then
    raise exception 'booking_not_found' using errcode = 'P0001';
  end if;
  return jsonb_build_object(
    'booking', public.booking_json(v_booking.id),
    'whatsapp_url', public.booking_whatsapp_url(
      v_tenant, v_booking.booking_ref, v_booking.offering_id, v_booking.starts_at,
      v_booking.customer_display_name, null, v_booking.locale
    )
  );
end;
$$;

revoke all on function public.booking_status(text, text, text) from public;
grant execute on function public.booking_status(text, text, text) to anon, authenticated;

create or replace function public.mark_whatsapp_sent(
  p_ref text,
  p_token text,
  p_host text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_tenant uuid := public.resolve_tenant_for(p_host, null);
  v_id uuid;
begin
  if v_tenant is null then
    raise exception 'unknown_tenant' using errcode = 'P0001';
  end if;
  update public.bookings
     set whatsapp_sent_at = coalesce(whatsapp_sent_at, now())
   where tenant_id = v_tenant
     and booking_ref = upper(trim(p_ref))
     and cancel_token_hash = public.sha256_hex(p_token)
  returning id into v_id;
  if v_id is null then
    raise exception 'booking_not_found' using errcode = 'P0001';
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.mark_whatsapp_sent(text, text, text) from public;
grant execute on function public.mark_whatsapp_sent(text, text, text) to anon, authenticated;

create or replace function public.cancel_booking(
  p_ref text,
  p_token text,
  p_host text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_tenant uuid := public.resolve_tenant_for(p_host, null);
  v_booking public.bookings;
begin
  if v_tenant is null then
    raise exception 'unknown_tenant' using errcode = 'P0001';
  end if;
  select * into v_booking
    from public.bookings
   where tenant_id = v_tenant
     and booking_ref = upper(trim(p_ref))
     and cancel_token_hash = public.sha256_hex(p_token);
  if not found then
    raise exception 'booking_not_found' using errcode = 'P0001';
  end if;
  if v_booking.status in ('cancelled', 'declined') then
    return jsonb_build_object('booking', public.booking_json(v_booking.id));
  end if;
  if v_booking.status not in ('pending', 'confirmed') then
    raise exception 'cannot_cancel' using errcode = 'P0001';
  end if;
  update public.bookings set status = 'cancelled' where id = v_booking.id;
  insert into public.audit_log (tenant_id, action, entity, entity_id, meta)
  values (v_tenant, 'booking.cancelled_by_customer', 'booking', v_booking.id,
          jsonb_build_object('ref', v_booking.booking_ref));
  return jsonb_build_object('booking', public.booking_json(v_booking.id));
end;
$$;

revoke all on function public.cancel_booking(text, text, text) from public;
grant execute on function public.cancel_booking(text, text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- create_lead
-- ---------------------------------------------------------------------------
create or replace function public.create_lead(
  p_customer_name text,
  p_customer_phone text,
  p_message text,
  p_offering_slug text default null,
  p_locale text default 'en',
  p_consent boolean default false,
  p_host text default null,
  p_ip_hash text default null,
  p_website text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_tenant uuid := public.resolve_tenant_for(p_host, null);
  v_name text := regexp_replace(coalesce(p_customer_name, ''), '\s+', ' ', 'g');
  v_locale text := case when p_locale in ('en', 'ms', 'zh') then p_locale else 'en' end;
  v_message text := trim(coalesce(p_message, ''));
  v_offering_id uuid;
  v_ref text;
  v_id uuid;
begin
  if coalesce(p_website, '') <> '' then
    raise exception 'invalid_submission' using errcode = 'P0001';
  end if;
  if not coalesce(p_consent, false) then
    raise exception 'consent_required' using errcode = 'P0001';
  end if;
  if v_tenant is null then
    raise exception 'unknown_tenant' using errcode = 'P0001';
  end if;
  if char_length(v_name) < 2 then
    raise exception 'invalid_name' using errcode = 'P0001';
  end if;
  if not public.is_valid_phone(p_customer_phone) then
    raise exception 'invalid_phone' using errcode = 'P0001';
  end if;
  if char_length(v_message) < 5 or char_length(v_message) > 1500 then
    raise exception 'invalid_message' using errcode = 'P0001';
  end if;

  perform public.check_rate_limit('lead', p_ip_hash, 20, interval '10 minutes');

  if p_offering_slug is not null and p_offering_slug <> '' then
    select id into v_offering_id from public.offerings
     where tenant_id = v_tenant and slug = p_offering_slug;
  end if;

  v_ref := 'LED-' || to_char(now() at time zone coalesce(nullif((
             select timezone from public.site_settings where tenant_id = v_tenant
           ), ''), 'Asia/Kuala_Lumpur'), 'YYMMDD') || '-'
        || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 4));

  insert into public.leads (
    tenant_id, lead_ref, display_name, contact_masked, offering_id,
    summary_note, locale, source, consent_at, ip_hash
  ) values (
    v_tenant, v_ref, v_name, public.mask_phone(p_customer_phone), v_offering_id,
    v_message, v_locale, 'website_contact', now(),
    case when p_ip_hash is null then null else public.sha256_hex(p_ip_hash) end
  )
  returning id into v_id;

  insert into public.audit_log (tenant_id, action, entity, entity_id, meta)
  values (v_tenant, 'lead.created', 'lead', v_id, jsonb_build_object('ref', v_ref));

  return jsonb_build_object('lead', public.lead_json(v_id));
end;
$$;

revoke all on function public.create_lead(text, text, text, text, text, boolean, text, text, text) from public;
grant execute on function public.create_lead(text, text, text, text, text, boolean, text, text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Admin: claim an invite, and the dashboard payload
-- ---------------------------------------------------------------------------
create or replace function public.claim_admin_invite(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_invite public.admin_invites;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;
  select lower(email) into v_email from auth.users where id = v_uid;

  select * into v_invite
    from public.admin_invites
   where token_hash = public.sha256_hex(p_token)
     and used_at is null
     and expires_at > now();
  if not found then
    raise exception 'invite_invalid' using errcode = 'P0001';
  end if;
  if v_email is null or lower(v_invite.email) <> v_email then
    raise exception 'invite_invalid' using errcode = 'P0001';
  end if;

  if v_invite.tenant_id is null then
    insert into public.platform_admins (user_id) values (v_uid) on conflict do nothing;
  else
    insert into public.tenant_members (user_id, tenant_id, role, active)
    values (v_uid, v_invite.tenant_id, v_invite.role, true)
    on conflict (user_id, tenant_id) do update set role = excluded.role, active = true;

    insert into public.audit_log (tenant_id, actor_id, action, entity, entity_id, meta)
    values (v_invite.tenant_id, v_uid, 'admin.invite_claimed', 'admin_invite', v_invite.id,
            jsonb_build_object('role', v_invite.role));
  end if;

  update public.admin_invites set used_at = now() where id = v_invite.id;

  return jsonb_build_object('ok', true, 'tenant_id', v_invite.tenant_id, 'role', v_invite.role);
end;
$$;

revoke all on function public.claim_admin_invite(text) from public;
grant execute on function public.claim_admin_invite(text) to authenticated;

create or replace function public.admin_overview(p_tenant uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_tenant uuid := p_tenant;
  v_tz text := 'Asia/Kuala_Lumpur';
  v_brand jsonb;
  v_slug text;
  v_day_start timestamptz;
  v_day_end timestamptz;
  v_pending int;
  v_today int;
  v_new_leads int;
  v_published int;
  v_upcoming jsonb;
  v_leads jsonb;
begin
  if v_tenant is null then
    select tenant_id into v_tenant
      from public.tenant_members
     where user_id = auth.uid() and active
     order by (role = 'owner') desc
     limit 1;
  end if;
  if v_tenant is null or not (public.is_platform_admin() or public.is_tenant_member(v_tenant)) then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;

  select coalesce(timezone, 'Asia/Kuala_Lumpur'), brand_name
    into v_tz, v_brand
    from public.site_settings where tenant_id = v_tenant;
  select slug into v_slug from public.tenants where id = v_tenant;

  v_day_start := date_trunc('day', now() at time zone v_tz) at time zone v_tz;
  v_day_end := v_day_start + interval '1 day';

  select count(*) into v_pending from public.bookings
   where tenant_id = v_tenant and status = 'pending';
  select count(*) into v_today from public.bookings
   where tenant_id = v_tenant and status in ('pending', 'confirmed')
     and starts_at >= v_day_start and starts_at < v_day_end;
  select count(*) into v_new_leads from public.leads
   where tenant_id = v_tenant and status = 'new';
  select count(*) into v_published from public.offerings
   where tenant_id = v_tenant and status = 'published';

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', b.id, 'created_at', public.iso_z(b.created_at)
         ) || public.booking_json(b.id) order by b.starts_at), '[]'::jsonb)
    into v_upcoming
    from (
      select id, starts_at, created_at
        from public.bookings
       where tenant_id = v_tenant and status in ('pending', 'confirmed')
         and starts_at >= v_day_start
       order by starts_at
       limit 6
    ) b;

  select coalesce(jsonb_agg(public.lead_json(l.id) order by l.created_at desc), '[]'::jsonb)
    into v_leads
    from (select id, created_at from public.leads
           where tenant_id = v_tenant order by created_at desc limit 4) l;

  return jsonb_build_object(
    'tenant', jsonb_build_object('slug', v_slug, 'brand_name', v_brand),
    'counts', jsonb_build_object(
      'pending_bookings', v_pending,
      'today_bookings', v_today,
      'new_leads', v_new_leads,
      'published_offerings', v_published
    ),
    'upcoming', v_upcoming,
    'latest_leads', v_leads
  );
end;
$$;

revoke all on function public.admin_overview(uuid) from public;
grant execute on function public.admin_overview(uuid) to authenticated;

commit;
