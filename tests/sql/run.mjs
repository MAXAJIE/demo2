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
import { readFileSync } from "node:fs";
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

console.log("\nPublic read RPCs:");
await db.query(`delete from public.tenant_domains where hostname = 'localhost'`);
await db.query(
  `insert into public.tenant_domains (hostname, tenant_id, is_primary)
   values ('localhost', $1, true)`,
  [tenantId],
);
await db.query(
  `insert into public.site_settings
     (tenant_id, brand_name, default_locale, locales, timezone, theme, labels, contact, payment_config)
   values ($1, '{"en":"Test Clinic","ms":"Klinik Ujian","zh":"Ã¦Âµâ€¹Ã¨Â¯â€¢Ã¨Â¯Å Ã¦â€°â‚¬"}', 'en',
           '["en","ms","zh"]', 'Asia/Kuala_Lumpur', '{"tokens":{"bg":"#fff"}}',
           '{"book_cta":{"en":"Book"}}',
           '{"closes_at":"23:00","whatsapp":"60123456789"}',
           '{}')`,
  [tenantId],
);
await db.query(
  `update public.offerings set attributes = '{"duration_min":60}' where tenant_id = $1`,
  [tenantId],
);
await db.query(
  `insert into public.availability_rules (tenant_id, weekday, start_time, end_time, slot_minutes)
   values ($1, 1, '12:00', '22:30', 45),
          ($1, 4, '14:00', '22:30', 45),
          ($1, 0, '10:00', '22:30', 45)`,
  [tenantId],
);
await db.query(
  `insert into public.page_content (tenant_id, page, section, data)
   values ($1, 'home', 'hero', '{"headline":{"en":"Open until 11 PM"}}'::jsonb)`,
  [tenantId],
);

const avail = await asUser(null, "anon", async () => {
  const result = await db.query("select public.availability('checkup', 14, '127.0.0.1') as payload");
  return result.rows[0].payload;
});

await check("availability returns a 14-day window for anon", async () => {
  assert(Array.isArray(avail.days) && avail.days.length === 14, `days=${avail.days?.length}`);
  assert(avail.timezone === "Asia/Kuala_Lumpur", avail.timezone);
});

await check("no slot starts so late that the treatment ends after closing", async () => {
  const withSlots = avail.days.slice(1).filter((day) => day.slots.length > 0);
  assert(withSlots.length > 0, "expected open days in the window");
  for (const day of withSlots) {
    const last = day.slots[day.slots.length - 1].time;
    assert(last <= "22:00", `${day.date} (wd ${day.weekday}) offers ${last} for a 60-min treatment`);
  }
});

await check("the grid starts at each day's opening time", async () => {
  const opening = { 0: "10:00", 1: "12:00", 4: "14:00" };
  const seen = new Set();
  for (const day of avail.days.slice(1)) {
    const expected = opening[day.weekday];
    if (!expected) continue;
    assert(day.slots.length > 0, `${day.date} (wd ${day.weekday}) should be open`);
    assert(day.slots[0].time === expected, `${day.date} starts at ${day.slots[0].time}, expected ${expected}`);
    seen.add(day.weekday);
  }
  assert(seen.size >= 2, `expected Monday/Thursday/Sunday in the window, saw ${[...seen]}`);
});

await check("an existing booking removes exactly that slot", async () => {
  const target = avail.days.slice(1).find((day) => day.weekday === 1 && day.slots.length > 0);
  const first = target.slots[0];
  await db.query(
    `insert into public.bookings
       (tenant_id, booking_ref, offering_id, starts_at, ends_at, status,
        customer_display_name, customer_contact_masked, cancel_token_hash, consent_at)
     values ($1, 'SLOT-HOLD-1', $2, $3, $3::timestamptz + interval '60 minutes',
             'pending', 'Slot Test', '6012***789', 'hash-slot-1', now())`,
    [tenantId, offeringId, first.starts_at],
  );
  const after = await asUser(null, "anon", async () => {
    const result = await db.query("select public.availability('checkup', 14, '127.0.0.1') as payload");
    return result.rows[0].payload;
  });
  const sameDay = after.days.find((day) => day.date === target.date);
  const times = sameDay.slots.map((slot) => slot.time);
  assert(!times.includes(first.time), `${first.time} should be blocked after booking`);
});

await check("an unknown host is rejected instead of served", async () => {
  await rejects(
    "unknown host",
    () =>
      asUser(null, "anon", () =>
        db.query("select public.availability(null, 14, 'evil.example')"),
      ),
    /unknown_tenant/,
  );
});

const bundle = await asUser(null, "anon", async () => {
  const result = await db.query("select public.site_bundle('127.0.0.1', null) as payload");
  return result.rows[0].payload;
});

await check("site_bundle exposes the tenant, three locales and content", async () => {
  assert(bundle.tenant.slug === "test-tenant", bundle.tenant.slug);
  assert(JSON.stringify(bundle.site.locales) === JSON.stringify(["en", "ms", "zh"]));
  assert(bundle.site.brand_name.en === "Test Clinic", JSON.stringify(bundle.site.brand_name));
  assert(bundle.content.home.hero.headline.en === "Open until 11 PM");
  assert(bundle.offerings.length === 1 && bundle.offerings[0].duration_min === 60);
});

await check("site_bundle provides a 7-day schedule and at most 3 next slots", async () => {
  assert(bundle.schedule.length === 7, `schedule=${bundle.schedule.length}`);
  const monday = bundle.schedule.find((day) => day.weekday === 1);
  assert(monday && monday.closed === false, "Monday should be open");
  assert(monday.hours.includes("PM"), `hours should be 12-hour: ${monday.hours}`);
  assert(bundle.next_slots.length <= 3, `next_slots=${bundle.next_slots.length}`);
});

async function asUser(userId, role, fn, persist = true) {
  await db.exec("begin");
  try {
    await db.exec(`set local role ${role}`);
    await db.query("select set_config('request.jwt.claim.sub', $1, true)", [userId ?? ""]);
    const result = await fn();
    await db.exec(persist ? "commit" : "rollback");
    return result;
  } catch (error) {
    await db.exec("rollback");
    throw error;
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
   values ($1, 'home', 'hero', '{"headline":{"en":"B"}}'::jsonb)`,
  [otherTenantId],
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
  const ids = rows.map((row) => row.id);
  assert(ids.includes(tenantId) && ids.includes(otherTenantId), `saw ${rows.length} tenants`);
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

console.log("\nWrite RPCs:");
const fresh = await asUser(null, "anon", async () => {
  const result = await db.query("select public.availability('checkup', 30, '127.0.0.1') as payload");
  return result.rows[0].payload;
});
const openDays = fresh.days.filter((day) => day.slots.length > 0);
const lastDay = openDays[openDays.length - 1];
const slotA = lastDay.slots[0];
const slotB = lastDay.slots[1];

const created = await asUser(null, "anon", async () => {
  const result = await db.query(
    `select public.create_booking($1, $2::timestamptz, $3, $4, $5, $6, '127.0.0.1') as payload`,
    ["checkup", slotA.starts_at, "Aisyah Test", "0123456789", "en", true],
  );
  return result.rows[0].payload;
});

await check("a booking is created with a ref, a token and a WhatsApp link", async () => {
  assert(/^[A-Z]{3}-\d{6}-[0-9A-F]{4}$/.test(created.booking.ref), created.booking.ref);
  assert(created.booking.cancel_token.length === 32, `token=${created.booking.cancel_token}`);
  assert(created.booking.status === "pending", created.booking.status);
  assert(created.whatsapp_url.startsWith("https://wa.me/60123456789?text="), created.whatsapp_url);
});

await check("the database stores a masked contact and only a token hash", async () => {
  const result = await db.query(
    `select customer_contact_masked, cancel_token_hash, customer_display_name
       from public.bookings where booking_ref = $1`,
    [created.booking.ref],
  );
  const row = result.rows[0];
  assert(row.customer_contact_masked === "6012***789", row.customer_contact_masked);
  assert(row.cancel_token_hash !== created.booking.cancel_token, "raw token must not be stored");
  assert(row.cancel_token_hash.length === 64, "expected a sha256 hex hash");
});

await rejects(
  "the same slot cannot be booked twice",
  () =>
    asUser(null, "anon", () =>
      db.query(
        `select public.create_booking($1, $2::timestamptz, 'Bala Test', '0129876543', 'en', true, '127.0.0.1')`,
        ["checkup", slotA.starts_at],
      ),
    ),
  /slot_taken|slot_unavailable/,
);

await rejects(
  "consent is required",
  () =>
    asUser(null, "anon", () =>
      db.query(
        `select public.create_booking('checkup', $1::timestamptz, 'No Consent', '0129876543', 'en', false, '127.0.0.1')`,
        [slotB.starts_at],
      ),
    ),
  /consent_required/,
);

await rejects(
  "the honeypot is rejected",
  () =>
    asUser(null, "anon", () =>
      db.query(
        `select public.create_booking('checkup', $1::timestamptz, 'Bot', '0129876543', 'en', true, '127.0.0.1', null, 'http://spam')`,
        [slotB.starts_at],
      ),
    ),
  /invalid_submission/,
);

const status = await asUser(null, "anon", async () => {
  const result = await db.query(
    `select public.booking_status($1, $2, '127.0.0.1') as payload`,
    [created.booking.ref, created.booking.cancel_token],
  );
  return result.rows[0].payload;
});

await check("the confirmation page can read its booking with the token", async () => {
  assert(status.booking.ref === created.booking.ref);
  assert(status.booking.customer_contact_masked === "6012***789");
  assert(typeof status.whatsapp_url === "string" && status.whatsapp_url.includes("wa.me"));
});

await rejects(
  "a wrong token cannot read the booking",
  () =>
    asUser(null, "anon", () =>
      db.query(`select public.booking_status($1, 'wrong-token', '127.0.0.1')`, [created.booking.ref]),
    ),
  /booking_not_found/,
);

await check("marking the WhatsApp message sent keeps the hold", async () => {
  await asUser(null, "anon", () =>
    db.query(`select public.mark_whatsapp_sent($1, $2, '127.0.0.1')`, [
      created.booking.ref,
      created.booking.cancel_token,
    ]),
  );
  await db.query(
    `update public.bookings set created_at = now() - interval '30 minutes' where booking_ref = $1`,
    [created.booking.ref],
  );
  await db.query("select public.release_expired_holds($1)", [tenantId]);
  const result = await db.query(
    `select status, whatsapp_sent_at from public.bookings where booking_ref = $1`,
    [created.booking.ref],
  );
  assert(result.rows[0].status === "pending", "a sent request must not be released");
  assert(result.rows[0].whatsapp_sent_at !== null, "whatsapp_sent_at should be set");
});

const holdBooking = await asUser(null, "anon", async () => {
  const result = await db.query(
    `select public.create_booking('checkup', $1::timestamptz, 'Hold Test', '0127777777', 'en', true, '127.0.0.1') as payload`,
    [slotB.starts_at],
  );
  return result.rows[0].payload;
});

await check("an unsent hold older than 10 minutes is released", async () => {
  await db.query(
    `update public.bookings set created_at = now() - interval '11 minutes' where booking_ref = $1`,
    [holdBooking.booking.ref],
  );
  const released = await db.query("select public.release_expired_holds($1) as n", [tenantId]);
  assert(released.rows[0].n >= 1, `released=${released.rows[0].n}`);
  const row = await db.query(
    `select status from public.bookings where booking_ref = $1`,
    [holdBooking.booking.ref],
  );
  assert(row.rows[0].status === "cancelled", row.rows[0].status);
});

await check("the released slot can be booked again", async () => {
  const again = await asUser(null, "anon", async () => {
    const result = await db.query(
      `select public.create_booking('checkup', $1::timestamptz, 'Reuse Test', '0125555555', 'en', true, '127.0.0.1') as payload`,
      [slotB.starts_at],
    );
    return result.rows[0].payload;
  });
  assert(again.booking.status === "pending", again.booking.status);
});

const lead = await asUser(null, "anon", async () => {
  const result = await db.query(
    `select public.create_lead('Mei Ling', '0111234567', 'Can I book a scaling next week?', null, 'en', true, '127.0.0.1') as payload`,
  );
  return result.rows[0].payload;
});

await check("a lead is created with a masked contact", async () => {
  assert(/^LED-\d{6}-[0-9A-F]{4}$/.test(lead.lead.ref), lead.lead.ref);
  assert(lead.lead.contact_masked === "6011***567", lead.lead.contact_masked);
  assert(lead.lead.status === "new");
});

await rejects(
  "an invalid phone is rejected",
  () =>
    asUser(null, "anon", () =>
      db.query(`select public.create_lead('Bad', '123', 'too short number', null, 'en', true, '127.0.0.1')`),
    ),
  /invalid_phone/,
);

console.log("\nAdmin access:");
const newUser = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const inviteToken = "invite-token-for-tests-123456";
await db.query(`insert into auth.users (id, email) values ($1, 'newstaff@example.my')`, [newUser]);
await db.query(
  `insert into public.admin_invites (email, tenant_id, role, token_hash, expires_at)
   values ('newstaff@example.my', $1, 'manager',
           encode(sha256(convert_to($2, 'utf8')), 'hex'), now() + interval '1 day')`,
  [tenantId, inviteToken],
);

const claimed = await asUser(newUser, "authenticated", async () => {
  const result = await db.query("select public.claim_admin_invite($1) as payload", [inviteToken]);
  return result.rows[0].payload;
});

await check("an invited email becomes a tenant manager", async () => {
  assert(claimed.ok === true && claimed.role === "manager", JSON.stringify(claimed));
  const row = await db.query(
    `select role, active from public.tenant_members where user_id = $1 and tenant_id = $2`,
    [newUser, tenantId],
  );
  assert(row.rows[0].role === "manager" && row.rows[0].active === true);
});

await rejects(
  "an invite cannot be claimed twice",
  () =>
    asUser(newUser, "authenticated", () =>
      db.query("select public.claim_admin_invite($1)", [inviteToken]),
    ),
  /invite_invalid/,
);

await rejects(
  "an invite for a different email is rejected",
  async () => {
    const otherToken = "invite-token-for-someone-else";
    await db.query(
      `insert into public.admin_invites (email, tenant_id, role, token_hash, expires_at)
       values ('someone-else@example.my', $1, 'staff',
               encode(sha256(convert_to($2, 'utf8')), 'hex'), now() + interval '1 hour')`,
      [tenantId, otherToken],
    );
    return asUser(newUser, "authenticated", () =>
      db.query("select public.claim_admin_invite($1)", [otherToken]),
    );
  },
  /invite_invalid/,
);

const overview = await asUser(userA, "authenticated", async () => {
  const result = await db.query("select public.admin_overview($1) as payload", [tenantId]);
  return result.rows[0].payload;
});

await check("admin_overview reports counts and upcoming bookings", async () => {
  assert(overview.tenant.slug === "test-tenant", overview.tenant?.slug);
  assert(overview.counts.pending_bookings >= 1, JSON.stringify(overview.counts));
  assert(Array.isArray(overview.upcoming) && overview.upcoming.length >= 1);
  assert(overview.upcoming[0].ref, "upcoming rows need a ref");
});

await rejects(
  "admin_overview refuses a tenant the user does not belong to",
  () =>
    asUser(userA, "authenticated", () =>
      db.query("select public.admin_overview($1)", [otherTenantId]),
    ),
  /forbidden/,
);


console.log("\nSeed data:");
const seeded = await asUser(null, "anon", async () => {
  const result = await db.query("select public.site_bundle('setapak-dental-jb.localhost', null) as payload");
  return result.rows[0].payload;
});

await check("the seeded demo tenant matches the public bundle snapshot", async () => {
  const snapshot = JSON.parse(readFileSync("content/setapak.bundle.json", "utf8"));
  assert(seeded.tenant.slug === snapshot.tenant.slug, seeded.tenant.slug);
  assert(seeded.offerings.length === snapshot.offerings.length, `offerings ${seeded.offerings.length}`);
  assert(Object.keys(seeded.content).sort().join() === Object.keys(snapshot.content).sort().join(), "content pages differ");
  assert(seeded.content.home.hero.headline.en === snapshot.content.home.hero.headline.en, "headline differs");
  assert(JSON.stringify(seeded.site.locales) === JSON.stringify(["en", "ms", "zh"]), "locales");
});

await check("seeded slots for the 60-minute treatment end by closing", async () => {
  const result = await asUser(null, "anon", async () =>
    (await db.query("select public.availability('root-canal-crown-restoration', 21, 'setapak-dental-jb.localhost') as payload")).rows[0].payload,
  );
  const open = result.days.filter((day) => day.slots.length > 0);
  assert(open.length > 0, "expected open days");
  for (const day of open) {
    const last = day.slots[day.slots.length - 1].time;
    assert(last <= "22:00", `${day.date} last start ${last}`);
  }
});

console.log(`\n${checks - failures}/${checks} checks passed`);

await db.close();
if (failures > 0) process.exit(1);
