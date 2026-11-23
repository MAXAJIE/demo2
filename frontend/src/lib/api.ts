import type {
  AdminBooking,
  AdminFaq,
  AdminLead,
  AdminOverview,
  AdminSessionResponse,
  AdminSettings,
  AvailabilityResponse,
  BookingResponse,
  BookingStatusResponse,
  LeadResponse,
  Offering,
  SiteBundle,
} from "../types";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";
const TOKEN_KEY = "coresite.admin.token";

let activeTenant: string | null = null;

export function setActiveTenant(slug: string | null): void {
  activeTenant = slug;
}

export function getAdminToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAdminToken(token: string | null): void {
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // sessionStorage can be unavailable in private modes; login still works per tab.
  }
}

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

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

export function fetchSite(tenant: string | null = null): Promise<SiteBundle> {
  return request<SiteBundle>("/api/v1/site", { tenant });
}

export function fetchAvailability(
  offering: string | null,
  days = 14,
): Promise<AvailabilityResponse> {
  const params = new URLSearchParams({ days: String(days) });
  if (offering) params.set("offering", offering);
  return request<AvailabilityResponse>(`/api/v1/availability?${params.toString()}`);
}

export function createBooking(input: {
  offering_slug: string;
  starts_at: string;
  customer_name: string;
  customer_phone: string;
  locale: string;
  consent: boolean;
  website?: string;
}): Promise<BookingResponse> {
  return request<BookingResponse>("/api/v1/bookings", { method: "POST", body: input });
}

export function fetchBooking(ref: string, token: string): Promise<BookingStatusResponse> {
  return request<BookingStatusResponse>(`/api/v1/bookings/${encodeURIComponent(ref)}`, {
    headers: { "X-Booking-Token": token },
  });
}

export function cancelBooking(ref: string, token: string): Promise<BookingStatusResponse> {
  return request<BookingStatusResponse>(`/api/v1/bookings/${encodeURIComponent(ref)}/cancel`, {
    method: "POST",
    body: { token },
  });
}

export function uploadProof(ref: string, token: string, file: File): Promise<{ ok: boolean }> {
  const form = new FormData();
  form.set("token", token);
  form.set("file", file);
  return request<{ ok: boolean }>(`/api/v1/bookings/${encodeURIComponent(ref)}/proof`, {
    method: "POST",
    form,
  });
}

export function createLead(input: {
  customer_name: string;
  customer_phone: string;
  message: string;
  offering_slug?: string;
  locale: string;
  consent: boolean;
  website?: string;
}): Promise<LeadResponse> {
  return request<LeadResponse>("/api/v1/leads", { method: "POST", body: input });
}

export function adminLogin(identifier: string, password: string): Promise<AdminSessionResponse> {
  return request<AdminSessionResponse>("/api/v1/admin/login", {
    method: "POST",
    body: { identifier, password },
  });
}

export function adminLogout(): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>("/api/v1/admin/logout", {
    method: "POST",
    auth: true,
  });
}

export function adminSession(): Promise<{
  staff: { id: string; name: string; role: string };
  expires_at: string;
}> {
  return request("/api/v1/admin/session", { auth: true });
}

export function adminOverview(): Promise<AdminOverview> {
  return request<AdminOverview>("/api/v1/admin/overview", { auth: true });
}

export function adminBookings(status = "all"): Promise<{ bookings: AdminBooking[] }> {
  return request<{ bookings: AdminBooking[] }>(
    `/api/v1/admin/bookings?status=${encodeURIComponent(status)}`,
    { auth: true },
  );
}

export function adminUpdateBooking(
  id: string,
  body: { status?: string; payment_verified?: boolean },
): Promise<{ booking: AdminBooking }> {
  return request<{ booking: AdminBooking }>(`/api/v1/admin/bookings/${id}`, {
    method: "PATCH",
    body,
    auth: true,
  });
}

export function adminLeads(status = "all"): Promise<{ leads: AdminLead[] }> {
  return request<{ leads: AdminLead[] }>(
    `/api/v1/admin/leads?status=${encodeURIComponent(status)}`,
    { auth: true },
  );
}

export function adminUpdateLead(
  id: string,
  body: { status?: string; internal_notes?: string },
): Promise<{ lead: AdminLead }> {
  return request<{ lead: AdminLead }>(`/api/v1/admin/leads/${id}`, {
    method: "PATCH",
    body,
    auth: true,
  });
}

export function adminOfferings(): Promise<{ offerings: Offering[] }> {
  return request<{ offerings: Offering[] }>("/api/v1/admin/offerings", { auth: true });
}

export function adminUpdateOffering(
  id: string,
  body: Record<string, unknown>,
): Promise<{ offering: Offering }> {
  return request<{ offering: Offering }>(`/api/v1/admin/offerings/${id}`, {
    method: "PATCH",
    body,
    auth: true,
  });
}

export function adminSettings(): Promise<AdminSettings> {
  return request<AdminSettings>("/api/v1/admin/settings", { auth: true });
}

export function adminUpdateSettings(body: Record<string, unknown>): Promise<AdminSettings> {
  return request<AdminSettings>("/api/v1/admin/settings", {
    method: "PATCH",
    body,
    auth: true,
  });
}

export function adminFaq(): Promise<{ faq: AdminFaq[] }> {
  return request<{ faq: AdminFaq[] }>("/api/v1/admin/faq", { auth: true });
}
