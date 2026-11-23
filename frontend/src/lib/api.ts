import type {
  AdminBooking,
  AdminFaq,
  AdminInvite,
  AdminMember,
  AdminLead,
  AdminOverview,
  AdminSessionResponse,
  AdminSettings,
  AvailabilityResponse,
  BookingResponse,
  BookingStatusResponse,
  LeadResponse,
  Offering,
  PlatformOverview,
  SiteBundle,
} from "../types";
import { gateway, setActiveTenant as setGatewayTenant } from "./gateway";
import type {
  AdminSessionSummary,
  CreateBookingInput,
  CreateLeadInput,
} from "./gateway/types";

export { ApiError } from "./errors";
export { getAdminToken, setAdminToken } from "./gateway/token";
export type { CreateBookingInput, CreateLeadInput };

export function setActiveTenant(slug: string | null): void {
  setGatewayTenant(slug);
}

export async function fetchSite(tenant: string | null = null): Promise<SiteBundle> {
  return (await gateway()).fetchSite(tenant);
}

export async function fetchAvailability(
  offering: string | null,
  days = 14,
): Promise<AvailabilityResponse> {
  return (await gateway()).fetchAvailability(offering, days);
}

export async function createBooking(input: CreateBookingInput): Promise<BookingResponse> {
  return (await gateway()).createBooking(input);
}

export async function fetchBooking(
  ref: string,
  token: string,
): Promise<BookingStatusResponse> {
  return (await gateway()).fetchBooking(ref, token);
}

export async function cancelBooking(
  ref: string,
  token: string,
): Promise<BookingStatusResponse> {
  return (await gateway()).cancelBooking(ref, token);
}

export async function uploadProof(
  ref: string,
  token: string,
  file: File,
): Promise<{ ok: boolean }> {
  return (await gateway()).uploadProof(ref, token, file);
}

export async function createLead(input: CreateLeadInput): Promise<LeadResponse> {
  return (await gateway()).createLead(input);
}

export async function adminLogin(
  identifier: string,
  password: string,
): Promise<AdminSessionResponse> {
  return (await gateway()).adminLogin(identifier, password);
}

export async function adminLogout(): Promise<{ ok: boolean }> {
  return (await gateway()).adminLogout();
}

export async function adminSession(): Promise<AdminSessionSummary> {
  return (await gateway()).adminSession();
}

export async function adminOverview(): Promise<AdminOverview> {
  return (await gateway()).adminOverview();
}

export async function adminBookings(status = "all"): Promise<{ bookings: AdminBooking[] }> {
  return (await gateway()).adminBookings(status);
}

export async function adminUpdateBooking(
  id: string,
  body: { status?: string; payment_verified?: boolean },
): Promise<{ booking: AdminBooking }> {
  return (await gateway()).adminUpdateBooking(id, body);
}

export async function adminLeads(status = "all"): Promise<{ leads: AdminLead[] }> {
  return (await gateway()).adminLeads(status);
}

export async function adminUpdateLead(
  id: string,
  body: { status?: string; internal_notes?: string },
): Promise<{ lead: AdminLead }> {
  return (await gateway()).adminUpdateLead(id, body);
}

export async function adminOfferings(): Promise<{ offerings: Offering[] }> {
  return (await gateway()).adminOfferings();
}

export async function adminUpdateOffering(
  id: string,
  body: Record<string, unknown>,
): Promise<{ offering: Offering }> {
  return (await gateway()).adminUpdateOffering(id, body);
}

export async function adminSettings(): Promise<AdminSettings> {
  return (await gateway()).adminSettings();
}

export async function adminUpdateSettings(body: Record<string, unknown>): Promise<AdminSettings> {
  return (await gateway()).adminUpdateSettings(body);
}

export async function adminFaq(): Promise<{ faq: AdminFaq[] }> {
  return (await gateway()).adminFaq();
}

export async function platformOverview(): Promise<PlatformOverview> {
  return (await gateway()).platformOverview();
}

export async function adminCreateInvite(input: {
  email: string;
  role: string;
  tenantId?: string | null;
}) {
  return (await gateway()).adminCreateInvite(input);
}

export async function adminListInvites(): Promise<{ invites: AdminInvite[] }> {
  return (await gateway()).adminListInvites();
}

export async function adminClaimInvite(token: string): Promise<{
  ok: boolean;
  tenant_id: string | null;
  role: string;
}> {
  return (await gateway()).adminClaimInvite(token);
}

export async function adminListMembers(tenantId: string): Promise<{ members: AdminMember[] }> {
  return (await gateway()).adminListMembers(tenantId);
}
