import type { Slot, SlotDay } from "../types";

export function reconcileSlot(days: SlotDay[], slot: Slot | null): Slot | null {
  if (!slot) return null;
  const match = days
    .flatMap((day) => day.slots)
    .find((item) => item.starts_at === slot.starts_at);
  return match ?? null;
}
