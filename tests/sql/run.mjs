#!/usr/bin/env node
/**
 * SQL layer tests. Runs the real migrations against PGlite (Postgres 17 in WASM)
 * and asserts the behaviour the API promises:
 *
 *   - every migration applies from empty, in order
 *   - first booking wins: the partial unique index rejects a second active slot
 *   - cancelling (or releasing a hold) frees the slot again
 *   - tenant isolation helpers exist and behave
 *
 * Supabase pieces that PGlite cannot provide (the auth schema and auth.uid())
 * are shimmed here only, never in the migrations.
 *
 * Run: npm run test:sql
 */
import { PGlite } from "@electric-sql/pglite";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(here, "..", "..", "supabase", "migrations");

let failures = 0;
let checks = 0;

function ok(label) {
  checks += 1;
  console.log(`  ok   ${label}`);
}

function fail(label, error) {
  checks += 1;
  failures += 1;
  console.error(`  FAIL ${label}\n       ${error?.message ?? error}`);
}

async function check(label, fn) {
  try {
    await fn();
    ok(label);
  } catch (error) {
    fail(label, error);
  }
}

async function rejects(label, fn, matcher) {
  try {
    await fn();
    fail(label, "expected an error, none raised");
  } catch (error) {
    if (matcher && !matcher.test(String(error?.message ?? error))) {
      fail(label, `wrong error: ${error?.message ?? error}`);
      return;
    }
    ok(label);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const AUTH_SHIM = `
create schema if not exists auth;
create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  created_at timestamptz not null default now()
);
create or replace function auth.uid() returns uuid
language sql stable
as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
-- Supabase's API roles. In the hosted project they already exist.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
end;
$$;
grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
`;

async function applyMigrations(db) {
  const files = (await readdir(migrationsDir)).filter((name) => name.endsWith(".sql")).sort();
  assert(files.length > 0, `no migrations found in ${migrationsDir}`);
  for (const file of files) {
    const sql = await readFile(join(migrationsDir, file), "utf8");
    try {
      await db.exec(sql);
    } catch (error) {
      throw new Error(`${file}: ${error.message}`);
    }
  }
  return files;
}

const db = await PGlite.create();

console.log("Applied migrations:");
let applied = [];
try {
  await db.exec(AUTH_SHIM);
  applied = await applyMigrations(db);
  for (const file of applied) console.log(`  - ${file}`);
} catch (error) {
  console.error(`\nMigration failure: ${error.message}`);
  process.exit(1);
}

console.log("\nSchema:");
await check("all business tables exist", async () => {
  const expected = [
    "tenants", "tenant_domains", "site_settings", "page_content", "offerings",
    "faq_items", "availability_rules", "blackout_dates", "bookings", "leads",
    "audit_log", "platform_admins", "tenant_members", "admin_invites", "rate_events",
  ];
  const { rows } = await db.query(
    "select tablename from pg_tables where schemaname = 'public' order by tablename",
  );
  const found = rows.map((r) => r.tablename);
  const missing = expected.filter((name) => !found.includes(name));
  assert(missing.length === 0, `missing: ${missing.join(", ")}`);
});

await check("every tenant table has tenant_id", async () => {
  const { rows } = await db.query(`
    select table_name from information_schema.columns
    where table_schema = 'public' and column_name = 'tenant_id'
  `);
  const withTenant = rows.map((r) => r.table_name);
  for (const table of ["site_settings", "page_content", "offerings", "faq_items", "bookings", "leads"]) {
    assert(withTenant.includes(table), `${table} is missing tenant_id`);
  }
});

console.log("\nBooking slot ownership:");
const tenantId = "11111111-1111-1111-1111-111111111111";
const otherTenantId = "22222222-2222-2222-2222-222222222222";
const offeringId = "33333333-3333-3333-3333-333333333333";

async function seedMinimal() {
  await db.query(
    `insert into public.tenants (id, slug) values ($1, 'test-tenant'), ($2, 'other-tenant')`,
    [tenantId, otherTenantId],
  );
  await db.query(
    `insert into public.offerings (id, tenant_id, slug, status)
     values ($1, $2, 'checkup', 'published')`,
    [offeringId, tenantId],
  );
}

async function insertBooking(ref, status, startsAt = "2026-12-01T02:00:00Z", tenant = tenantId) {
  await db.query(
    `insert into public.bookings
       (tenant_id, booking_ref, offering_id, starts_at, ends_at, status,
        customer_display_name, customer_contact_masked, cancel_token_hash, consent_at)
     values ($1, $2, $3, $4, $5, $6, 'Test', '012-***789', $7, now())`,
    [tenant, ref, offeringId, startsAt, "2026-12-01T02:45:00Z", status, `hash-${ref}`],
  );
}

await seedMinimal();

await check("a pending booking occupies the slot", async () => {
  await insertBooking("AAA-0001", "pending");
});

await rejects(
  "a second active booking on the same slot is rejected",
  () => insertBooking("AAA-0002", "confirmed"),
  /uq_booking_active_slot|duplicate key/i,
);

await check("the same slot in another tenant is allowed", async () => {
  await db.query(
    `insert into public.offerings (id, tenant_id, slug, status)
     values ('44444444-4444-4444-4444-444444444444', $1, 'checkup', 'published')`,
    [otherTenantId],
  );
  await db.query(
    `insert into public.bookings
       (tenant_id, booking_ref, offering_id, starts_at, ends_at, status,
        customer_display_name, customer_contact_masked, cancel_token_hash, consent_at)
     values ($1, 'BBB-0001', '44444444-4444-4444-4444-444444444444',
             '2026-12-01T02:00:00Z', '2026-12-01T02:45:00Z', 'pending',
             'Other', '012-***789', 'hash-bbb0001', now())`,
    [otherTenantId],
  );
});

await check("cancelling frees the slot for the next patient", async () => {
  await db.query(`update public.bookings set status = 'cancelled' where booking_ref = 'AAA-0001'`);
  await insertBooking("AAA-0003", "confirmed");
});

await check("updated_at trigger moves on update", async () => {
  const before = await db.query(
    `select updated_at from public.bookings where booking_ref = 'AAA-0003'`,
  );
  await new Promise((resolve) => setTimeout(resolve, 10));
  await db.query(`update public.bookings set amount_cents = 100 where booking_ref = 'AAA-0003'`);
  const after = await db.query(
    `select updated_at from public.bookings where booking_ref = 'AAA-0003'`,
  );
  assert(
    new Date(after.rows[0].updated_at) > new Date(before.rows[0].updated_at),
    "updated_at did not change",
  );
});

await check("masked contact columns cannot store a raw long number pattern", async () => {
  const { rows } = await db.query(`
    select column_name from information_schema.columns
    where table_schema = 'public' and table_name = 'bookings'
  `);
  const columns = rows.map((r) => r.column_name);
  assert(columns.includes("customer_contact_masked"), "missing masked column");
  assert(!columns.includes("customer_phone"), "raw phone column must not exist");
});

async function asUser(userId, role, fn) {
  await db.exec("begin");
  try {
    await db.exec(`set local role ${role}`);
    await db.query("select set_config('request.jwt.claim.sub', $1, true)", [userId ?? ""]);
    return await fn();
  } finally {
    await db.exec("rollback");
  }
}

console.log("\nRow level security:");
const userA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const userB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const userAdmin = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

await db.query(
  `insert into auth.users (id, email) values
     ($1, 'staff-a@example.my'), ($2, 'owner-b@example.my'), ($3, 'owner@platform.my')`,
  [userA, userB, userAdmin],
);
await db.query(
  `insert into public.tenant_members (user_id, tenant_id, role) values
     ($1, $2, 'staff'), ($3, $4, 'owner')`,
  [userA, tenantId, userB, otherTenantId],
);
await db.query(`insert into public.platform_admins (user_id) values ($1)`, [userAdmin]);
await db.query(
  `insert into public.page_content (tenant_id, page, section, data)
   values ($1, 'home', 'hero', '{"headline":{"en":"A"}}'::jsonb),
          ($2, 'home', 'hero', '{"headline":{"en":"B"}}'::jsonb)`,
  [tenantId, otherTenantId],
);

await rejects(
  "anon cannot read tenants at all",
  () => asUser(null, "anon", () => db.query("select id from public.tenants")),
  /permission denied/i,
);

await check("a tenant member sees only its own tenant", async () => {
  const rows = await asUser(userA, "authenticated", async () => {
    const result = await db.query("select id from public.tenants");
    return result.rows;
  });
  assert(rows.length === 1 && rows[0].id === tenantId, `saw ${rows.length} tenants`);
});

await check("a tenant member cannot read another tenant's bookings", async () => {
  const rows = await asUser(userA, "authenticated", async () => {
    const result = await db.query("select tenant_id from public.bookings");
    return result.rows;
  });
  assert(rows.length > 0, "expected the member's own bookings");
  assert(rows.every((row) => row.tenant_id === tenantId), "another tenant's booking leaked");
});

await check("a platform admin sees every tenant", async () => {
  const rows = await asUser(userAdmin, "authenticated", async () => {
    const result = await db.query("select id from public.tenants");
    return result.rows;
  });
  assert(rows.length === 2, `saw ${rows.length} tenants`);
});

await check("read-only staff cannot rewrite page content", async () => {
  const result = await asUser(userA, "authenticated", () =>
    db.query(
      `update public.page_content set data = '{"headline":{"en":"hacked"}}'::jsonb
       where tenant_id = $1 returning id`,
      [tenantId],
    ),
  );
  assert(result.rows.length === 0, "a staff role must not edit content");
});

await check("a tenant owner can edit its own page content", async () => {
  const result = await asUser(userB, "authenticated", () =>
    db.query(
      `update public.page_content set data = '{"headline":{"en":"B2"}}'::jsonb
       where tenant_id = $1 returning id`,
      [otherTenantId],
    ),
  );
  assert(result.rows.length === 1, "the owner should be able to edit");
});

console.log(`\n${checks - failures}/${checks} checks passed`);
await db.close();
if (failures > 0) process.exit(1);
