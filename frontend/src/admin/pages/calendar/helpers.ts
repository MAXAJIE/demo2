import { formatDateLong } from "../../../lib/utils";
import type { DayScheduleBooking, Locale, Slot, SlotDay } from "../../../types";

/**
 * Small, pure calendar helpers.
 *
 * A date is always a `YYYY-MM-DD` key in the tenant's timezone, never a browser
 * local date: the front desk may be on a laptop set to another country while
 * the clinic books Malaysia time.
 */

const FALLBACK_ZONE = "Asia/Kuala_Lumpur";

/** Today's date key in the tenant timezone, not the browser's timezone. */
export function dateKeyInZone(instant: Date, timeZone: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timeZone || FALLBACK_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(instant);
    const lookup = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
    const year = lookup("year");
    const month = lookup("month");
    const day = lookup("day");
    if (!year || !month || !day) return instant.toISOString().slice(0, 10);
    return `${year}-${month}-${day}`;
  } catch {
    return instant.toISOString().slice(0, 10);
  }
}

/** Step one calendar day forward or back without touching the clock. */
export function shiftDateKey(dateKey: string, deltaDays: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  if (!year || !month || !day) return dateKey;
  return new Date(Date.UTC(year, month - 1, day + deltaDays)).toISOString().slice(0, 10);
}

/** Long localized label for a date key, stable for every tenant timezone. */
export function dateKeyLong(dateKey: string, locale: Locale): string {
  // Noon UTC keeps the calendar day stable across tenant offsets.
  return formatDateLong(`${dateKey}T12:00:00Z`, locale, "UTC");
}

/** The offering's slots for one date key, from the 30-day availability grid. */
export function slotsForDate(days: SlotDay[], dateKey: string): Slot[] {
  return days.find((day) => day.date === dateKey)?.slots ?? [];
}

/**
 * A slot may not be selected when an active booking already covers its start.
 * The day timeline is the source of truth here: availability can lag a second
 * behind a booking made on another device.
 */
export function isSlotBooked(startsAt: string, booked: DayScheduleBooking[]): boolean {
  const start = Date.parse(startsAt);
  if (Number.isNaN(start)) return true;
  return booked.some((booking) => {
    const busyStart = Date.parse(booking.starts_at);
    const busyEnd = Date.parse(booking.ends_at);
    if (Number.isNaN(busyStart) || Number.isNaN(busyEnd)) return true;
    return start >= busyStart && start < busyEnd;
  });
}

/** ApiError carries a `code`; anything else (network, thrown string) has none. */
export function errorCode(error: unknown): string {
  if (error && typeof error === "object" && "code" in error) {
    const value = (error as { code?: unknown }).code;
    if (typeof value === "string") return value;
  }
  return "";
}
