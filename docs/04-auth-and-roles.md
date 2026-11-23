# 04 Authentication and roles

## Principles
- **Only staff and platform super-admins log in.** End customers never create accounts.
- Supabase Auth: email + password and magic link. TOTP MFA supported for `owner` and `super_admin`.
- Authorization is strictly enforced by **Postgres RLS** scoped to `tenant_id`. UI checks are for UX only.

## Roles
| Role | Scope | Permissions |
|---|---|---|
| `super_admin` | Platform-wide (`platform_admins` table) | Create/suspend tenants, map custom domains, seed presets, view platform health |
| `owner` | Single `tenant_id` | Full control of their tenant: staff, theme, labels, settings, content, bookings, leads |
| `manager` | Single `tenant_id` | Content, offerings, bookings, leads, media. Cannot manage staff or destructive settings |
| `editor` | Single `tenant_id` | Content, offerings, FAQ, media, `en`/`zh` copy. No access to leads or bookings |
| `front_desk` | Single `tenant_id` | View + update bookings and leads (status, notes). No content or theme edits |

## Tenant Permission Matrix (R read, W write, - none)
| Resource (all filtered by `tenant_id`) | owner | manager | editor | front_desk |
|---|---|---|---|---|
| content / offerings / faq / media | RW | RW | RW | R |
| theme + site_settings | RW | R | R | - |
| leads | RW | RW | - | RW |
| bookings + availability | RW | RW | - | R (bookings W) |
| staff + invites | RW | - | - | - |
| audit_log | R | R | - | - |

## Multi-Tenant Implementation Details
- `tenants(id uuid pk, slug text unique, status text default 'active', created_at timestamptz)`
- `tenant_domains(hostname text primary key, tenant_id uuid references tenants(id) on delete cascade, is_primary bool)`
- `staff(id uuid pk, tenant_id uuid not null references tenants(id) on delete cascade, user_id uuid not null references auth.users(id) on delete cascade, role staff_role not null, display_name text, created_at timestamptz, unique(tenant_id, user_id))`
- `SECURITY DEFINER` function `public.has_tenant_role(p_tenant_id uuid, p_roles staff_role[]) returns boolean` verifies `auth.uid()` has one of `p_roles` for `p_tenant_id` (or is in `platform_admins`). Explicitly set `search_path = public`.
- **Public Hostname Resolution:** `anon` has NO direct `SELECT` on `tenants` or `tenant_domains`. Instead, `anon` calls `public.resolve_tenant_by_host(p_hostname text)` (`SECURITY DEFINER`) which returns only `{ tenant_id, slug, status }` for a single exact hostname match.
- **Invites:** Edge Function `invite-staff` verifies caller is `owner` of `p_tenant_id` (or `super_admin`), calls `inviteUserByEmail` via service role, and inserts the `staff` row bound to `p_tenant_id`.
- **Last-Owner Guard:** Database trigger prevents removing or demoting the final `owner` of any active tenant.
- **Storage Isolation:** Single bucket `public-media` with folder-level RLS policies enforcing path prefix `{tenant_id}/...` for all staff writes (`INSERT`, `UPDATE`, `DELETE`).

## Mandatory Cross-Tenant Security Tests (M1)
- Assert `anon` cannot `SELECT` from `tenants`, `tenant_domains`, `leads`, `bookings`, `staff`, `email_log`, or `audit_log`.
- Assert authenticated `owner` of Tenant A gets `0 rows` on `SELECT` and error/0-affected on `UPDATE`/`DELETE` against Tenant B across every single table and storage prefix.
