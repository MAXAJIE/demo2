import { describe, expect, it } from "vitest";

import { ApiError } from "../errors";
import { createSupabaseGateway } from "./supabase";
import type {
  SupabaseError,
  SupabaseLike,
  SupabaseQuery,
  SupabaseResult,
  SupabaseSession,
  SupabaseSignInResult,
  SupabaseUser,
} from "./supabase";

type Row = Record<string, unknown>;

interface TableCall {
  table: string;
  columns: string;
  update: Row | null;
  filters: [string, unknown][];
  order: { column: string; ascending: boolean } | null;
  limit: number | null;
}

/** Minimal in-memory PostgREST the adapter can chain against. */
class FakeQuery implements SupabaseQuery {
  private columns = "*";
  private patch: Row | null = null;
  private filters: [string, unknown][] = [];
  private ordering: { column: string; ascending: boolean } | null = null;
  private maxRows: number | null = null;

  constructor(
    private readonly client: FakeClient,
    private readonly table: string,
  ) {}

  select(columns = "*"): SupabaseQuery {
    this.columns = columns;
    return this;
  }

  update(values: Row): SupabaseQuery {
    this.patch = values;
    return this;
  }

  eq(column: string, value: unknown): SupabaseQuery {
    this.filters.push([column, value]);
    return this;
  }

  order(column: string, options?: { ascending?: boolean }): SupabaseQuery {
    this.ordering = { column, ascending: options?.ascending ?? true };
    return this;
  }

  limit(count: number): SupabaseQuery {
    this.maxRows = count;
    return this;
  }

  then<TResult1 = SupabaseResult<Row[]>, TResult2 = never>(
    onfulfilled?: ((value: SupabaseResult<Row[]>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.run()).then(onfulfilled, onrejected);
  }

  private matches(row: Row): boolean {
    return this.filters.every(([column, value]) => row[column] === value);
  }

  private limitRows(rows: Row[]): Row[] {
    return this.maxRows === null ? rows : rows.slice(0, this.maxRows);
  }

  private run(): SupabaseResult<Row[]> {
    this.client.tableCalls.push({
      table: this.table,
      columns: this.columns,
      update: this.patch,
      filters: [...this.filters],
      order: this.ordering,
      limit: this.maxRows,
    });
    const error = this.client.errors[this.table];
    if (error) return { data: null, error };

    const patch = this.patch;
    if (patch) {
      const rows = this.client.tables[this.table] ?? [];
      this.client.tables[this.table] = rows.map((row) =>
        this.matches(row) ? { ...row, ...patch } : row,
      );
      return { data: this.limitRows(this.client.tables[this.table].filter((row) => this.matches(row))), error: null };
    }

    let rows = (this.client.tables[this.table] ?? []).filter((row) => this.matches(row));
    if (this.ordering) {
      const { column, ascending } = this.ordering;
      rows = [...rows].sort((left, right) => {
        const a = String(left[column] ?? "");
        const b = String(right[column] ?? "");
        return ascending ? a.localeCompare(b) : b.localeCompare(a);
      });
    }
    return { data: this.limitRows(rows), error: null };
  }
}

class FakeAuth {
  session: SupabaseSession | null = null;
  signInCalls: { email: string; password: string }[] = [];
  signOutCalls = 0;
  private listener: ((event: string, session: SupabaseSession | null) => void) | null = null;

  async signInWithPassword(credentials: {
    email: string;
    password: string;
  }): Promise<SupabaseResult<SupabaseSignInResult>> {
    this.signInCalls.push(credentials);
    return { data: { user: this.session?.user ?? null, session: this.session }, error: null };
  }

  async getSession(): Promise<SupabaseResult<{ session: SupabaseSession | null }>> {
    return { data: { session: this.session }, error: null };
  }

  async signOut(): Promise<{ error: SupabaseError | null }> {
    this.signOutCalls += 1;
    this.session = null;
    this.listener?.("SIGNED_OUT", null);
    return { error: null };
  }

  onAuthStateChange(callback: (event: string, session: SupabaseSession | null) => void): unknown {
    this.listener = callback;
    return { data: { subscription: { unsubscribe: () => undefined } } };
  }
}

class FakeClient implements SupabaseLike {
  readonly tables: Record<string, Row[]> = {};
  readonly errors: Record<string, SupabaseError> = {};
  readonly rpcCalls: { name: string; params: Row }[] = [];
  readonly tableCalls: TableCall[] = [];
  readonly rpcResponses: Record<
    string,
    SupabaseResult<unknown> | ((params: Row) => SupabaseResult<unknown>)
  > = {};
  readonly auth = new FakeAuth();

  rpc(name: string, params: Row = {}): PromiseLike<SupabaseResult<unknown>> {
    this.rpcCalls.push({ name, params });
    const configured = this.rpcResponses[name];
    const response = typeof configured === "function" ? configured(params) : configured;
    return Promise.resolve(response ?? { data: null, error: { message: `no fake for ${name}` } });
  }

  from(table: string): SupabaseQuery {
    return new FakeQuery(this, table);
  }
}

const USER: SupabaseUser = {
  id: "user-1",
  email: "owner@example.com",
  user_metadata: { full_name: "Demo Owner" },
};

function session(): SupabaseSession {
  return { access_token: "access-token-1", expires_at: 1_800_000_000, user: USER };
}

function signedInClient(tenantId = "tenant-a"): FakeClient {
  const client = new FakeClient();
  client.auth.session = session();
  client.tables.tenant_members = [
    { user_id: USER.id, tenant_id: tenantId, role: "owner", active: true },
  ];
  return client;
}

function bookingRow(overrides: Row): Row {
  return {
    id: "booking-1",
    tenant_id: "tenant-a",
    booking_ref: "SCA-261123-AAAA",
    starts_at: "2026-11-24T02:00:00+00:00",
    ends_at: "2026-11-24T02:45:00+00:00",
    status: "pending",
    customer_display_name: "Aisyah Test",
    customer_contact_masked: "6012***789",
    deposit_cents: 5000,
    amount_cents: 15000,
    payment_verified: false,
    locale: "en",
    created_at: "2026-11-20T02:00:00+00:00",
    offering: {
      id: "offering-1",
      slug: "scaling-polishing-checkup",
      kind: "service",
      title: { en: "Scaling", zh: "洗牙" },
      summary: { en: "Clean", zh: "清洁" },
      body: {},
      price_cents: 15000,
      deposit_cents: 5000,
      currency: "MYR",
      price_note: {},
      attributes: { duration_min: 45 },
      status: "published",
      sort: 1,
    },
    ...overrides,
  };
}

describe("supabase gateway public reads and writes", () => {
  it("passes the site bundle RPC through with the tenant slug", async () => {
    const client = new FakeClient();
    const bundle = {
      tenant: { id: "tenant-a", slug: "setapak", status: "active" },
      site: {},
      offerings: [],
    };
    client.rpcResponses.site_bundle = { data: bundle, error: null };
    const gateway = createSupabaseGateway(client);

    await expect(gateway.fetchSite("setapak")).resolves.toBe(bundle);

    expect(client.rpcCalls).toHaveLength(1);
    expect(client.rpcCalls[0]).toMatchObject({
      name: "site_bundle",
      params: { p_slug: "setapak" },
    });
    expect(typeof client.rpcCalls[0].params.p_host).toBe("string");
  });

  it("creates a booking through the RPC and keeps the returned cancel token", async () => {
    const client = new FakeClient();
    const created = {
      booking: {
        ref: "SCA-261123-ABCD",
        status: "pending",
        starts_at: "2026-11-24T02:00:00Z",
        ends_at: "2026-11-24T02:45:00Z",
        customer_name: "Aisyah",
        customer_contact_masked: "6012***789",
        deposit_cents: 5000,
        amount_cents: 15000,
        payment_verified: false,
        locale: "en",
        offering: null,
        cancel_token: "cancel-token-123",
      },
      whatsapp_url: "https://wa.me/60123456789?text=hello",
      forwarded: "not_configured",
      forward_error: null,
    };
    client.rpcResponses.create_booking = { data: created, error: null };
    const gateway = createSupabaseGateway(client);

    const response = await gateway.createBooking({
      offering_slug: "scaling-polishing-checkup",
      starts_at: "2026-11-24T02:00:00Z",
      customer_name: "Aisyah",
      customer_phone: "0123456789",
      locale: "en",
      consent: true,
    });

    expect(response.booking.cancel_token).toBe("cancel-token-123");
    expect(response.whatsapp_url).toBe(created.whatsapp_url);
    expect(client.rpcCalls[0]).toMatchObject({
      name: "create_booking",
      params: {
        p_offering_slug: "scaling-polishing-checkup",
        p_starts_at: "2026-11-24T02:00:00Z",
        p_customer_name: "Aisyah",
        p_customer_phone: "0123456789",
        p_locale: "en",
        p_consent: true,
        p_website: "",
      },
    });
    // The browser never supplies the rate-limit hash (it would be spoofable).
    expect("p_ip_hash" in client.rpcCalls[0].params).toBe(false);
  });

  it("maps an RPC exception message to an ApiError code", async () => {
    const client = new FakeClient();
    client.rpcResponses.create_booking = {
      data: null,
      error: { message: "slot_taken", code: "P0001" },
    };
    const gateway = createSupabaseGateway(client);

    const failure = await gateway
      .createBooking({
        offering_slug: "scaling-polishing-checkup",
        starts_at: "2026-11-24T02:00:00Z",
        customer_name: "Aisyah",
        customer_phone: "0123456789",
        locale: "en",
        consent: true,
      })
      .catch((cause: unknown) => cause);

    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ status: 409, code: "slot_taken", message: "slot_taken" });
  });

  it("fills the contract's whatsapp_url when the write RPCs omit it", async () => {
    const client = new FakeClient();
    client.rpcResponses.create_lead = {
      data: { lead: { ref: "LED-261123-ABCD", status: "new" } },
      error: null,
    };
    client.rpcResponses.cancel_booking = {
      data: { booking: { ref: "SCA-261123-ABCD", status: "cancelled" } },
      error: null,
    };
    const gateway = createSupabaseGateway(client);

    const lead = await gateway.createLead({
      customer_name: "Mei Ling",
      customer_phone: "0111234567",
      message: "Can I book a scaling next week?",
      locale: "en",
      consent: true,
    });
    expect(lead.lead.ref).toBe("LED-261123-ABCD");
    expect(lead.whatsapp_url).toBe("");
    expect(client.rpcCalls[0]).toMatchObject({
      name: "create_lead",
      params: { p_offering_slug: null, p_website: "" },
    });

    const cancelled = await gateway.cancelBooking("SCA-261123-ABCD", "cancel-token-123");
    expect(cancelled.booking.status).toBe("cancelled");
    expect(cancelled.whatsapp_url).toBe("");
    expect(client.rpcCalls[1]).toMatchObject({
      name: "cancel_booking",
      params: { p_ref: "SCA-261123-ABCD", p_token: "cancel-token-123" },
    });
  });
});

describe("supabase gateway admin", () => {
  it("takes the overview tenant from tenant_members and caches it per session", async () => {
    const client = signedInClient();
    const overview = {
      tenant: { slug: "setapak", brand_name: { en: "Setapak Dental" } },
      counts: {
        pending_bookings: 1,
        today_bookings: 1,
        new_leads: 0,
        published_offerings: 2,
      },
      upcoming: [],
      latest_leads: [],
    };
    client.rpcResponses.admin_overview = { data: overview, error: null };
    const gateway = createSupabaseGateway(client);

    await expect(gateway.adminOverview()).resolves.toBe(overview);

    expect(client.rpcCalls[0]).toMatchObject({
      name: "admin_overview",
      params: { p_tenant: "tenant-a" },
    });
    const membershipCalls = client.tableCalls.filter((call) => call.table === "tenant_members");
    expect(membershipCalls).toHaveLength(1);
    expect(membershipCalls[0].columns).toBe("tenant_id, role");
    expect(membershipCalls[0].filters).toEqual([
      ["user_id", USER.id],
      ["active", true],
    ]);
    expect(membershipCalls[0].limit).toBe(1);

    // Same session: the cached membership row is reused.
    client.rpcResponses.admin_overview = { data: overview, error: null };
    await gateway.adminOverview();
    expect(client.tableCalls.filter((call) => call.table === "tenant_members")).toHaveLength(1);
  });

  it("filters and orders admin bookings for the member tenant", async () => {
    const client = signedInClient();
    client.tables.bookings = [
      bookingRow({ id: "booking-a", booking_ref: "SCA-261124-AAAA", starts_at: "2026-11-24T02:00:00+00:00" }),
      bookingRow({
        id: "booking-b",
        booking_ref: "SCA-261125-BBBB",
        starts_at: "2026-11-25T02:00:00+00:00",
        tenant_id: "tenant-b",
      }),
      bookingRow({
        id: "booking-c",
        booking_ref: "SCA-261126-CCCC",
        starts_at: "2026-11-26T02:00:00+00:00",
        status: "confirmed",
      }),
    ];
    const gateway = createSupabaseGateway(client);

    const pending = await gateway.adminBookings("pending");
    expect(pending.bookings.map((booking) => booking.ref)).toEqual(["SCA-261124-AAAA"]);
    expect(pending.bookings[0]).toMatchObject({
      customer_name: "Aisyah Test",
      customer_contact_masked: "6012***789",
      status: "pending",
      payment_verified: false,
    });
    expect(pending.bookings[0].offering?.slug).toBe("scaling-polishing-checkup");

    const bookingCall = client.tableCalls.find((call) => call.table === "bookings");
    expect(bookingCall?.filters).toEqual([
      ["tenant_id", "tenant-a"],
      ["status", "pending"],
    ]);
    expect(bookingCall?.order).toEqual({ column: "starts_at", ascending: false });
    expect(bookingCall?.columns).toContain("offering:offerings(*)");

    // "all" drops the status filter but keeps tenant scoping and newest first.
    const all = await gateway.adminBookings();
    expect(all.bookings.map((booking) => booking.ref)).toEqual([
      "SCA-261126-CCCC",
      "SCA-261124-AAAA",
    ]);
  });

  it("maps site_settings and merges the flat settings form fields", async () => {
    const client = signedInClient();
    client.tables.site_settings = [
      {
        tenant_id: "tenant-a",
        brand_name: { en: "Setapak Dental", zh: "文良港牙科", ms: "Klinik Setapak" },
        contact: {
          whatsapp: "60177410100",
          phone: "",
          email: "",
          address: { en: "A", zh: "B", ms: "C" },
          map_url: "",
          opening_hours: { en: "9-5", zh: "9-5", ms: "9-5" },
          closes_at: "22:00",
        },
        payment_config: {
          bank_name: "Maybank",
          account_number: "123",
          account_holder: "Setapak Dental",
          qr_image_url: "",
          merchant_webhook_url: "",
        },
        labels: { offerings_plural: { en: "Services", zh: "服务", ms: "Perkhidmatan" } },
        theme: {
          preset: "slate-mist",
          typography: "serif",
          layout: "hero",
          tokens: {
            bg: "#ffffff",
            surface: "#ffffff",
            surface2: "#eeeeee",
            text: "#000000",
            muted: "#666666",
            primary: "#123456",
            onPrimary: "#ffffff",
            accent: "#456789",
            border: "#dddddd",
            ring: "#789abc",
          },
        },
        preset_key: "appointment",
        default_locale: "en",
        locales: ["en", "ms", "zh"],
        checkout_mode: "manual_qr_proof",
        booking_mode: "approval",
      },
    ];
    const gateway = createSupabaseGateway(client);

    const settings = await gateway.adminSettings();
    expect(settings.brand_name.en).toBe("Setapak Dental");
    expect(settings.contact.address.zh).toBe("B");
    expect(settings.theme_preset).toBe("slate-mist");
    expect(settings.default_locale).toBe("en");
    expect(settings.forwarding_configured).toBe(false);

    const updated = await gateway.adminUpdateSettings({
      brand_name: { en: "Setapak Dental 2" },
      contact: { address_en: "New address", closes_at: "21:00" },
      labels: { offerings_plural_en: "Treatments" },
      theme_preset: "warm-sand",
    });

    expect(updated.brand_name.en).toBe("Setapak Dental 2");
    expect(updated.brand_name.ms).toBe("Klinik Setapak");
    expect(updated.contact.address.en).toBe("New address");
    expect(updated.contact.address.ms).toBe("C");
    expect(updated.contact.closes_at).toBe("21:00");
    expect(updated.labels.offerings_plural?.en).toBe("Treatments");
    expect(updated.labels.offerings_plural?.zh).toBe("服务");
    expect(updated.theme_preset).toBe("warm-sand");

    const updateCall = client.tableCalls.filter(
      (call) => call.table === "site_settings" && call.update !== null,
    );
    expect(updateCall.at(-1)?.filters).toEqual([["tenant_id", "tenant-a"]]);
  });

  it("rejects admin calls without a session before touching any table", async () => {
    const client = new FakeClient();
    const gateway = createSupabaseGateway(client);

    const failure = await gateway.adminBookings().catch((cause: unknown) => cause);

    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ status: 401, code: "not_authenticated" });
    expect(client.tableCalls).toHaveLength(0);
  });
});

describe("supabase gateway unsupported operations", () => {
  it("refuses payment proof uploads with 501", async () => {
    const client = new FakeClient();
    const gateway = createSupabaseGateway(client);
    const file = new File(["receipt"], "receipt.png", { type: "image/png" });

    const failure = await gateway
      .uploadProof("SCA-261123-ABCD", "cancel-token-123", file)
      .catch((cause: unknown) => cause);

    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ status: 501, code: "proof_unsupported" });
    expect(client.rpcCalls).toHaveLength(0);
  });
});

describe("platform-only admins", () => {
  it("signs in without a tenant membership and reports the platform role", async () => {
    const client = new FakeClient();
    client.auth.session = session();
    client.tables.platform_admins = [{ user_id: USER.id }];

    const gateway = createSupabaseGateway(client);
    const login = await gateway.adminLogin("owner@example.com", "secret");
    expect(login.staff.role).toBe("platform");

    const current = await gateway.adminSession();
    expect(current.staff.role).toBe("platform");
    expect(client.auth.signOutCalls).toBe(0);
  });

  it("still refuses an account with neither membership nor platform access", async () => {
    const client = new FakeClient();
    client.auth.session = session();

    const gateway = createSupabaseGateway(client);
    await expect(gateway.adminLogin("owner@example.com", "secret")).rejects.toMatchObject({
      code: "forbidden",
    });
    expect(client.auth.signOutCalls).toBe(1);
  });
});
