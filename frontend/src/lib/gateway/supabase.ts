/**
 * Supabase data gateway — the production adapter for the SPA.
 *
 * Public reads and writes go through the security-definer RPCs in
 * supabase/migrations/0003_functions_read.sql and 0004_functions_write.sql, so
 * validation, masking and "first booked wins" stay in Postgres. Admin screens
 * read and update their tenant's rows directly; RLS (0002_rls.sql) decides who
 * may see them and every query additionally filters on the tenant_id taken from
 * the signed-in user's tenant_members row.
 *
 * The client is typed structurally (`SupabaseLike`) instead of importing
 * @supabase/supabase-js types: the adapter only needs a handful of methods and
 * the tests can pass a hand-written fake with no extra dependency.
 */
import type {
  AdminBooking,
  AdminFaq,
  AdminLead,
  AdminOverview,
  AdminSessionResponse,
  AdminSettings,
  AvailabilityResponse,
  BookingResponse,
  BookingStatus,
  BookingStatusResponse,
  I18nText,
  LeadResponse,
  Locale,
  Offering,
  SiteBundle,
  SiteContact,
  SiteLabels,
  SiteTheme,
} from "../../types";
import { ApiError } from "../errors";
import type {
  AdminSessionSummary,
  CreateBookingInput,
  CreateLeadInput,
  DataGateway,
} from "./types";

/** A PostgREST row. Values are narrowed as they are mapped to the SPA types. */
type Row = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Structural client types (only what this adapter uses)
// ---------------------------------------------------------------------------

export interface SupabaseError {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
  /** Present on auth errors, absent on PostgREST errors. */
  status?: number;
}

export interface SupabaseResult<T> {
  data: T | null;
  error: SupabaseError | null;
}

/**
 * The subset of a PostgREST query builder the adapter chains: select, update,
 * equality filters, ordering and a row limit. Awaiting it yields the rows.
 */
export interface SupabaseQuery extends PromiseLike<SupabaseResult<Row[]>> {
  select(columns?: string): SupabaseQuery;
  /**
   * `any` is deliberate: @supabase/postgrest-js declares `eq` as a generic with
   * a schema-dependent conditional value type, and comparing that signature
   * with a plain `(column: string, value: unknown)` makes TypeScript instantiate
   * the conditional types until it gives up ("excessively deep"). `eq` is only
   * ever called with a column name and a scalar, and the returned rows are
   * mapped through the typed helpers below, so nothing unsafe escapes here.
   */
  eq: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  order(column: string, options?: { ascending?: boolean }): SupabaseQuery;
  limit(count: number): SupabaseQuery;
}

/** A table handle: every query starts with select() or update(). */
export interface SupabaseTable {
  select(columns?: string): SupabaseQuery;
  update(values: Row): SupabaseQuery;
}

export interface SupabaseUser {
  id: string;
  email?: string | null;
  user_metadata?: Row | null;
}

export interface SupabaseSession {
  access_token: string;
  /** Unix seconds, as returned by Supabase Auth. */
  expires_at?: number;
  user: SupabaseUser;
}

export interface SupabaseSignInResult {
  user: SupabaseUser | null;
  session: SupabaseSession | null;
}

export interface SupabaseLike {
  rpc(name: string, params?: Row): PromiseLike<SupabaseResult<unknown>>;
  from(table: string): SupabaseTable;
  auth: {
    signInWithPassword(credentials: {
      email: string;
      password: string;
    }): PromiseLike<SupabaseResult<SupabaseSignInResult>>;
    getSession(): PromiseLike<SupabaseResult<{ session: SupabaseSession | null }>>;
    signOut(): PromiseLike<{ error: SupabaseError | null }>;
    onAuthStateChange(callback: (event: string, session: SupabaseSession | null) => void): unknown;
  };
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/** HTTP status for the codes the write/read RPCs raise (0004_functions_write.sql). */
const STATUS_BY_CODE: Record<string, number> = {
  booking_not_found: 404,
  cannot_cancel: 409,
  consent_required: 422,
  forbidden: 403,
  invalid_booking_mode: 422,
  invalid_checkout_mode: 422,
  invalid_credentials: 401,
  invalid_message: 422,
  invalid_name: 422,
  invalid_phone: 422,
  invalid_status: 422,
  invalid_submission: 400,
  invite_invalid: 400,
  not_authenticated: 401,
  offering_not_found: 404,
  rate_limited: 429,
  site_settings_missing: 404,
  slot_taken: 409,
  slot_unavailable: 409,
  starts_at_required: 422,
  unknown_tenant: 404,
  unknown_theme_preset: 422,
  unsupported_locale: 422,
};

/** Our RPCs raise bare snake_case codes as the exception message. */
const CODE_PATTERN = /^[a-z][a-z0-9_]{2,63}$/;

function rpcError(error: SupabaseError): ApiError {
  const message = (error.message ?? "").trim();
  const code = CODE_PATTERN.test(message) ? message : "request_failed";
  return new ApiError(message || code, STATUS_BY_CODE[code] ?? 400, code);
}

function queryError(error: SupabaseError): ApiError {
  switch (error.code) {
    case "42501":
      return new ApiError(error.message || "Forbidden", 403, "forbidden");
    case "PGRST301":
      return new ApiError(error.message || "Not signed in", 401, "not_authenticated");
    case "PGRST116":
      return new ApiError(error.message || "Not found", 404, "not_found");
    default:
      return new ApiError(error.message || "Request failed", 400, "request_failed");
  }
}

function authError(error: SupabaseError): ApiError {
  const message = error.message || "Invalid login";
  const code = (error.code ?? "").toLowerCase();
  if (code === "email_not_confirmed") {
    return new ApiError(message, 403, "email_not_confirmed");
  }
  if (error.status === 429 || code === "over_email_send_rate_limit") {
    return new ApiError(message, 429, "rate_limited");
  }
  return new ApiError(message, 401, "invalid_credentials");
}

// ---------------------------------------------------------------------------
// Row helpers — DB snake_case in, frontend/src/types.ts shapes out
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Row {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asRow(value: unknown): Row {
  return isRecord(value) ? value : {};
}

function asText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asI18n(value: unknown): I18nText {
  const text: I18nText = {};
  for (const [key, item] of Object.entries(asRow(value))) {
    if (typeof item === "string") text[key] = item;
  }
  return text;
}

function mapLabels(value: unknown): SiteLabels {
  const row = asRow(value);
  const labels: SiteLabels = {};
  if (row.offerings_plural !== undefined) labels.offerings_plural = asI18n(row.offerings_plural);
  if (row.offerings_singular !== undefined) labels.offerings_singular = asI18n(row.offerings_singular);
  if (row.book_cta !== undefined) labels.book_cta = asI18n(row.book_cta);
  if (row.staff_label !== undefined) labels.staff_label = asI18n(row.staff_label);
  if (row.deposit_label !== undefined) labels.deposit_label = asI18n(row.deposit_label);
  return labels;
}

function mapContact(value: unknown): SiteContact {
  const row = asRow(value);
  const contact: SiteContact = {
    whatsapp: asText(row.whatsapp),
    phone: asText(row.phone),
    email: asText(row.email),
    address: asI18n(row.address),
    map_url: asText(row.map_url),
    opening_hours: asI18n(row.opening_hours),
  };
  if (typeof row.closes_at === "string") contact.closes_at = row.closes_at;
  if (typeof row.last_appointment === "string") contact.last_appointment = row.last_appointment;
  return contact;
}

function mapTheme(value: unknown, presetKey: unknown): SiteTheme {
  const row = asRow(value);
  const tokens = asRow(row.tokens);
  return {
    preset: asText(row.preset) || asText(presetKey) || "slate-mist",
    typography: asText(row.typography),
    layout: asText(row.layout),
    tokens: {
      bg: asText(tokens.bg),
      surface: asText(tokens.surface),
      surface2: asText(tokens.surface2),
      text: asText(tokens.text),
      muted: asText(tokens.muted),
      primary: asText(tokens.primary),
      onPrimary: asText(tokens.onPrimary),
      accent: asText(tokens.accent),
      border: asText(tokens.border),
      ring: asText(tokens.ring),
    },
  };
}

const LOCALES: Locale[] = ["en", "ms", "zh"];

function isLocale(value: string): value is Locale {
  return (LOCALES as string[]).includes(value);
}

function mapLocale(value: unknown): Locale {
  const locale = asText(value);
  return isLocale(locale) ? locale : "en";
}

function mapLocales(value: unknown): Locale[] {
  if (!Array.isArray(value)) return ["en"];
  const locales = value.filter((item): item is Locale => typeof item === "string" && isLocale(item));
  return locales.length > 0 ? locales : ["en"];
}

function mapOffering(row: Row): Offering {
  const attributes = asRow(row.attributes);
  const duration = asNumber(attributes.duration_min) ?? asNumber(row.duration_min);
  const offering: Offering = {
    id: asText(row.id),
    slug: asText(row.slug),
    kind: asText(row.kind) || "service",
    title: asI18n(row.title),
    summary: asI18n(row.summary),
    body: asI18n(row.body),
    price_cents: asNumber(row.price_cents),
    deposit_cents: asNumber(row.deposit_cents),
    currency: asText(row.currency) || "MYR",
    price_note: asI18n(row.price_note),
    attributes: {},
    duration_min: duration,
    status: asText(row.status) || "draft",
    sort: asNumber(row.sort) ?? 0,
  };
  if (duration !== null) offering.attributes.duration_min = duration;
  if (typeof attributes.format === "string") offering.attributes.format = attributes.format;
  if (isRecord(attributes.preparation_notes)) {
    offering.attributes.preparation_notes = asI18n(attributes.preparation_notes);
  }
  return offering;
}

const BOOKING_STATUSES: BookingStatus[] = ["pending", "confirmed", "declined", "cancelled"];

function isBookingStatus(value: string): value is BookingStatus {
  return (BOOKING_STATUSES as string[]).includes(value);
}

function mapBookingStatus(value: unknown): BookingStatus {
  const status = asText(value);
  if (isBookingStatus(status)) return status;
  // The table also allows "completed"; the SPA has no badge or action for it,
  // so a completed appointment reads as confirmed (its closest terminal state).
  return status === "completed" ? "confirmed" : "cancelled";
}

const ADMIN_BOOKING_COLUMNS =
  "id,booking_ref,starts_at,ends_at,status,customer_display_name,customer_contact_masked," +
  "deposit_cents,amount_cents,payment_verified,locale,created_at,offering:offerings(*)";

const OFFERING_COLUMNS =
  "id,slug,kind,title,summary,body,price_cents,deposit_cents,currency,price_note,attributes," +
  "status,sort";

const LEAD_COLUMNS =
  "id,lead_ref,display_name,contact_masked,summary_note,status,locale,source,internal_notes," +
  "created_at";

function mapAdminBooking(row: Row): AdminBooking {
  const embedded = row.offering;
  return {
    id: asText(row.id),
    ref: asText(row.booking_ref),
    status: mapBookingStatus(row.status),
    starts_at: asText(row.starts_at),
    ends_at: asText(row.ends_at),
    customer_name: asText(row.customer_display_name),
    customer_contact_masked: asText(row.customer_contact_masked),
    deposit_cents: asNumber(row.deposit_cents),
    amount_cents: asNumber(row.amount_cents),
    payment_verified: row.payment_verified === true,
    locale: asText(row.locale) || "en",
    offering: isRecord(embedded) ? mapOffering(embedded) : null,
    created_at: asText(row.created_at),
  };
}

function isLeadStatus(value: string): value is AdminLead["status"] {
  return value === "new" || value === "contacted" || value === "closed";
}

function mapLeadStatus(value: unknown): AdminLead["status"] {
  const status = asText(value);
  return isLeadStatus(status) ? status : "new";
}

function mapAdminLead(row: Row): AdminLead {
  return {
    id: asText(row.id),
    ref: asText(row.lead_ref),
    name: asText(row.display_name),
    contact_masked: asText(row.contact_masked),
    message: asText(row.summary_note),
    status: mapLeadStatus(row.status),
    locale: asText(row.locale) || "en",
    source: asText(row.source) || "website_contact",
    internal_notes: asText(row.internal_notes),
    created_at: asText(row.created_at),
  };
}

function mapAdminFaq(row: Row): AdminFaq {
  return {
    id: asText(row.id),
    question: asI18n(row.question),
    answer: asI18n(row.answer),
    published: row.published !== false,
    sort: asNumber(row.sort) ?? 0,
  };
}

const SETTINGS_COLUMNS =
  "brand_name,contact,payment_config,labels,theme,preset_key,default_locale,locales," +
  "checkout_mode,booking_mode";

function mapSettings(row: Row): AdminSettings {
  const theme = mapTheme(row.theme, row.preset_key);
  const payment = asRow(row.payment_config);
  return {
    brand_name: asI18n(row.brand_name),
    contact: mapContact(row.contact),
    payment_config: {
      bank_name: asText(payment.bank_name),
      account_number: asText(payment.account_number),
      account_holder: asText(payment.account_holder),
      qr_image_url: asText(payment.qr_image_url),
      merchant_webhook_url: asText(payment.merchant_webhook_url),
    },
    labels: mapLabels(row.labels),
    theme,
    theme_preset: theme.preset,
    // Theme presets are code (backend/app/theme.py), not rows: expose the
    // current preset only, which is what the settings page can round-trip.
    theme_presets: [{ key: theme.preset, label: theme.preset, tokens: theme.tokens }],
    default_locale: mapLocale(row.default_locale),
    locales: mapLocales(row.locales),
    checkout_mode: asText(row.checkout_mode) || "manual_qr_proof",
    booking_mode: asText(row.booking_mode) || "approval",
    forwarding_configured: asText(payment.merchant_webhook_url) !== "",
  };
}

// ---------------------------------------------------------------------------
// Write-body normalisation (the admin UI sends flat i18n keys, like the backend)
// ---------------------------------------------------------------------------

const FLAT_LOCALE_KEY = /^(.+)_(en|ms|zh)$/;

/**
 * Merge an i18n JSONB column. Accepts both `{ en, zh }` objects and the flat
 * `address_en` / `offerings_plural_zh` form fields the settings page submits.
 */
function mergeText(current: unknown, change: unknown): Row {
  const merged: Row = { ...asRow(current) };
  for (const [key, value] of Object.entries(asRow(change))) {
    if (typeof value === "string") {
      merged[key] = value;
      continue;
    }
    if (isRecord(value)) merged[key] = { ...asRow(merged[key]), ...asRow(value) };
  }
  return merged;
}

function applyFlatLocales(current: unknown, change: unknown): Row {
  const merged: Row = { ...asRow(current) };
  for (const [key, value] of Object.entries(asRow(change))) {
    if (typeof value !== "string") {
      if (isRecord(value)) merged[key] = { ...asRow(merged[key]), ...asRow(value) };
      continue;
    }
    const match = FLAT_LOCALE_KEY.exec(key);
    if (!match) continue;
    const base = match[1];
    merged[base] = { ...asRow(merged[base]), [match[2]]: value.trim() };
  }
  return merged;
}

const CONTACT_STRING_FIELDS = [
  "whatsapp",
  "phone",
  "email",
  "map_url",
  "closes_at",
  "last_appointment",
] as const;

function mergeContact(current: unknown, change: Row): Row {
  const merged = applyFlatLocales(current, change);
  for (const field of CONTACT_STRING_FIELDS) {
    if (typeof change[field] === "string") merged[field] = change[field];
  }
  return merged;
}

function mergeStrings(current: unknown, change: unknown): Row {
  const merged: Row = { ...asRow(current) };
  for (const [key, value] of Object.entries(asRow(change))) {
    if (typeof value === "string") merged[key] = value.trim();
  }
  return merged;
}

const CHECKOUT_MODES = ["none", "manual_qr_proof", "deposit_online"];
const BOOKING_MODES = ["approval", "auto"];
const OFFERING_STATUSES = ["draft", "published"];

function buildSettingsPatch(current: Row, body: Record<string, unknown>): Row {
  const patch: Row = {};

  if (body.brand_name !== undefined) {
    patch.brand_name = mergeText(current.brand_name, body.brand_name);
  }
  if (isRecord(body.contact)) {
    patch.contact = mergeContact(current.contact, body.contact);
  }
  if (isRecord(body.payment_config)) {
    patch.payment_config = mergeStrings(current.payment_config, body.payment_config);
  }
  if (isRecord(body.labels)) {
    patch.labels = applyFlatLocales(current.labels, body.labels);
  }

  if (typeof body.theme_preset === "string" && body.theme_preset.trim() !== "") {
    patch.theme = { ...asRow(current.theme), preset: body.theme_preset.trim() };
  }
  if (isRecord(body.theme)) {
    patch.theme = mergeText(patch.theme ?? current.theme, body.theme);
  }

  let locales = mapLocales(current.locales);
  if (body.locales !== undefined) {
    if (!Array.isArray(body.locales) || body.locales.length === 0) {
      throw new ApiError("Unsupported locale", 422, "unsupported_locale");
    }
    const requested = body.locales.filter(
      (item): item is Locale => typeof item === "string" && isLocale(item),
    );
    if (requested.length !== body.locales.length) {
      throw new ApiError("Unsupported locale", 422, "unsupported_locale");
    }
    locales = requested;
    patch.locales = locales;
  }
  if (body.default_locale !== undefined) {
    const locale = asText(body.default_locale);
    if (!isLocale(locale) || !locales.includes(locale)) {
      throw new ApiError("Unsupported locale", 422, "unsupported_locale");
    }
    patch.default_locale = locale;
  }
  if (body.checkout_mode !== undefined) {
    const mode = asText(body.checkout_mode);
    if (!CHECKOUT_MODES.includes(mode)) {
      throw new ApiError("Invalid checkout mode", 422, "invalid_checkout_mode");
    }
    patch.checkout_mode = mode;
  }
  if (body.booking_mode !== undefined) {
    const mode = asText(body.booking_mode);
    if (!BOOKING_MODES.includes(mode)) {
      throw new ApiError("Invalid booking mode", 422, "invalid_booking_mode");
    }
    patch.booking_mode = mode;
  }
  return patch;
}

function buildOfferingPatch(current: Row, body: Record<string, unknown>): Row {
  const patch: Row = {};
  for (const field of ["title", "summary", "price_note"] as const) {
    if (isRecord(body[field])) patch[field] = mergeText(current[field], body[field]);
  }
  for (const field of ["price_cents", "deposit_cents"] as const) {
    const value = body[field];
    if (value === null) patch[field] = null;
    else if (asNumber(value) !== null) patch[field] = value;
  }
  if (body.status !== undefined) {
    const status = asText(body.status);
    if (!OFFERING_STATUSES.includes(status)) {
      throw new ApiError("Invalid status", 422, "invalid_status");
    }
    patch.status = status;
  }
  return patch;
}

/** The client address is the only tenant hint the public RPCs need. */
function currentHost(): string {
  const host = globalThis.location?.host;
  return typeof host === "string" ? host : "";
}

function displayName(user: SupabaseUser): string {
  const metadata = asRow(user.user_metadata);
  for (const key of ["full_name", "name", "display_name"]) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim() !== "") return value.trim();
  }
  const email = asText(user.email);
  return email === "" ? "" : (email.split("@")[0] ?? "");
}

function expiresAtIso(session: SupabaseSession): string {
  const seconds = session.expires_at;
  return typeof seconds === "number" ? new Date(seconds * 1000).toISOString() : "";
}

interface TenantMembership {
  tenant_id: string;
  role: string;
}

// ---------------------------------------------------------------------------
// Gateway
// ---------------------------------------------------------------------------

export function createSupabaseGateway(client: SupabaseLike): DataGateway {
  let activeTenant: string | null = null;

  /** tenant_members lookup per signed-in user; cleared whenever auth changes. */
  const membershipCache = new Map<string, TenantMembership>();
  client.auth.onAuthStateChange(() => {
    membershipCache.clear();
  });

  async function requireSession(): Promise<SupabaseSession> {
    const { data, error } = await client.auth.getSession();
    if (error) {
      throw new ApiError(error.message || "Not signed in", error.status ?? 401, "not_authenticated");
    }
    if (!data?.session?.user) {
      throw new ApiError("Not signed in", 401, "not_authenticated");
    }
    return data.session;
  }

  async function loadMembership(userId: string): Promise<TenantMembership | null> {
    const cached = membershipCache.get(userId);
    if (cached) return cached;
    const rows = await selectRows(
      "tenant_members",
      "tenant_id, role",
      { user_id: userId, active: true },
      { limit: 1 },
    );
    const row = rows[0];
    if (!row) return null;
    const membership: TenantMembership = {
      tenant_id: asText(row.tenant_id),
      role: asText(row.role) || "staff",
    };
    membershipCache.set(userId, membership);
    return membership;
  }

  async function requireMembership(session: SupabaseSession): Promise<TenantMembership> {
    const membership = await loadMembership(session.user.id);
    if (!membership) {
      throw new ApiError("No workspace access", 403, "forbidden");
    }
    return membership;
  }

  /** Session + tenant for every admin screen, cached per auth session. */
  async function adminTenant(requiredRoles?: string[]): Promise<string> {
    const session = await requireSession();
    const membership = await requireMembership(session);
    if (requiredRoles && !requiredRoles.includes(membership.role)) {
      // RLS would silently update zero rows; mirror the backend's explicit 403.
      throw new ApiError("Forbidden", 403, "forbidden");
    }
    return membership.tenant_id;
  }

  async function selectRows(
    table: string,
    columns: string,
    filters: Row,
    options: { order?: { column: string; ascending: boolean }; limit?: number } = {},
  ): Promise<Row[]> {
    let query = client.from(table).select(columns);
    for (const [column, value] of Object.entries(filters)) {
      query = query.eq(column, value);
    }
    if (options.order) {
      query = query.order(options.order.column, { ascending: options.order.ascending });
    }
    if (options.limit !== undefined) {
      query = query.limit(options.limit);
    }
    const { data, error } = await query;
    if (error) throw queryError(error);
    return data ?? [];
  }

  async function updateRow(
    table: string,
    patch: Row,
    filters: Row,
    columns: string,
    notFoundCode: string,
  ): Promise<Row> {
    let query = client.from(table).update(patch);
    for (const [column, value] of Object.entries(filters)) {
      query = query.eq(column, value);
    }
    const { data, error } = await query.select(columns).limit(1);
    if (error) throw queryError(error);
    const row = (data ?? [])[0];
    if (!row) throw new ApiError("Record not found", 404, notFoundCode);
    return row;
  }

  /**
   * Call one of the SQL functions. The functions return exactly the JSON shapes
   * in frontend/src/types.ts, so the generic is the contract; shape checks would
   * duplicate the migrations and the npm tests cover the mapping.
   */
  async function callRpc<T>(name: string, params: Row): Promise<T> {
    const { data, error } = await client.rpc(name, params);
    if (error) throw rpcError(error);
    if (data === null || data === undefined) {
      throw new ApiError(`Empty response from ${name}`, 502, "bad_gateway");
    }
    return data as T;
  }

  async function readSettings(tenantId: string): Promise<Row> {
    const rows = await selectRows("site_settings", SETTINGS_COLUMNS, { tenant_id: tenantId }, { limit: 1 });
    const row = rows[0];
    if (!row) throw new ApiError("Site settings missing", 404, "site_settings_missing");
    return row;
  }

  return {
    setActiveTenant(slug: string | null): void {
      activeTenant = slug;
    },

    fetchSite(tenant: string | null = null): Promise<SiteBundle> {
      return callRpc<SiteBundle>("site_bundle", {
        p_host: currentHost(),
        p_slug: tenant ?? activeTenant,
      });
    },

    fetchAvailability(offering: string | null, days = 14): Promise<AvailabilityResponse> {
      return callRpc<AvailabilityResponse>("availability", {
        p_offering: offering,
        p_days: days,
        p_host: currentHost(),
      });
    },

    createBooking(input: CreateBookingInput): Promise<BookingResponse> {
      // p_ip_hash stays null: a hash sent by the browser is spoofable, so the
      // database only counts requests proxied by a trusted caller.
      return callRpc<BookingResponse>("create_booking", {
        p_offering_slug: input.offering_slug,
        p_starts_at: input.starts_at,
        p_customer_name: input.customer_name,
        p_customer_phone: input.customer_phone,
        p_locale: input.locale,
        p_consent: input.consent,
        p_host: currentHost(),
        p_website: input.website ?? "",
      });
    },

    fetchBooking(ref: string, token: string): Promise<BookingStatusResponse> {
      return callRpc<BookingStatusResponse>("booking_status", {
        p_ref: ref,
        p_token: token,
        p_host: currentHost(),
      });
    },

    async cancelBooking(ref: string, token: string): Promise<BookingStatusResponse> {
      const response = await callRpc<BookingStatusResponse>("cancel_booking", {
        p_ref: ref,
        p_token: token,
        p_host: currentHost(),
      });
      // cancel_booking returns the record only; the contract always has a URL.
      return { ...response, whatsapp_url: asText(response.whatsapp_url) };
    },

    async uploadProof(): Promise<{ ok: boolean }> {
      // Receipt files are Zero-PII: they must never reach Postgres or a
      // permanent Storage bucket, so the Supabase path has no upload.
      throw new ApiError("Payment proof upload needs a server", 501, "proof_unsupported");
    },

    async createLead(input: CreateLeadInput): Promise<LeadResponse> {
      const response = await callRpc<LeadResponse>("create_lead", {
        p_customer_name: input.customer_name,
        p_customer_phone: input.customer_phone,
        p_message: input.message,
        p_offering_slug: input.offering_slug ?? null,
        p_locale: input.locale,
        p_consent: input.consent,
        p_host: currentHost(),
        p_website: input.website ?? "",
      });
      // create_lead returns the record only; the contract always has a URL.
      return { ...response, whatsapp_url: asText(response.whatsapp_url) };
    },

    async adminLogin(identifier: string, password: string): Promise<AdminSessionResponse> {
      const { data, error } = await client.auth.signInWithPassword({
        email: identifier.trim(),
        password,
      });
      if (error) throw authError(error);
      if (!data) throw new ApiError("Invalid login", 401, "invalid_credentials");
      const session = data.session;
      const user = data.user;
      if (!session || !user) {
        throw new ApiError("Invalid login", 401, "invalid_credentials");
      }
      membershipCache.delete(user.id);
      const membership = await loadMembership(user.id);
      if (!membership) {
        await client.auth.signOut();
        throw new ApiError("No workspace access", 403, "forbidden");
      }
      return {
        token: session.access_token,
        expires_at: expiresAtIso(session),
        staff: { id: user.id, name: displayName(user), role: membership.role },
      };
    },

    async adminLogout(): Promise<{ ok: boolean }> {
      const { error } = await client.auth.signOut();
      membershipCache.clear();
      if (error) {
        throw new ApiError(error.message || "Sign out failed", error.status ?? 500, "logout_failed");
      }
      return { ok: true };
    },

    async adminSession(): Promise<AdminSessionSummary> {
      const session = await requireSession();
      const membership = await requireMembership(session);
      return {
        staff: {
          id: session.user.id,
          name: displayName(session.user),
          role: membership.role,
        },
        expires_at: expiresAtIso(session),
      };
    },

    async adminOverview(): Promise<AdminOverview> {
      const tenantId = await adminTenant();
      return callRpc<AdminOverview>("admin_overview", { p_tenant: tenantId });
    },

    async adminBookings(status = "all"): Promise<{ bookings: AdminBooking[] }> {
      const tenantId = await adminTenant();
      const filters: Row = { tenant_id: tenantId };
      if (status && status !== "all") filters.status = status;
      const rows = await selectRows("bookings", ADMIN_BOOKING_COLUMNS, filters, {
        order: { column: "starts_at", ascending: false },
        limit: 100,
      });
      return { bookings: rows.map(mapAdminBooking) };
    },

    async adminUpdateBooking(
      id: string,
      body: { status?: string; payment_verified?: boolean },
    ): Promise<{ booking: AdminBooking }> {
      const tenantId = await adminTenant();
      const filters: Row = { id, tenant_id: tenantId };
      const patch: Row = {};
      if (body.status !== undefined) {
        if (!isBookingStatus(body.status)) {
          throw new ApiError("Invalid status", 422, "invalid_status");
        }
        patch.status = body.status;
      }
      if (typeof body.payment_verified === "boolean") {
        patch.payment_verified = body.payment_verified;
      }
      if (Object.keys(patch).length === 0) {
        const rows = await selectRows("bookings", ADMIN_BOOKING_COLUMNS, filters, { limit: 1 });
        const row = rows[0];
        if (!row) throw new ApiError("Booking not found", 404, "booking_not_found");
        return { booking: mapAdminBooking(row) };
      }
      const row = await updateRow(
        "bookings",
        patch,
        filters,
        ADMIN_BOOKING_COLUMNS,
        "booking_not_found",
      );
      return { booking: mapAdminBooking(row) };
    },

    async adminLeads(status = "all"): Promise<{ leads: AdminLead[] }> {
      const tenantId = await adminTenant();
      const filters: Row = { tenant_id: tenantId };
      if (status && status !== "all") filters.status = status;
      const rows = await selectRows("leads", LEAD_COLUMNS, filters, {
        order: { column: "created_at", ascending: false },
        limit: 200,
      });
      return { leads: rows.map(mapAdminLead) };
    },

    async adminUpdateLead(
      id: string,
      body: { status?: string; internal_notes?: string },
    ): Promise<{ lead: AdminLead }> {
      const tenantId = await adminTenant();
      const filters: Row = { id, tenant_id: tenantId };
      const patch: Row = {};
      if (body.status !== undefined) {
        if (!isLeadStatus(body.status)) {
          throw new ApiError("Invalid status", 422, "invalid_status");
        }
        patch.status = body.status;
      }
      if (typeof body.internal_notes === "string") {
        patch.internal_notes = body.internal_notes;
      }
      if (Object.keys(patch).length === 0) {
        const rows = await selectRows("leads", LEAD_COLUMNS, filters, { limit: 1 });
        const row = rows[0];
        if (!row) throw new ApiError("Lead not found", 404, "lead_not_found");
        return { lead: mapAdminLead(row) };
      }
      const row = await updateRow("leads", patch, filters, LEAD_COLUMNS, "lead_not_found");
      return { lead: mapAdminLead(row) };
    },

    async adminOfferings(): Promise<{ offerings: Offering[] }> {
      const tenantId = await adminTenant();
      const rows = await selectRows("offerings", OFFERING_COLUMNS, { tenant_id: tenantId }, {
        order: { column: "sort", ascending: true },
      });
      return { offerings: rows.map(mapOffering) };
    },

    async adminUpdateOffering(
      id: string,
      body: Record<string, unknown>,
    ): Promise<{ offering: Offering }> {
      const tenantId = await adminTenant(["owner", "manager"]);
      const filters: Row = { id, tenant_id: tenantId };
      const rows = await selectRows("offerings", OFFERING_COLUMNS, filters, { limit: 1 });
      const current = rows[0];
      if (!current) throw new ApiError("Service not found", 404, "offering_not_found");
      const patch = buildOfferingPatch(current, body);
      if (Object.keys(patch).length === 0) {
        return { offering: mapOffering(current) };
      }
      const row = await updateRow(
        "offerings",
        patch,
        filters,
        OFFERING_COLUMNS,
        "offering_not_found",
      );
      return { offering: mapOffering(row) };
    },

    async adminSettings(): Promise<AdminSettings> {
      return mapSettings(await readSettings(await adminTenant()));
    },

    async adminUpdateSettings(body: Record<string, unknown>): Promise<AdminSettings> {
      const tenantId = await adminTenant(["owner", "manager"]);
      const current = await readSettings(tenantId);
      const patch = buildSettingsPatch(current, body);
      if (Object.keys(patch).length === 0) return mapSettings(current);
      const row = await updateRow(
        "site_settings",
        patch,
        { tenant_id: tenantId },
        SETTINGS_COLUMNS,
        "site_settings_missing",
      );
      return mapSettings(row);
    },

    async adminFaq(): Promise<{ faq: AdminFaq[] }> {
      const tenantId = await adminTenant();
      const rows = await selectRows(
        "faq_items",
        "id,question,answer,published,sort",
        { tenant_id: tenantId },
        { order: { column: "sort", ascending: true } },
      );
      return { faq: rows.map(mapAdminFaq) };
    },
  };
}
