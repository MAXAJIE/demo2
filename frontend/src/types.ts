export type Locale = "en" | "ms" | "zh";

export type I18nText = Record<string, string>;

export interface ThemeTokens {
  bg: string;
  surface: string;
  surface2: string;
  text: string;
  muted: string;
  primary: string;
  onPrimary: string;
  accent: string;
  border: string;
  ring: string;
}

export interface SiteTheme {
  preset: string;
  typography: string;
  layout: string;
  tokens: ThemeTokens;
}

export interface Offering {
  id: string;
  slug: string;
  kind: string;
  title: I18nText;
  summary: I18nText;
  body: I18nText;
  price_cents: number | null;
  deposit_cents: number | null;
  currency: string;
  price_note: I18nText;
  attributes: {
    duration_min?: number;
    format?: string;
    preparation_notes?: I18nText;
  };
  duration_min: number | null;
  /** Cropped cover (4:5) and detail (16:9) URLs from Supabase Storage */
  images?: { cover?: string; detail?: string };
  status: string;
  sort: number;
}

export interface PublicPayment {
  bank_name: string;
  account_number: string;
  account_holder: string;
  qr_image_url: string;
  configured: boolean;
}

export interface SiteContact {
  whatsapp: string;
  phone: string;
  email: string;
  address: I18nText;
  map_url: string;
  opening_hours: I18nText;
  closes_at?: string;
  last_appointment?: string;
}

export interface SiteLabels {
  offerings_plural?: I18nText;
  offerings_singular?: I18nText;
  book_cta?: I18nText;
  staff_label?: I18nText;
  deposit_label?: I18nText;
}

export interface SiteSettings {
  brand_name: I18nText;
  archetype: string;
  default_locale: Locale;
  locales: Locale[];
  timezone: string;
  theme: SiteTheme;
  features: Record<string, boolean>;
  labels: SiteLabels;
  contact: SiteContact;
  booking_mode: string;
  checkout_mode: string;
  payment: PublicPayment;
  consent_text: I18nText;
}

export interface StatItem {
  value: I18nText | string;
  label: I18nText;
}

export interface HeroContent {
  eyebrow: I18nText;
  headline: I18nText;
  highlight?: I18nText;
  spec_line: I18nText;
  primary_note: I18nText;
  stats: StatItem[];
}

export interface PillarItem {
  index: string;
  title: I18nText;
  body: I18nText;
}

export interface PillarsContent {
  heading: I18nText;
  items: PillarItem[];
}

export interface TextContent {
  heading: I18nText;
  body: I18nText;
}

export interface FactItem {
  label: I18nText;
  value: I18nText;
}

export interface ReviewSummary {
  label: I18nText;
  body: I18nText;
}

export interface ReviewItem {
  author: I18nText;
  text: I18nText;
  rating?: number;
  summary?: ReviewSummary;
}

export interface ReviewContent extends TextContent {
  items?: ReviewItem[];
}

export interface NightContent extends TextContent {
  note: I18nText;
  facts?: FactItem[];
}

export interface AboutContent {
  heading: I18nText;
  motto?: I18nText;
  paragraphs: I18nText[];
}

export interface LegalSection {
  heading: I18nText;
  paragraphs: I18nText[];
}

export interface LegalContent {
  title: I18nText;
  updated: string;
  sections: LegalSection[];
}

export interface DoctorProfile {
  id: string;
  name: I18nText;
  role: I18nText;
  bio: I18nText;
  photo?: string;
}

export interface DoctorsContent {
  eyebrow: I18nText;
  heading: I18nText;
  body: I18nText;
  items: DoctorProfile[];
}

export interface SiteContent {
  home?: {
    seo?: { description?: I18nText };
    hero?: HeroContent;
    pillars?: PillarsContent;
    night?: NightContent;
    reviews?: ReviewContent;
    location?: TextContent;
    cta?: TextContent;
  };
  about?: { intro?: AboutContent };
  doctors?: { intro?: DoctorsContent };
  services?: { intro?: TextContent };
  faq?: { intro?: TextContent };
  booking?: { intro?: TextContent };
  contact?: { intro?: TextContent };
  legal?: {
    privacy?: LegalContent;
    terms?: LegalContent;
  };
}

export interface ScheduleDay {
  weekday: number;
  label: I18nText;
  closed: boolean;
  start?: string;
  end?: string;
  hours?: string;
}

export interface NextSlot {
  date: string;
  starts_at: string;
  time: string;
}

export interface FaqItem {
  id: string;
  question: I18nText;
  answer: I18nText;
  offering_id: string | null;
}

export interface SiteBundle {
  tenant: { id: string; slug: string; status: string };
  site: SiteSettings;
  content: SiteContent;
  offerings: Offering[];
  faq: FaqItem[];
  schedule: ScheduleDay[];
  next_slots: NextSlot[];
  server_time: string;
}

export interface Slot {
  starts_at: string;
  time: string;
}

export interface SlotDay {
  date: string;
  weekday: number;
  weekday_label: I18nText;
  weekday_name: I18nText;
  slots: Slot[];
}

export interface AvailabilityResponse {
  timezone: string;
  days: SlotDay[];
  server_time: string;
}

export type BookingStatus = "pending" | "confirmed" | "declined" | "cancelled";

export interface Booking {
  ref: string;
  status: BookingStatus;
  starts_at: string;
  ends_at: string;
  customer_name: string;
  customer_contact_masked: string;
  deposit_cents: number | null;
  amount_cents: number | null;
  payment_verified: boolean;
  locale: string;
  offering: Offering | null;
  cancel_token?: string;
}

export interface BookingResponse {
  booking: Booking;
  whatsapp_url: string;
  forwarded?: string;
  forward_error?: string | null;
}

export interface BookingStatusResponse {
  booking: Booking;
  whatsapp_url: string;
}

export interface LeadResponse {
  lead: { ref: string; status: string };
  whatsapp_url: string;
  forwarded?: string;
}

export interface AdminStaff {
  id: string;
  name: string;
  role: string;
}

export interface AdminSessionResponse {
  token: string;
  expires_at: string;
  staff: AdminStaff & { tenant_slug?: string };
}

export interface AdminBooking extends Booking {
  id: string;
  created_at: string;
}

export interface AdminLead {
  id: string;
  ref: string;
  name: string;
  contact_masked: string;
  message: string;
  status: "new" | "contacted" | "closed";
  locale: string;
  source: string;
  internal_notes: string;
  created_at: string;
}

export interface AdminOverview {
  tenant: { slug: string; brand_name: I18nText };
  counts: {
    pending_bookings: number;
    today_bookings: number;
    new_leads: number;
    published_offerings: number;
  };
  upcoming: AdminBooking[];
  latest_leads: AdminLead[];
}

export interface AdminSettings {
  brand_name: I18nText;
  contact: SiteContact;
  payment_config: {
    bank_name: string;
    account_number: string;
    account_holder: string;
    qr_image_url: string;
    merchant_webhook_url: string;
  };
  labels: SiteLabels;
  theme: SiteTheme;
  theme_preset: string;
  theme_presets: { key: string; label: string; tokens: ThemeTokens }[];
  default_locale: Locale;
  locales: Locale[];
  checkout_mode: string;
  booking_mode: string;
  forwarding_configured: boolean;
}

export interface PlatformTenant {
  id: string;
  slug: string;
  status: string;
  plan: string;
  brand_name: I18nText | null;
  pending_bookings: number;
  new_leads: number;
  published_offerings: number;
}

export interface PlatformOverview {
  tenants: PlatformTenant[];
}

export interface DayScheduleSlot {
  time: string;
  starts_at: string;
}

export interface DayScheduleBooking {
  time: string;
  starts_at: string;
  ends_at: string;
  ref: string;
  name: string;
  status: string;
  service: string;
}

export interface DaySchedule {
  date: string;
  timezone: string;
  booked: DayScheduleBooking[];
  free: DayScheduleSlot[];
}

export interface AdminBookingInput {
  offering_slug: string;
  starts_at: string;
  customer_name: string;
  customer_phone: string;
  locale: string;
  tenantId?: string | null;
}

export interface AdminInvite {
  id: string;
  email: string;
  role: string;
  tenant_id: string | null;
  /** Present once, on creation only. */
  token?: string;
  expires_at: string;
  used_at?: string | null;
  created_at?: string;
}

export interface AdminMember {
  user_id: string;
  role: string;
  active: boolean;
}

export interface AdminFaq {
  id: string;
  question: I18nText;
  answer: I18nText;
  published: boolean;
  sort: number;
}
