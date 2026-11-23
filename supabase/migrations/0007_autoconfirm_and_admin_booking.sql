-- 0007_autoconfirm_and_admin_booking.sql
--
-- Owner decision 2026-11-23: every booking is confirmed immediately (first
-- booked wins, no approval hop), and the front desk can add a booking for a
-- caller through the same slot engine. The 10-minute "pending" hold is retired
-- with the pending state (the enum column stays for history only).

begin;

-- Service cover + detail image URLs (cropped client-side, stored in Supabase
-- Storage; the database keeps only the public URLs).
alter table public.offerings
  add column if not exists images jsonb not null default '{}'::jsonb;

-- ---------------------------------------------------------------------------
-- Auto-confirm: the online booking path now writes "confirmed".
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
      v_tenant, v_ref, v_offering.id, v_starts, v_ends, 'confirmed',
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
-- Slot validity for a known tenant (the admin path has a tenant id, not a host)
-- ---------------------------------------------------------------------------
create or replace function public.slot_available(
  p_tenant uuid,
  p_offering_id uuid,
  p_starts timestamptz,
  p_duration int
)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_tz text := 'Asia/Kuala_Lumpur';
  v_closes time := time '23:00';
  v_local time;
  v_weekday int;
  v_end time;
begin
  select coalesce(nullif(s.timezone, ''), 'Asia/Kuala_Lumpur'),
         coalesce((s.contact ->> 'closes_at')::time, time '23:00')
    into v_tz, v_closes
    from public.site_settings s
   where s.tenant_id = p_tenant;

  v_local := (p_starts at time zone v_tz)::time;
  v_weekday := extract(dow from p_starts at time zone v_tz)::int;
  v_end := v_local + make_interval(mins => p_duration);

  -- A rule must cover this weekday and the start must be at or after opening.
  if not exists (
    select 1 from public.availability_rules ar
     where ar.tenant_id = p_tenant
       and ar.active
       and ar.weekday = v_weekday
       and (ar.offering_id is null or ar.offering_id = p_offering_id)
       and v_local >= ar.start_time::time
  ) then
    return false;
  end if;

  -- Nothing may end after closing.
  if v_end > v_closes then
    return false;
  end if;

  -- First booked wins: any overlapping active booking blocks the slot.
  if exists (
    select 1 from public.bookings b
     where b.tenant_id = p_tenant
       and b.status in ('pending', 'confirmed')
       and p_starts < b.ends_at
       and (p_starts + make_interval(mins => p_duration)) > b.starts_at
  ) then
    return false;
  end if;

  return true;
end;
$$;

revoke all on function public.slot_available(uuid, uuid, timestamptz, int) from public;

-- ---------------------------------------------------------------------------
-- Front-desk booking (caller books over the phone)
-- ---------------------------------------------------------------------------
create or replace function public.admin_create_booking(
  p_offering_slug text,
  p_starts_at timestamptz,
  p_customer_name text,
  p_customer_phone text,
  p_locale text default 'en',
  p_tenant uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_tenant uuid := coalesce(p_tenant, (
    select tenant_id from public.tenant_members
     where user_id = v_uid and active order by (role = 'owner') desc limit 1
  ));
  v_offering record;
  v_name text := regexp_replace(coalesce(p_customer_name, ''), '\s+', ' ', 'g');
  v_locale text := case when p_locale in ('en', 'ms', 'zh') then p_locale else 'en' end;
  v_starts timestamptz := date_trunc('minute', p_starts_at);
  v_duration int;
  v_ends timestamptz;
  v_ref text;
  v_token text;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;
  if v_tenant is null then
    raise exception 'tenant_required' using errcode = 'P0001';
  end if;
  if not (public.is_platform_admin() or public.has_tenant_role(v_tenant, array['owner', 'manager', 'staff'])) then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  if char_length(v_name) < 2 or char_length(v_name) > 80 then
    raise exception 'invalid_name' using errcode = 'P0001';
  end if;
  if not public.is_valid_phone(p_customer_phone) then
    raise exception 'invalid_phone' using errcode = 'P0001';
  end if;

  select * into v_offering
    from public.offerings o
   where o.tenant_id = v_tenant and o.slug = p_offering_slug and o.status = 'published';
  if not found then
    raise exception 'offering_not_found' using errcode = 'P0001';
  end if;

  v_duration := greatest(45, least(coalesce((v_offering.attributes ->> 'duration_min')::int, 45), 120));
  v_ends := v_starts + make_interval(mins => v_duration);

  if not public.slot_available(v_tenant, v_offering.id, v_starts, v_duration) then
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
      v_tenant, v_ref, v_offering.id, v_starts, v_ends, 'confirmed',
      v_name, public.mask_phone(p_customer_phone), v_offering.price_cents, v_offering.deposit_cents,
      v_locale, public.sha256_hex(v_token), now()
    )
    returning id into v_id;
  exception when unique_violation then
    raise exception 'slot_taken' using errcode = 'P0001';
  end;

  insert into public.audit_log (tenant_id, actor_id, action, entity, entity_id, meta)
  values (v_tenant, v_uid, 'booking.created_by_staff', 'booking', v_id,
          jsonb_build_object('ref', v_ref, 'source', 'front_desk'));

  return jsonb_build_object(
    'booking', public.booking_json(v_id) || jsonb_build_object('cancel_token', v_token),
    'whatsapp_url', public.booking_whatsapp_url(
      v_tenant, v_ref, v_offering.id, v_starts, v_name, p_customer_phone, v_locale
    )
  );
end;
$$;

revoke all on function public.admin_create_booking(text, timestamptz, text, text, text, uuid) from public;
grant execute on function public.admin_create_booking(text, timestamptz, text, text, text, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- One-day schedule for the front-desk calendar: booked slots + free slots
-- ---------------------------------------------------------------------------
create or replace function public.day_schedule(p_tenant uuid, p_date date)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_tz text := 'Asia/Kuala_Lumpur';
  v_closes time := time '23:00';
  v_day_start timestamptz;
  v_day_end timestamptz;
  v_weekday int := extract(dow from p_date)::int;
  v_booked jsonb;
  v_free jsonb := '[]'::jsonb;
  r record;
  v_cursor time;
  v_step int;
  v_slot_start timestamptz;
  v_slot_end timestamptz;
begin
  select coalesce(nullif(s.timezone, ''), 'Asia/Kuala_Lumpur'),
         coalesce((s.contact ->> 'closes_at')::time, time '23:00')
    into v_tz, v_closes
    from public.site_settings s
   where s.tenant_id = p_tenant;

  v_day_start := (p_date::text || ' 00:00')::timestamp at time zone v_tz;
  v_day_end := v_day_start + interval '1 day';

  select coalesce(jsonb_agg(jsonb_build_object(
           'time', to_char(b.starts_at at time zone v_tz, 'HH24:MI'),
           'starts_at', public.iso_z(b.starts_at),
           'ends_at', public.iso_z(b.ends_at),
           'ref', b.booking_ref,
           'name', b.customer_display_name,
           'status', b.status,
           'service', coalesce(o.title ->> 'en', '')
         ) order by b.starts_at), '[]'::jsonb)
    into v_booked
    from public.bookings b
    left join public.offerings o on o.id = b.offering_id
   where b.tenant_id = p_tenant
     and b.status in ('pending', 'confirmed')
     and b.starts_at >= v_day_start and b.starts_at < v_day_end;

  for r in
    select ar.start_time, greatest(ar.slot_minutes, 45) as step
      from public.availability_rules ar
     where ar.tenant_id = p_tenant and ar.active and ar.weekday = v_weekday
     order by ar.start_time
  loop
    v_step := greatest(r.step, 5);
    v_cursor := r.start_time::time;
    while v_cursor <= v_closes - make_interval(mins => v_step) loop
      v_slot_start := (p_date::text || ' ' || to_char(v_cursor, 'HH24:MI'))::timestamp at time zone v_tz;
      v_slot_end := v_slot_start + make_interval(mins => v_step);
      if not exists (
        select 1 from public.bookings b
         where b.tenant_id = p_tenant
           and b.status in ('pending', 'confirmed')
           and v_slot_start < b.ends_at and v_slot_end > b.starts_at
      ) then
        v_free := v_free || jsonb_build_array(jsonb_build_object(
          'time', to_char(v_cursor, 'HH24:MI'),
          'starts_at', public.iso_z(v_slot_start)
        ));
      end if;
      v_cursor := v_cursor + make_interval(mins => v_step);
    end loop;
  end loop;

  return jsonb_build_object(
    'date', p_date::text,
    'timezone', v_tz,
    'booked', v_booked,
    'free', v_free
  );
end;
$$;

revoke all on function public.day_schedule(uuid, date) from public;
grant execute on function public.day_schedule(uuid, date) to authenticated;

commit;
