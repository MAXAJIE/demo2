import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "../errors";
import { createLocalGateway, resetLocalState } from "./local";

const NOW = new Date("2026-11-23T02:00:00.000Z"); // Monday 10:00 in Kuala Lumpur

function firstOpenSlot(days: { slots: { starts_at: string; time: string }[] }[]) {
  for (const day of days) {
    if (day.slots.length > 0) return day.slots[0];
  }
  throw new Error("no open slot in the bundle");
}

beforeEach(() => {
  resetLocalState();
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("local gateway availability", () => {
  it("returns a two-week window with three locales of weekday labels", async () => {
    const gateway = createLocalGateway();
    const availability = await gateway.fetchAvailability("scaling-polishing-checkup", 14);
    expect(availability.days).toHaveLength(14);
    expect(availability.timezone).toBe("Asia/Kuala_Lumpur");
    const monday = availability.days.find((day) => day.weekday === 1);
    expect(monday?.weekday_name.en).toBe("Monday");
    expect(monday?.weekday_name.zh).toBe("周一");
    expect(monday?.weekday_name.ms).toBe("Isnin");
  });

  it("starts at the opening time and never ends after closing", async () => {
    const gateway = createLocalGateway();
    const availability = await gateway.fetchAvailability("root-canal-crown-restoration", 21);
    for (const day of availability.days.slice(1)) {
      if (day.slots.length === 0) continue;
      const last = day.slots[day.slots.length - 1].time;
      expect(last <= "22:00").toBe(true);
    }
    const monday = availability.days.slice(1).find((day) => day.weekday === 1 && day.slots.length);
    expect(monday?.slots[0].time).toBe("12:00");
  });

  it("rejects an unknown offering", async () => {
    const gateway = createLocalGateway();
    await expect(gateway.fetchAvailability("nope", 14)).rejects.toMatchObject({
      code: "offering_not_found",
    });
  });
});

describe("local gateway bookings", () => {
  it("books a slot, masks the phone and returns a token", async () => {
    const gateway = createLocalGateway();
    const availability = await gateway.fetchAvailability("scaling-polishing-checkup", 14);
    const slot = firstOpenSlot(availability.days);

    const response = await gateway.createBooking({
      offering_slug: "scaling-polishing-checkup",
      starts_at: slot.starts_at,
      customer_name: "  Aisyah   Test ",
      customer_phone: "0123456789",
      locale: "en",
      consent: true,
    });

    expect(response.booking.ref).toMatch(/^[A-Z]{3}-\d{6}-[0-9A-F]{4}$/);
    expect(response.booking.customer_contact_masked).toBe("6012***789");
    expect(response.booking.customer_name).toBe("Aisyah Test");
    expect(response.booking.cancel_token).toHaveLength(32);
    expect(response.whatsapp_url.startsWith("https://wa.me/60177410100?text=")).toBe(true);
  });

  it("does not let two patients take the same slot", async () => {
    const gateway = createLocalGateway();
    const availability = await gateway.fetchAvailability("scaling-polishing-checkup", 14);
    const slot = firstOpenSlot(availability.days);
    const input = {
      offering_slug: "scaling-polishing-checkup",
      starts_at: slot.starts_at,
      customer_name: "First Patient",
      customer_phone: "0123456789",
      locale: "en",
      consent: true,
    };
    await gateway.createBooking(input);
    await expect(
      gateway.createBooking({ ...input, customer_name: "Second Patient" }),
    ).rejects.toMatchObject({ code: "slot_unavailable" });
  });

  it("requires consent and a valid phone", async () => {
    const gateway = createLocalGateway();
    const availability = await gateway.fetchAvailability("scaling-polishing-checkup", 14);
    const slot = firstOpenSlot(availability.days);
    await expect(
      gateway.createBooking({
        offering_slug: "scaling-polishing-checkup",
        starts_at: slot.starts_at,
        customer_name: "No Consent",
        customer_phone: "0123456789",
        locale: "en",
        consent: false,
      }),
    ).rejects.toMatchObject({ code: "consent_required" });
    await expect(
      gateway.createBooking({
        offering_slug: "scaling-polishing-checkup",
        starts_at: slot.starts_at,
        customer_name: "Bad Phone",
        customer_phone: "123",
        locale: "en",
        consent: true,
      }),
    ).rejects.toMatchObject({ code: "invalid_phone" });
  });

  it("reads back and cancels with the token, refusing a wrong one", async () => {
    const gateway = createLocalGateway();
    const availability = await gateway.fetchAvailability("scaling-polishing-checkup", 14);
    const slot = firstOpenSlot(availability.days);
    const created = await gateway.createBooking({
      offering_slug: "scaling-polishing-checkup",
      starts_at: slot.starts_at,
      customer_name: "Token Test",
      customer_phone: "0123456789",
      locale: "en",
      consent: true,
    });
    const token = created.booking.cancel_token ?? "";
    const status = await gateway.fetchBooking(created.booking.ref, token);
    expect(status.booking.ref).toBe(created.booking.ref);
    await expect(gateway.fetchBooking(created.booking.ref, "wrong")).rejects.toBeInstanceOf(
      ApiError,
    );
    const cancelled = await gateway.cancelBooking(created.booking.ref, token);
    expect(cancelled.booking.status).toBe("cancelled");
  });

  it("releases a pending hold that was never sent on WhatsApp after 10 minutes", async () => {
    const gateway = createLocalGateway();
    const availability = await gateway.fetchAvailability("scaling-polishing-checkup", 14);
    const slot = firstOpenSlot(availability.days);
    await gateway.createBooking({
      offering_slug: "scaling-polishing-checkup",
      starts_at: slot.starts_at,
      customer_name: "Hold Test",
      customer_phone: "0123456789",
      locale: "en",
      consent: true,
    });

    vi.setSystemTime(new Date(NOW.getTime() + 11 * 60_000));
    const later = await gateway.fetchAvailability("scaling-polishing-checkup", 14);
    const times = later.days.flatMap((day) => day.slots.map((s) => s.starts_at));
    expect(times).toContain(slot.starts_at);
  });
});

describe("local gateway leads and admin", () => {
  it("creates a lead with a masked contact", async () => {
    const gateway = createLocalGateway();
    const response = await gateway.createLead({
      customer_name: "Mei Ling",
      customer_phone: "0111234567",
      message: "Can I book a scaling next week?",
      locale: "en",
      consent: true,
    });
    expect(response.lead.ref).toMatch(/^LED-\d{6}-[0-9A-F]{4}$/);
    expect(response.lead.status).toBe("new");
  });

  it("signs in with the demo account only", async () => {
    const gateway = createLocalGateway();
    await expect(gateway.adminLogin("owner@demo.local", "wrong")).rejects.toMatchObject({
      code: "invalid_credentials",
    });
    const session = await gateway.adminLogin("owner@demo.local", "demo1234");
    expect(session.staff.role).toBe("owner");
    await expect(gateway.adminOverview()).resolves.toBeTruthy();
  });

  it("reports counts and lists bookings for the dashboard", async () => {
    const gateway = createLocalGateway();
    await gateway.adminLogin("owner@demo.local", "demo1234");
    const availability = await gateway.fetchAvailability("scaling-polishing-checkup", 14);
    const slot = firstOpenSlot(availability.days);
    await gateway.createBooking({
      offering_slug: "scaling-polishing-checkup",
      starts_at: slot.starts_at,
      customer_name: "Dashboard Test",
      customer_phone: "0123456789",
      locale: "en",
      consent: true,
    });
    const overview = await gateway.adminOverview();
    expect(overview.counts.pending_bookings).toBe(1);
    expect(overview.upcoming).toHaveLength(1);
    expect(overview.upcoming[0].ref).toMatch(/^[A-Z]{3}-/);
    const list = await gateway.adminBookings("pending");
    expect(list.bookings).toHaveLength(1);
    const updated = await gateway.adminUpdateBooking(list.bookings[0].id, {
      status: "confirmed",
    });
    expect(updated.booking.status).toBe("confirmed");
  });

  it("exposes settings with all three locales and one theme preset", async () => {
    const gateway = createLocalGateway();
    await gateway.adminLogin("owner@demo.local", "demo1234");
    const settings = await gateway.adminSettings();
    expect(settings.locales).toEqual(["en", "ms", "zh"]);
    expect(settings.theme_presets).toHaveLength(1);
    expect(settings.brand_name.en).toContain("Setapak");
  });

  it("refuses admin data without a session", async () => {
    const gateway = createLocalGateway();
    await expect(gateway.adminOverview()).rejects.toMatchObject({ status: 401 });
  });
});
