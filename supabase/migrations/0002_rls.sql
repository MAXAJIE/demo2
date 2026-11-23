-- 0002_rls.sql — row level security for every tenant table
--
-- Model (docs/09-admin-access.md):
--   * anon            : no table access at all; public data comes only from the
--                       definer RPCs in 0003_functions.sql.
--   * authenticated   : sees rows of the tenants it is an active member of
--                       (tenant_members). Platform admins see everything.
--   * platform admin  : a row in platform_admins, bootstrapped by hand in SQL.
--
-- RLS is enabled, not forced: the definer RPCs run as the table owner and must
-- bypass these policies to serve published content and to take bookings.

begin;

-- ---------------------------------------------------------------------------
-- Helpers. security definer so they can read the authorisation tables without
-- tripping over their own policies (and without recursion).
-- ---------------------------------------------------------------------------
create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.platform_admins pa where pa.user_id = auth.uid()
  );
$$;

create or replace function public.current_tenant_ids()
returns uuid[]
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(array_agg(tm.tenant_id), '{}'::uuid[])
  from public.tenant_members tm
  where tm.user_id = auth.uid() and tm.active;
$$;

create or replace function public.is_tenant_member(p_tenant uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.tenant_members tm
    where tm.user_id = auth.uid() and tm.tenant_id = p_tenant and tm.active
  );
$$;

create or replace function public.has_tenant_role(p_tenant uuid, p_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.tenant_members tm
    where tm.user_id = auth.uid()
      and tm.tenant_id = p_tenant
      and tm.active
      and tm.role = any(p_roles)
  );
$$;

revoke all on function public.is_platform_admin() from public;
revoke all on function public.current_tenant_ids() from public;
revoke all on function public.is_tenant_member(uuid) from public;
revoke all on function public.has_tenant_role(uuid, text[]) from public;
grant execute on function public.is_platform_admin() to authenticated;
grant execute on function public.current_tenant_ids() to authenticated;
grant execute on function public.is_tenant_member(uuid) to authenticated;
grant execute on function public.has_tenant_role(uuid, text[]) to authenticated;

-- ---------------------------------------------------------------------------
-- Enable RLS everywhere. rate_events has no policy on purpose: only definer
-- functions touch it.
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'tenants', 'tenant_domains', 'site_settings', 'page_content', 'offerings',
    'faq_items', 'availability_rules', 'blackout_dates', 'bookings', 'leads',
    'audit_log', 'platform_admins', 'tenant_members', 'admin_invites', 'rate_events'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Tenants and domains
-- ---------------------------------------------------------------------------
create policy tenants_member_or_admin_read on public.tenants
  for select to authenticated
  using (public.is_platform_admin() or public.is_tenant_member(id));

create policy tenant_domains_member_or_admin_read on public.tenant_domains
  for select to authenticated
  using (public.is_platform_admin() or public.is_tenant_member(tenant_id));

create policy tenant_domains_admin_write on public.tenant_domains
  for all to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- ---------------------------------------------------------------------------
-- Public site configuration: read by members/admins, written by owner or manager
-- (platform admins may write any tenant).
-- ---------------------------------------------------------------------------
create policy site_settings_read on public.site_settings
  for select to authenticated
  using (public.is_platform_admin() or public.is_tenant_member(tenant_id));

create policy site_settings_manager_write on public.site_settings
  for update to authenticated
  using (public.is_platform_admin() or public.has_tenant_role(tenant_id, array['owner', 'manager']))
  with check (public.is_platform_admin() or public.has_tenant_role(tenant_id, array['owner', 'manager']));

create policy page_content_read on public.page_content
  for select to authenticated
  using (public.is_platform_admin() or public.is_tenant_member(tenant_id));

create policy page_content_manager_write on public.page_content
  for all to authenticated
  using (public.is_platform_admin() or public.has_tenant_role(tenant_id, array['owner', 'manager']))
  with check (public.is_platform_admin() or public.has_tenant_role(tenant_id, array['owner', 'manager']));

create policy offerings_read on public.offerings
  for select to authenticated
  using (public.is_platform_admin() or public.is_tenant_member(tenant_id));

create policy offerings_manager_write on public.offerings
  for all to authenticated
  using (public.is_platform_admin() or public.has_tenant_role(tenant_id, array['owner', 'manager']))
  with check (public.is_platform_admin() or public.has_tenant_role(tenant_id, array['owner', 'manager']));

create policy faq_items_read on public.faq_items
  for select to authenticated
  using (public.is_platform_admin() or public.is_tenant_member(tenant_id));

create policy faq_items_manager_write on public.faq_items
  for all to authenticated
  using (public.is_platform_admin() or public.has_tenant_role(tenant_id, array['owner', 'manager']))
  with check (public.is_platform_admin() or public.has_tenant_role(tenant_id, array['owner', 'manager']));

create policy availability_rules_read on public.availability_rules
  for select to authenticated
  using (public.is_platform_admin() or public.is_tenant_member(tenant_id));

create policy availability_rules_manager_write on public.availability_rules
  for all to authenticated
  using (public.is_platform_admin() or public.has_tenant_role(tenant_id, array['owner', 'manager']))
  with check (public.is_platform_admin() or public.has_tenant_role(tenant_id, array['owner', 'manager']));

create policy blackout_dates_read on public.blackout_dates
  for select to authenticated
  using (public.is_platform_admin() or public.is_tenant_member(tenant_id));

create policy blackout_dates_manager_write on public.blackout_dates
  for all to authenticated
  using (public.is_platform_admin() or public.has_tenant_role(tenant_id, array['owner', 'manager']))
  with check (public.is_platform_admin() or public.has_tenant_role(tenant_id, array['owner', 'manager']));

-- ---------------------------------------------------------------------------
-- Bookings and leads: staff read and update; creation happens only through the
-- definer RPCs (no insert policy for authenticated or anon).
-- ---------------------------------------------------------------------------
create policy bookings_staff_read on public.bookings
  for select to authenticated
  using (public.is_platform_admin() or public.is_tenant_member(tenant_id));

create policy bookings_staff_update on public.bookings
  for update to authenticated
  using (public.is_platform_admin() or public.is_tenant_member(tenant_id))
  with check (public.is_platform_admin() or public.is_tenant_member(tenant_id));

create policy leads_staff_read on public.leads
  for select to authenticated
  using (public.is_platform_admin() or public.is_tenant_member(tenant_id));

create policy leads_staff_update on public.leads
  for update to authenticated
  using (public.is_platform_admin() or public.is_tenant_member(tenant_id))
  with check (public.is_platform_admin() or public.is_tenant_member(tenant_id));

-- ---------------------------------------------------------------------------
-- Audit log: owners and platform admins read; writes only from definer RPCs.
-- ---------------------------------------------------------------------------
create policy audit_log_owner_read on public.audit_log
  for select to authenticated
  using (public.is_platform_admin() or public.has_tenant_role(tenant_id, array['owner']));

-- ---------------------------------------------------------------------------
-- Admin access tables
-- ---------------------------------------------------------------------------
create policy platform_admins_self_or_admin_read on public.platform_admins
  for select to authenticated
  using (public.is_platform_admin() or user_id = auth.uid());

create policy platform_admins_admin_write on public.platform_admins
  for all to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

create policy tenant_members_read on public.tenant_members
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_platform_admin()
    or public.is_tenant_member(tenant_id)
  );

create policy tenant_members_owner_write on public.tenant_members
  for all to authenticated
  using (public.is_platform_admin() or public.has_tenant_role(tenant_id, array['owner']))
  with check (public.is_platform_admin() or public.has_tenant_role(tenant_id, array['owner']));

create policy admin_invites_read on public.admin_invites
  for select to authenticated
  using (
    public.is_platform_admin()
    or (tenant_id is not null and public.has_tenant_role(tenant_id, array['owner']))
  );

create policy admin_invites_write on public.admin_invites
  for insert to authenticated
  with check (
    (tenant_id is null and public.is_platform_admin())
    or (tenant_id is not null and public.has_tenant_role(tenant_id, array['owner']))
  );

create policy admin_invites_update on public.admin_invites
  for update to authenticated
  using (
    public.is_platform_admin()
    or (tenant_id is not null and public.has_tenant_role(tenant_id, array['owner']))
  )
  with check (
    public.is_platform_admin()
    or (tenant_id is not null and public.has_tenant_role(tenant_id, array['owner']))
  );

-- ---------------------------------------------------------------------------
-- Privileges. Supabase grants broadly by default; be explicit instead.
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon, authenticated;
grant usage on schema public to anon, authenticated;

grant select on public.tenants, public.tenant_domains, public.site_settings,
  public.page_content, public.offerings, public.faq_items,
  public.availability_rules, public.blackout_dates, public.bookings,
  public.leads, public.audit_log, public.platform_admins,
  public.tenant_members, public.admin_invites
  to authenticated;

grant insert, update on public.site_settings, public.page_content, public.offerings,
  public.faq_items, public.availability_rules, public.blackout_dates,
  public.bookings, public.leads, public.platform_admins,
  public.tenant_members, public.admin_invites
  to authenticated;

commit;
