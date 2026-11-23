# 09 Admin access: two tiers, invite-only

The frontend is the only thing hosted. Authentication and authorisation live in
Supabase Auth + Postgres RLS, so no server of ours decides who may log in.

## The two backstages

| Tier | Who | Route | Sees |
| --- | --- | --- | --- |
| 1 | The clinic's own staff | `/manage` | One tenant: dashboard graphs, bookings, leads, services, settings, staff |
| 2 | You (platform owner) | `/platform` | Every tenant: switch into a tenant's admin, invite staff, fix content, audit log |

Both use the same shell and the same pages; `/platform` adds tenant selection and
is guarded by `is_platform_admin()`.

## Why not "a special code"

A shared secret is only a password with extra steps: it cannot be revoked per
person, cannot be audited, and leaks the moment one holder screenshots it. The
industry-standard shape is an **allowlist with one-time invitations**:

1. Public sign-up is **disabled** in Supabase Auth. There is no "register" page.
2. An account can only be created from an invite row that already names the
   email, the tenant and the role.
3. The invite carries a single-use token, expires in 72 hours, and is stored
   hashed.
4. Nothing is provisioned automatically: a signed-in user with no membership row
   gets a "no access" screen, not an empty admin.

This gives you: per-person revocation (`active = false`), an audit trail, an
expiry, and no way for a stranger who finds `/manage/login` to get in.

## Tables

```sql
-- Supabase's auth.users is the identity table; these are the authorisations.
platform_admins  (user_id uuid pk -> auth.users, note text, created_at)
tenant_members   (user_id uuid, tenant_id uuid, role text check (role in
                  ('owner','manager','staff')), active bool default true,
                  pk (user_id, tenant_id))
admin_invites    (id uuid pk, email citext not null, tenant_id uuid null,
                  role text not null, token_hash text not null,
                  expires_at timestamptz not null, used_at timestamptz,
                  created_by uuid -> auth.users, created_at timestamptz)
audit_log        (existing: tenant_id, actor_id, action, entity, entity_id, meta)
```

`tenant_id is null` on an invite means "platform admin invite" and is only
accepted from a `platform_admins` row, i.e. from you.

## Helper functions used by every policy

```sql
is_platform_admin()                 -- exists in platform_admins, and MFA satisfied when required
current_tenant_ids()                -- tenant_members for auth.uid(), active only
has_tenant_role(tenant_id, roles[]) -- owner/manager/staff check
```

## Policies in one line each

- `tenants`, `site_settings`, `page_content`, `offerings`, `faq_items`,
  `availability_rules`, `blackout_dates`: **public may read** only through the
  `site_bundle()` / `availability()` RPCs (definer, filtered to published data);
  direct `select` is limited to members of that tenant. There is no public
  `select` on `tenants` at all.
- `bookings`, `leads`: insert allowed for `anon` **only** through
  `create_booking()` / `create_lead()` (definer functions with validation and rate
  limiting); `select`/`update` only for tenant members; `platform_admins` read all.
- `audit_log`: insert by definer functions; select for the owning tenant's owners
  and platform admins.
- `admin_invites`: select/insert only for `platform_admins` and tenant `owner`s.

## Invitation flow

```
you (or a tenant owner)                 invitee
-----------------------                 -------
POST invite(email, tenant, role)  -->  row + raw token returned once
                                        link: /manage/login?invite=<token>
                                        sign up with that exact email
                                        RPC claim_invite(token)
                                          - sha256(token) matches an unused row
                                          - email matches auth.email()
                                          - now() < expires_at
                                          - inserts tenant_members, marks used_at
                                        -> lands on /manage
```

Wrong email, expired token, reused token, or no row: the RPC raises
`invite_invalid` and the UI says so without leaking which check failed.

## Platform owner bootstrap

No public path. One SQL statement, run by you once:

```sql
-- after creating your account in Supabase Auth
insert into platform_admins (user_id) values ('<your-auth-user-uuid>');
```

Then `/platform` is yours. Adding a second platform admin, or revoking one, is
the same table.

## Login UX

- `/manage/login`: email + password (Supabase Auth). Password reset by email.
- No self-service sign-up; the page never links to one.
- Optional TOTP MFA for platform admins — Supabase supports it, and RLS checks
  `is_platform_admin()` plus (when you enable it) an `aal2` claim.
- Login and invite claims are rate limited (`auth.rate_limit` settings in
  Supabase, plus an `admin_login_attempts` table if we want our own counter).

## Local demo mode

`npm run dev` with no Supabase keys runs the **local adapter**: bundled seed data,
bookings and leads in `localStorage`, and a clearly-labelled demo session that
unlocks `/manage` and `/platform`. It is a UI demo, not security — the banner says
so. Every real deployment uses the Supabase adapter; the code path is chosen at
build/run time by `VITE_SUPABASE_URL` presence, never by user input.

## Out of scope for now

- SSO / Google login for staff (can be added in Supabase Auth without touching RLS).
- Per-staff row visibility (e.g. only their own appointments). Add a
  `staff_id` column on bookings if the clinic asks.
- Email delivery of invites: Supabase Auth sends the invite email; the raw token
  is shown to the inviter so it can also be sent over WhatsApp.
