-- 0003_functions_read.sql — public read RPCs (definer) + helpers
--
-- The browser never reads tables directly for public data. It calls these
-- functions, which run as the table owner, filter to published rows and return
-- the JSON shapes the SPA already consumes (frontend/src/types.ts).
--
-- Write RPCs (create_booking, create_lead, cancel, invite claim, admin_overview)
-- live in 0004_functions_write.sql so each half stays reviewable.
--
-- Weekday numbering matches JavaScript and the old backend: 0 = Sunday.
-- Wall-clock rules are evaluated in the tenant's timezone; stored timestamps are
-- timestamptz (UTC).

begin;

-- ---------------------------------------------------------------------------
-- Small helpers
-- ---------------------------------------------------------------------------
create or replace function public.iso_z(p_ts timestamptz)
returns text
language sql
immutable
as $$ select to_char(p_ts at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') $$;

create or replace function public.normalize_host(p_host text)
returns text
language sql
immutable
as $$
  select rtrim(lower(split_part(coalesce(p_host, ''), ':', 1)), '.');
$$;

create or replace function public.normalize_phone(p_raw text)
returns text
language sql
immutable
as $$
  select case
    when left(d, 1) = '0' then '6' || d
    else d
  end
  from (select regexp_replace(coalesce(p_raw, ''), '\D', '', 'g') as d) x;
$$;

create or replace function public.mask_phone(p_raw text)
returns text
language sql
immutable
as $$
  select case
    when length(public.normalize_phone(p_raw)) < 7 then '—'
    else left(public.normalize_phone(p_raw), 4) || '***' || right(public.normalize_phone(p_raw), 3)
  end;
$$;

create or replace function public.is_valid_phone(p_raw text)
returns boolean
language sql
immutable
as $$ select public.normalize_phone(p_raw) ~ '^[0-9]{9,15}$' $$;

-- 12-hour label for UI chrome, mirroring the old display_time() helper.
create or replace function public.display_time(p_hhmm text, p_locale text default 'en')
returns text
language plpgsql
immutable
as $$
declare
  v_time time := p_hhmm::time;
  v_hour int;
  v_suffix text;
begin
  if p_locale = 'zh' then
    return to_char(v_time, 'HH24:MI');
  end if;
  v_hour := extract(hour from v_time)::int % 12;
  if v_hour = 0 then v_hour := 12; end if;
  if p_locale = 'ms' then
    v_suffix := case when extract(hour from v_time) < 12 then 'PG' else 'PTG' end;
  else
    v_suffix := case when extract(hour from v_time) < 12 then 'AM' else 'PM' end;
  end if;
  return v_hour || ':' || to_char(v_time, 'MI') || ' ' || v_suffix;
end;
$$;

create or replace function public.weekday_name(p_weekday int)
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'en', (array['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'])[p_weekday + 1],
    'zh', (array['周日','周一','周二','周三','周四','周五','周六'])[p_weekday + 1],
    'ms', (array['Ahad','Isnin','Selasa','Rabu','Khamis','Jumaat','Sabtu'])[p_weekday + 1]
  );
$$;

create or replace function public.weekday_short(p_weekday int)
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'en', (array['Sun','Mon','Tue','Wed','Thu','Fri','Sat'])[p_weekday + 1],
    'zh', (array['周日','周一','周二','周三','周四','周五','周六'])[p_weekday + 1],
    'ms', (array['Ahd','Isn','Sel','Rab','Kha','Jum','Sab'])[p_weekday + 1]
  );
$$;

-- ---------------------------------------------------------------------------
-- Tenant resolution
-- ---------------------------------------------------------------------------
-- Internal: slug wins when given; otherwise the host, with "localhost" /
-- "127.0.0.1" / "" falling back to the domain row named "localhost" (created by
-- the seed) and <slug>.localhost resolving by slug.
create or replace function public.resolve_tenant_for(p_host text, p_slug text default null)
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (select t.id
       from public.tenants t
      where p_slug is not null and p_slug <> ''
        and t.slug = lower(trim(p_slug)) and t.status = 'active'
      limit 1),
    (select t.id
       from public.tenant_domains d
       join public.tenants t on t.id = d.tenant_id
      where d.hostname = public.normalize_host(p_host) and t.status = 'active'
      limit 1),
    (select t.id
       from public.tenant_domains d
       join public.tenants t on t.id = d.tenant_id
      where d.hostname = 'localhost' and t.status = 'active'
        and public.normalize_host(p_host) in ('', 'localhost', '127.0.0.1', '0.0.0.0')
      limit 1),
    (select t.id
       from public.tenants t
      where t.status = 'active'
        and public.normalize_host(p_host) = t.slug || '.localhost'
      limit 1)
  );
$$;

revoke all on function public.resolve_tenant_for(text, text) from public;

-- Public: used by the Pages Functions middleware to fill the HTML head.
create or replace function public.resolve_tenant_by_host(p_host text)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object('id', t.id, 'slug', t.slug)
  from public.tenants t
  where t.id = public.resolve_tenant_for(p_host, null);
$$;

revoke all on function public.resolve_tenant_by_host(text) from public;
grant execute on function public.resolve_tenant_by_host(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Availability
-- ---------------------------------------------------------------------------
-- Slots start at the rule's opening time; the last start is closing time minus
-- the treatment length, so nothing ends after the clinic closes.
-- buffer_minutes is deliberately ignored (owner decision 2026-11-23).
-- 60-minute lead time mirrors BOOKING_LEAD_MINUTES.
create or replace function public.availability(
  p_offering text default null,
  p_days int default 14,
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
  v_days int := greatest(1, least(coalesce(p_days, 14), 30));
  v_tz text := 'Asia/Kuala_Lumpur';
  v_closes time := time '23:00';
  v_offering_id uuid;
  v_duration_override int := 0;
  v_today date;
  v_days_json jsonb := '[]'::jsonb;
  v_slots jsonb;
  v_weekday int;
  d date;
  day_offset int;
  r record;
  v_duration int;
  v_len interval;
  v_step interval;
  v_last_start time;
  v_cursor timestamp;
  v_slot_start timestamptz;
  v_slot_end timestamptz;
begin
  if v_tenant is null then
    raise exception 'unknown_tenant' using errcode = 'P0002';
  end if;

  select coalesce(nullif(s.timezone, ''), 'Asia/Kuala_Lumpur'),
         coalesce((s.contact ->> 'closes_at')::time, time '23:00')
    into v_tz, v_closes
    from public.site_settings s
   where s.tenant_id = v_tenant;

  if p_offering is not null and p_offering <> '' then
    select o.id, coalesce((o.attributes ->> 'duration_min')::int, 0)
      into v_offering_id, v_duration_override
      from public.offerings o
     where o.tenant_id = v_tenant and o.status = 'published' and o.slug = p_offering;
    if v_offering_id is null then
      raise exception 'offering_not_found' using errcode = 'P0002';
    end if;
  end if;

  v_today := (now() at time zone v_tz)::date;

  for day_offset in 0 .. v_days - 1 loop
    d := v_today + day_offset;
    v_slots := '[]'::jsonb;

    if not exists (
      select 1 from public.blackout_dates b
       where b.tenant_id = v_tenant and d between b.date_from and b.date_to
    ) then
      v_weekday := extract(dow from d)::int;

      for r in
        select *
          from public.availability_rules ar
         where ar.tenant_id = v_tenant
           and ar.weekday = v_weekday
           and ar.active
           and (v_offering_id is null or ar.offering_id is null or ar.offering_id = v_offering_id)
         order by ar.start_time
      loop
        v_duration := greatest(v_duration_override, coalesce(r.slot_minutes, 45), 5);
        v_len := make_interval(mins => v_duration);
        v_step := make_interval(mins => greatest(v_duration, coalesce(r.slot_minutes, 45)));
        v_cursor := d::timestamp + r.start_time::time;
        v_last_start := v_closes - (v_duration || ' minutes')::interval;

        while v_cursor <= d::timestamp + v_last_start loop
          v_slot_start := v_cursor at time zone v_tz;
          v_slot_end := v_slot_start + v_len;

          if v_slot_start > now() + interval '60 minutes'
             and not exists (
               select 1 from public.bookings b
                where b.tenant_id = v_tenant
                  and b.status in ('pending', 'confirmed')
                  and v_slot_start < b.ends_at
                  and v_slot_end > b.starts_at
             )
          then
            v_slots := v_slots || jsonb_build_array(jsonb_build_object(
              'starts_at', public.iso_z(v_slot_start),
              'time', to_char(v_slot_start at time zone v_tz, 'HH24:MI')
            ));
          end if;
          v_cursor := v_cursor + v_step;
        end loop;
      end loop;
    end if;

    v_days_json := v_days_json || jsonb_build_array(jsonb_build_object(
      'date', d::text,
      'weekday', extract(dow from d)::int,
      'weekday_label', public.weekday_short(extract(dow from d)::int),
      'weekday_name', public.weekday_name(extract(dow from d)::int),
      'slots', v_slots
    ));
  end loop;

  return jsonb_build_object(
    'timezone', v_tz,
    'days', v_days_json,
    'server_time', public.iso_z(now())
  );
end;
$$;

revoke all on function public.availability(text, int, text) from public;
grant execute on function public.availability(text, int, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Site bundle
-- ---------------------------------------------------------------------------
-- i18n payloads are stored with en/ms/zh already filled by the seed, so this
-- function does not translate. The Malay map (MS_CONTENT) lives in exactly one
-- place: scripts/sql/dump-seed.mjs.
create or replace function public.site_bundle(
  p_host text default null,
  p_slug text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_tenant uuid := public.resolve_tenant_for(p_host, p_slug);
  v_settings record;
  v_avail jsonb;
  v_next jsonb;
  v_schedule jsonb;
  v_tenant_row record;
begin
  if v_tenant is null then
    raise exception 'unknown_tenant' using errcode = 'P0002';
  end if;

  select * into v_tenant_row from public.tenants where id = v_tenant;
  select * into v_settings from public.site_settings where tenant_id = v_tenant;
  if not found then
    raise exception 'site_settings_missing' using errcode = 'P0002';
  end if;

  v_avail := public.availability(null, 14, p_host);

  select coalesce(jsonb_agg(slot), '[]'::jsonb)
    into v_next
    from (
      select jsonb_build_object(
               'date', day ->> 'date',
               'starts_at', slot ->> 'starts_at',
               'time', slot ->> 'time'
             ) as slot
        from jsonb_array_elements(v_avail -> 'days') as day
        cross join lateral jsonb_array_elements(day -> 'slots') as slot
       order by day ->> 'date', slot ->> 'time'
       limit 3
    ) first_slots;

  with ordered as (
    select * from (values (1, 1), (2, 2), (3, 3), (4, 4), (5, 5), (6, 6), (0, 7)) as w(weekday, ord)
  ),
  per_day as (
    select o.weekday,
           o.ord,
           min(ar.start_time) as first_start,
           max(ar.end_time) as last_end,
           count(ar.id) as rule_count
      from ordered o
      left join public.availability_rules ar
        on ar.tenant_id = v_tenant and ar.weekday = o.weekday and ar.active
     group by o.weekday, o.ord
  )
  select coalesce(jsonb_agg(
    case
      when rule_count = 0 then jsonb_build_object(
        'weekday', weekday,
        'label', public.weekday_name(weekday),
        'closed', true,
        'hours', ''
      )
      else jsonb_build_object(
        'weekday', weekday,
        'label', public.weekday_name(weekday),
        'closed', false,
        'start', first_start,
        'end', last_end,
        'hours', public.display_time(first_start, 'en') || ' – ' ||
                 public.display_time(coalesce(v_settings.contact ->> 'closes_at', '23:00'), 'en')
      )
    end
    order by ord
  ), '[]'::jsonb)
  into v_schedule
  from per_day;

  return jsonb_build_object(
    'tenant', jsonb_build_object('id', v_tenant, 'slug', v_tenant_row.slug, 'status', v_tenant_row.status),
    'site', jsonb_build_object(
      'brand_name', v_settings.brand_name,
      'archetype', v_settings.archetype,
      'default_locale', v_settings.default_locale,
      'locales', v_settings.locales,
      'timezone', v_settings.timezone,
      'theme', v_settings.theme,
      'features', v_settings.features,
      'labels', v_settings.labels,
      'contact', v_settings.contact,
      'booking_mode', v_settings.booking_mode,
      'checkout_mode', v_settings.checkout_mode,
      -- todo(G5): the public bundle should only carry "configured"; the bank
      -- fields move behind the booking token before real payments go live.
      'payment', jsonb_build_object(
        'bank_name', coalesce(v_settings.payment_config ->> 'bank_name', ''),
        'account_number', coalesce(v_settings.payment_config ->> 'account_number', ''),
        'account_holder', coalesce(v_settings.payment_config ->> 'account_holder', ''),
        'qr_image_url', coalesce(v_settings.payment_config ->> 'qr_image_url', ''),
        'configured', (
          coalesce(v_settings.payment_config ->> 'qr_image_url', '') <> ''
          or (
            coalesce(v_settings.payment_config ->> 'bank_name', '') <> ''
            and coalesce(v_settings.payment_config ->> 'account_number', '') <> ''
          )
        )
      ),
      'consent_text', v_settings.consent_text
    ),
    'content', coalesce((
      select jsonb_object_agg(page, sections)
        from (
          select page, jsonb_object_agg(section, data) as sections
            from public.page_content
           where tenant_id = v_tenant
           group by page
        ) pages
    ), '{}'::jsonb),
    'offerings', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', o.id,
               'slug', o.slug,
               'kind', o.kind,
               'title', o.title,
               'summary', o.summary,
               'body', o.body,
               'price_cents', o.price_cents,
               'deposit_cents', o.deposit_cents,
               'currency', o.currency,
               'price_note', o.price_note,
               'attributes', o.attributes,
               'duration_min', (o.attributes ->> 'duration_min')::int,
               'status', o.status,
               'sort', o.sort
             ) order by o.sort)
        from public.offerings o
       where o.tenant_id = v_tenant and o.status = 'published'
    ), '[]'::jsonb),
    'faq', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', f.id,
               'question', f.question,
               'answer', f.answer,
               'offering_id', f.offering_id
             ) order by f.sort)
        from public.faq_items f
       where f.tenant_id = v_tenant and f.published
    ), '[]'::jsonb),
    'schedule', v_schedule,
    'next_slots', v_next,
    'server_time', public.iso_z(now())
  );
end;
$$;

revoke all on function public.site_bundle(text, text) from public;
grant execute on function public.site_bundle(text, text) to anon, authenticated;

commit;
