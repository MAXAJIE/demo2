import type {
  AdminBooking,
  AdminFaq,
  AdminBookingInput,
  AdminInvite,
  AdminLead,
  AdminMember,
  AdminOverview,
  AdminSessionResponse,
  AdminSettings,
  AvailabilityResponse,
  DaySchedule,
  BookingResponse,
  BookingStatusResponse,
  LeadResponse,
  Offering,
  PlatformOverview,
  SiteBundle,
} from "../../types";

export interface CreateBookingInput {
  offering_slug: string;
  starts_at: string;
  customer_name: string;
  customer_phone: string;
  locale: string;
  consent: boolean;
  website?: string;
}

export interface CreateLeadInput {
  customer_name: string;
  customer_phone: string;
  message: string;
  offering_slug?: string;
  locale: string;
  consent: boolean;
  website?: string;
}

export interface AdminSessionSummary {
  staff: { id: string; name: string; role: string };
  expires_at: string;
}

/**
 * Every data operation the UI needs. `rest` talks to the FastAPI backend (still
 * the default while the Supabase path is being verified); `local` serves the
 * bundled seed with localStorage so the app can run with no backend at all.
 */
export interface DataGateway {
  setActiveTenant(slug: string | null): void;
  fetchSite(tenant?: string | null): Promise<SiteBundle>;
  fetchAvailability(offering: string | null, days?: number): Promise<AvailabilityResponse>;
  createBooking(input: CreateBookingInput): Promise<BookingResponse>;
  fetchBooking(ref: string, token: string): Promise<BookingStatusResponse>;
  cancelBooking(ref: string, token: string): Promise<BookingStatusResponse>;
  uploadProof(ref: string, token: string, file: File): Promise<{ ok: boolean }>;
  createLead(input: CreateLeadInput): Promise<LeadResponse>;
  adminLogin(identifier: string, password: string): Promise<AdminSessionResponse>;
  adminLogout(): Promise<{ ok: boolean }>;
  adminSession(): Promise<AdminSessionSummary>;
  adminOverview(): Promise<AdminOverview>;
  adminBookings(status?: string): Promise<{ bookings: AdminBooking[] }>;
  adminUpdateBooking(
    id: string,
    body: { status?: string; payment_verified?: boolean },
  ): Promise<{ booking: AdminBooking }>;
  adminLeads(status?: string): Promise<{ leads: AdminLead[] }>;
  adminUpdateLead(
    id: string,
    body: { status?: string; internal_notes?: string },
  ): Promise<{ lead: AdminLead }>;
  adminOfferings(): Promise<{ offerings: Offering[] }>;
  adminUpdateOffering(id: string, body: Record<string, unknown>): Promise<{ offering: Offering }>;
  adminSettings(): Promise<AdminSettings>;
  adminUpdateSettings(body: Record<string, unknown>): Promise<AdminSettings>;
  adminFaq(): Promise<{ faq: AdminFaq[] }>;
  /** Tier 2: every tenant with counts (platform admins only). */
  platformOverview(): Promise<PlatformOverview>;
  /** Mints a one-time invite token; returned once in the response. */
  adminCreateInvite(input: {
    email: string;
    role: string;
    tenantId?: string | null;
  }): Promise<AdminInvite>;
  adminListInvites(): Promise<{ invites: AdminInvite[] }>;
  adminClaimInvite(token: string): Promise<{
    ok: boolean;
    tenant_id: string | null;
    role: string;
  }>;
  adminListMembers(tenantId: string): Promise<{ members: AdminMember[] }>;
  /** Front desk books a caller; confirmed immediately, same slot rules. */
  adminCreateBooking(input: AdminBookingInput): Promise<BookingResponse>;
  /** Booked + free slots for one day in the tenant timezone. */
  daySchedule(date: string): Promise<DaySchedule>;
  /** Upload a cropped service image; returns its public URL. */
  uploadServiceImage(file: File, kind: "cover" | "detail"): Promise<{ url: string }>;
  /** Live changes; returns an unsubscribe function. */
  subscribeBookings(onChange: () => void): () => void;
  subscribeOfferings(onChange: () => void): () => void;
}
