import type {
  AdminBooking,
  AdminFaq,
  AdminInvite,
  AdminLead,
  AdminMember,
  AdminOverview,
  AdminSessionResponse,
  AdminSettings,
  AvailabilityResponse,
  BookingResponse,
  BookingStatusResponse,
  DaySchedule,
  LeadResponse,
  Offering,
  PlatformOverview,
  SiteBundle,
} from "../../types";
import { ApiError } from "../errors";
import { getAdminToken } from "./token";
import type {
  AdminSessionSummary,
  CreateBookingInput,
  CreateLeadInput,
  DataGateway,
} from "./types";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

let activeTenant: string | null = null;

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH";
  body?: unknown;
  form?: FormData;
  auth?: boolean;
  tenant?: string | null;
  headers?: Record<string, string>;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (options.auth) {
    const token = getAdminToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  if (options.headers) Object.assign(headers, options.headers);

  const tenant = options.tenant ?? activeTenant;
  const url = new URL(`${API_BASE}${path}`, window.location.origin);
  if (tenant) url.searchParams.set("tenant", tenant);

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method: options.method ?? "GET",
      headers,
      body: options.form ?? (options.body !== undefined ? JSON.stringify(options.body) : undefined),
    });
  } catch {
    throw new ApiError("Network request failed", 0, "network_error");
  }

  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? ((await response.json()) as unknown)
    : null;

  if (!response.ok) {
    let code = "request_failed";
    let message = `Request failed (${response.status})`;
    if (payload && typeof payload === "object" && "detail" in payload) {
      const detail = (payload as { detail: unknown }).detail;
      if (typeof detail === "string") message = detail;
      else if (detail && typeof detail === "object" && "code" in detail) {
        code = String((detail as { code: unknown }).code);
      }
    }
    throw new ApiError(message, response.status, code);
  }

  return payload as T;
}

function platformUnsupported<T>(what: string): Promise<T> {
  return Promise.reject(
    new ApiError(
      `${what} is only available on the Supabase data source`,
      501,
      "platform_unavailable",
    ),
  );
}

export const restGateway: DataGateway = {
  setActiveTenant(slug: string | null): void {
    activeTenant = slug;
  },

  fetchSite(tenant: string | null = null): Promise<SiteBundle> {
    return request<SiteBundle>("/api/v1/site", { tenant });
  },

  fetchAvailability(offering: string | null, days = 14): Promise<AvailabilityResponse> {
    const params = new URLSearchParams({ days: String(days) });
    if (offering) params.set("offering", offering);
    return request<AvailabilityResponse>(`/api/v1/availability?${params.toString()}`);
  },

  createBooking(input: CreateBookingInput): Promise<BookingResponse> {
    return request<BookingResponse>("/api/v1/bookings", { method: "POST", body: input });
  },

  fetchBooking(ref: string, token: string): Promise<BookingStatusResponse> {
    return request<BookingStatusResponse>(`/api/v1/bookings/${encodeURIComponent(ref)}`, {
      headers: { "X-Booking-Token": token },
    });
  },

  cancelBooking(ref: string, token: string): Promise<BookingStatusResponse> {
    return request<BookingStatusResponse>(`/api/v1/bookings/${encodeURIComponent(ref)}/cancel`, {
      method: "POST",
      body: { token },
    });
  },

  uploadProof(ref: string, token: string, file: File): Promise<{ ok: boolean }> {
    const form = new FormData();
    form.set("token", token);
    form.set("file", file);
    return request<{ ok: boolean }>(`/api/v1/bookings/${encodeURIComponent(ref)}/proof`, {
      method: "POST",
      form,
    });
  },

  createLead(input: CreateLeadInput): Promise<LeadResponse> {
    return request<LeadResponse>("/api/v1/leads", { method: "POST", body: input });
  },

  adminLogin(identifier: string, password: string): Promise<AdminSessionResponse> {
    return request<AdminSessionResponse>("/api/v1/admin/login", {
      method: "POST",
      body: { identifier, password },
    });
  },

  adminLogout(): Promise<{ ok: boolean }> {
    return request<{ ok: boolean }>("/api/v1/admin/logout", { method: "POST", auth: true });
  },

  adminSession(): Promise<AdminSessionSummary> {
    return request<AdminSessionSummary>("/api/v1/admin/session", { auth: true });
  },

  adminOverview(): Promise<AdminOverview> {
    return request<AdminOverview>("/api/v1/admin/overview", { auth: true });
  },

  adminBookings(status = "all"): Promise<{ bookings: AdminBooking[] }> {
    return request<{ bookings: AdminBooking[] }>(
      `/api/v1/admin/bookings?status=${encodeURIComponent(status)}`,
      { auth: true },
    );
  },

  adminUpdateBooking(
    id: string,
    body: { status?: string; payment_verified?: boolean },
  ): Promise<{ booking: AdminBooking }> {
    return request<{ booking: AdminBooking }>(`/api/v1/admin/bookings/${id}`, {
      method: "PATCH",
      body,
      auth: true,
    });
  },

  adminLeads(status = "all"): Promise<{ leads: AdminLead[] }> {
    return request<{ leads: AdminLead[] }>(
      `/api/v1/admin/leads?status=${encodeURIComponent(status)}`,
      { auth: true },
    );
  },

  adminUpdateLead(
    id: string,
    body: { status?: string; internal_notes?: string },
  ): Promise<{ lead: AdminLead }> {
    return request<{ lead: AdminLead }>(`/api/v1/admin/leads/${id}`, {
      method: "PATCH",
      body,
      auth: true,
    });
  },

  adminOfferings(): Promise<{ offerings: Offering[] }> {
    return request<{ offerings: Offering[] }>("/api/v1/admin/offerings", { auth: true });
  },

  adminUpdateOffering(id: string, body: Record<string, unknown>): Promise<{ offering: Offering }> {
    return request<{ offering: Offering }>(`/api/v1/admin/offerings/${id}`, {
      method: "PATCH",
      body,
      auth: true,
    });
  },

  adminSettings(): Promise<AdminSettings> {
    return request<AdminSettings>("/api/v1/admin/settings", { auth: true });
  },

  adminUpdateSettings(body: Record<string, unknown>): Promise<AdminSettings> {
    return request<AdminSettings>("/api/v1/admin/settings", {
      method: "PATCH",
      body,
      auth: true,
    });
  },

  adminFaq(): Promise<{ faq: AdminFaq[] }> {
    return request<{ faq: AdminFaq[] }>("/api/v1/admin/faq", { auth: true });
  },

  platformOverview(): Promise<PlatformOverview> {
    return platformUnsupported("The platform console");
  },

  adminCreateInvite(): Promise<AdminInvite> {
    return platformUnsupported("Invites");
  },

  adminListInvites(): Promise<{ invites: AdminInvite[] }> {
    return platformUnsupported("Invites");
  },

  adminClaimInvite(): Promise<{ ok: boolean; tenant_id: string | null; role: string }> {
    return platformUnsupported("Invites");
  },

  adminListMembers(): Promise<{ members: AdminMember[] }> {
    return platformUnsupported("Members");
  },

  adminCreateBooking(): Promise<BookingResponse> {
    return platformUnsupported("Front-desk booking");
  },

  daySchedule(): Promise<DaySchedule> {
    return platformUnsupported("The day schedule");
  },

  uploadServiceImage(): Promise<{ url: string }> {
    return platformUnsupported("Image upload");
  },

  subscribeBookings(): () => void {
    return () => undefined;
  },

  subscribeOfferings(): () => void {
    return () => undefined;
  },
};
