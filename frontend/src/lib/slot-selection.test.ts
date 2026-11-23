import { expect, it } from "vitest";

import { reconcileSlot } from "./slot-selection";
import type { SlotDay } from "../types";

const slot = { starts_at: "2026-11-20T15:00:00+08:00", time: "15:00" };
const day: SlotDay = {
  date: "2026-11-20",
  weekday: 5,
  weekday_label: { en: "Friday" },
  weekday_name: { en: "Friday" },
  slots: [slot],
};

it("does not select a slot when none was chosen", () => {
  expect(reconcileSlot([day], null)).toBeNull();
});

it("keeps a valid explicit selection", () => {
  expect(reconcileSlot([day], slot)).toEqual(slot);
});

it("clears a slot that disappeared after a conflict", () => {
  expect(reconcileSlot([{ ...day, slots: [] }], slot)).toBeNull();
});
