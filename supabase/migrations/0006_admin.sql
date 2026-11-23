-- 0006_admin.sql — invite management and the platform console payload
--
-- Everything else the admin screens need (bookings, leads, offerings, settings,
-- faq) is already covered by the RLS policies in 0002, so the SPA can read and
-- update those tables directly. This file only adds what must happen server-side:
-- minting a one-time invite token (the hash never leaves the database) and the
-- cross-tenant overview for the platform owner.

begin;

create or replace function public.admin_create_invite(
  p_email text,
  p_role text default 'staff',
  p_tenant uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_tenant uuid := p_tenant;
  v_email text := lower(trim(coalesce(p_email, '')));
  v_token text;
  v_id uuid;
  v_expires timestamptz := now() + interval '72 hours';
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;
  if position('@' in v_email) <= 1 then
    raise exception 'invalid_email' using errcode = 'P0001';
  end if;
  if p_role not in ('owner', 'manager', 'staff', 'platform') then
    raise exception 'invalid_role' using errcode = 'P0001';
  end if;

  if p_role = 'platform' then
    if not public.is_platform_admin() then
      raise exception 'forbidden' using errcode = 'P0001';
    end if;
    v_tenant := null;
  else
    if v_tenant is null then
      select tenant_id into v_tenant
        from public.tenant_members
       where user_id = v_uid and active
       order by (role = 'owner') desc
       limit 1;
    end if;
    if v_tenant is null then
      raise exception 'tenant_required' using errcode = 'P0001';
    end if;
    if not (public.is_platform_admin() or public.has_tenant_role(v_tenant, array['owner'])) then
      raise exception 'forbidden' using errcode = 'P0001';
    end if;
  end if;

  -- One-time token: 64 hex chars, shown once to the inviter, stored hashed.
  v_token := replace(gen_random_uuid()::text, '-', '')
          || replace(gen_random_uuid()::text, '-', '');

  insert into public.admin_invites (email, tenant_id, role, token_hash, expires_at, created_by)
  values (v_email, v_tenant, p_role, public.sha256_hex(v_token), v_expires, v_uid)
  returning id into v_id;

  if v_tenant is not null then
    insert into public.audit_log (tenant_id, actor_id, action, entity, entity_id, meta)
    values (v_tenant, v_uid, 'admin.invite_created', 'admin_invite', v_id,
            jsonb_build_object('email', v_email, 'role', p_role));
  end if;

  return jsonb_build_object(
    'id', v_id,
    'email', v_email,
    'role', p_role,
    'tenant_id', v_tenant,
    'token', v_token,
    'expires_at', public.iso_z(v_expires)
  );
end;
$$;

revoke all on function public.admin_create_invite(text, text, uuid) from public;
grant execute on function public.admin_create_invite(text, text, uuid) to authenticated;

create or replace function public.platform_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_platform_admin() then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;

  return jsonb_build_object(
    'tenants', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', t.id,
        'slug', t.slug,
        'status', t.status,
        'plan', t.plan,
        'brand_name', s.brand_name,
        'pending_bookings', (
          select count(*) from public.bookings b
           where b.tenant_id = t.id and b.status = 'pending'
        ),
        'new_leads', (
          select count(*) from public.leads l
           where l.tenant_id = t.id and l.status = 'new'
        ),
        'published_offerings', (
          select count(*) from public.offerings o
           where o.tenant_id = t.id and o.status = 'published'
        )
      ) order by t.slug)
      from public.tenants t
      left join public.site_settings s on s.tenant_id = t.id
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.platform_overview() from public;
grant execute on function public.platform_overview() to authenticated;

commit;
