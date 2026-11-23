-- 0008_realtime.sql — live sync between the site and the admin console
--
-- Supabase Realtime pushes row changes to subscribed clients. The publication
-- only exists in a Supabase project; the guard keeps this a no-op under PGlite
-- (where tests/sql runs), so the migration still applies from empty.

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.bookings;
    alter publication supabase_realtime add table public.offerings;
    alter publication supabase_realtime add table public.site_settings;
  end if;
end;
$$;

commit;
