import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, RotateCw } from "lucide-react";

import { useTenant } from "../../../app/tenant-context";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { daySchedule, subscribeBookings } from "../../../lib/api";
import { cn, displayClock } from "../../../lib/utils";
import type { DayScheduleBooking, DayScheduleSlot } from "../../../types";
import { AdminPageHeader } from "../AdminLayout";
import { AddAppointmentForm } from "./AddAppointmentForm";
import { calendarText } from "./copy";
import type { CalendarCopyKey } from "./copy";
import { dateKeyInZone, dateKeyLong, shiftDateKey } from "./helpers";

type TimelineRow =
  | { kind: "booked"; startsAt: string; booking: DayScheduleBooking }
  | { kind: "free"; startsAt: string; slot: DayScheduleSlot };

/** Stable empty array so the form's reconcile effect does not re-run per render. */
const NO_BOOKINGS: DayScheduleBooking[] = [];

export function CalendarPage() {
  const { bundle, locale } = useTenant();
  const queryClient = useQueryClient();
  const timeZone = bundle.site.timezone || "Asia/Kuala_Lumpur";
  const copy = (key: CalendarCopyKey) => calendarText(key, locale);

  // Default to "today" in the tenant's timezone, not the browser's.
  const [date, setDate] = useState(() => dateKeyInZone(new Date(), timeZone));
  const today = dateKeyInZone(new Date(), timeZone);

  const dayQuery = useQuery({
    queryKey: ["calendar-day-schedule", bundle.tenant.slug, date],
    queryFn: () => daySchedule(date),
    retry: 1,
  });

  const refreshDay = () => {
    void queryClient.invalidateQueries({ queryKey: ["calendar-day-schedule"] });
    void queryClient.invalidateQueries({ queryKey: ["calendar-availability"] });
    void queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
  };

  // Live: another device books, confirms or cancels, so pull the day and the
  // slot grid again. The returned unsubscribe function runs on cleanup.
  useEffect(() => {
    const unsubscribe = subscribeBookings(() => {
      void queryClient.invalidateQueries({ queryKey: ["calendar-day-schedule"] });
      void queryClient.invalidateQueries({ queryKey: ["calendar-availability"] });
    });
    return unsubscribe;
  }, [queryClient]);

  const data = dayQuery.data;
  const booked = data?.booked ?? NO_BOOKINGS;

  const rows = useMemo<TimelineRow[]>(() => {
    if (!data) return [];
    const bookedRows: TimelineRow[] = data.booked.map((booking) => ({
      kind: "booked",
      startsAt: booking.starts_at,
      booking,
    }));
    const freeRows: TimelineRow[] = data.free.map((slot) => ({
      kind: "free",
      startsAt: slot.starts_at,
      slot,
    }));
    return [...bookedRows, ...freeRows].sort(
      (left, right) => Date.parse(left.startsAt) - Date.parse(right.startsAt),
    );
  }, [data]);

  return (
    <>
      <AdminPageHeader title={copy("title")} description={copy("subtitle")} />

      <section className="card mb-5 p-4 md:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="btn border border-line bg-surface text-ink hover:bg-surface2 !min-h-[2.5rem] !px-3"
              aria-label={copy("previousDay")}
              onClick={() => setDate(shiftDateKey(date, -1))}
            >
              <ChevronLeft size={16} aria-hidden="true" />
            </button>
            <div className="min-w-0">
              <label className="sr-only" htmlFor="calendar-page-date">
                {copy("dateLabel")}
              </label>
              <input
                id="calendar-page-date"
                type="date"
                className="field !min-h-[2.5rem] !w-auto !bg-surface2 !py-1.5 !text-ink text-sm"
                value={date}
                onChange={(event) => {
                  const next = event.target.value;
                  if (next) setDate(next);
                }}
              />
            </div>
            <button
              type="button"
              className="btn border border-line bg-surface text-ink hover:bg-surface2 !min-h-[2.5rem] !px-3"
              aria-label={copy("nextDay")}
              onClick={() => setDate(shiftDateKey(date, 1))}
            >
              <ChevronRight size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              className={cn(
                "btn border border-line bg-surface text-ink hover:bg-surface2 !min-h-[2.5rem] !px-3 !text-xs",
                date === today && "opacity-50",
              )}
              onClick={() => setDate(today)}
              disabled={date === today}
            >
              {copy("today")}
            </button>
          </div>
          <div className="sm:text-right">
            <p className="font-display text-sm font-semibold">{dateKeyLong(date, locale)}</p>
            <p className="text-xs text-muted">{copy("timezoneNote").replace("{timezone}", timeZone)}</p>
          </div>
        </div>
      </section>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:max-w-md">
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.13em] text-muted">
            {copy("bookedTotal")}
          </p>
          <p className="mt-2 font-display text-[1.7rem] font-bold leading-none tracking-tight">
            {dayQuery.isLoading ? <span className="skeleton inline-block h-7 w-8" /> : booked.length}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.13em] text-muted">
            {copy("freeTotal")}
          </p>
          <p className="mt-2 font-display text-[1.7rem] font-bold leading-none tracking-tight">
            {dayQuery.isLoading ? (
              <span className="skeleton inline-block h-7 w-8" />
            ) : (
              (data?.free.length ?? 0)
            )}
          </p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-start">
        <section className="card overflow-hidden" aria-labelledby="calendar-timeline-title">
          <div className="border-b border-line px-4 py-4 md:px-5">
            <h2
              id="calendar-timeline-title"
              className="font-display text-base font-semibold tracking-tight"
            >
              {copy("timelineTitle")}
            </h2>
          </div>

          {dayQuery.isLoading ? (
            <div className="space-y-3 p-5" aria-busy="true">
              <span className="sr-only">{copy("loading")}</span>
              <div className="skeleton h-14 w-full" />
              <div className="skeleton h-14 w-full" />
              <div className="skeleton h-14 w-full" />
              <div className="skeleton h-14 w-full" />
            </div>
          ) : dayQuery.isError ? (
            <div role="alert" className="px-5 py-14 text-center">
              <p className="text-sm text-muted">{copy("loadError")}</p>
              <button
                type="button"
                className="btn mt-4 border border-line bg-surface text-ink hover:bg-surface2 !min-h-[2.4rem] !px-3 !text-xs"
                onClick={() => void dayQuery.refetch()}
              >
                <RotateCw size={13} aria-hidden="true" />
                {copy("retry")}
              </button>
            </div>
          ) : rows.length === 0 ? (
            <p className="px-5 py-16 text-center text-sm text-muted">{copy("emptyDay")}</p>
          ) : (
            <ol className="divide-y divide-line">
              {rows.map((row) =>
                row.kind === "booked" ? (
                  <li
                    key={`booked-${row.booking.ref}`}
                    className="flex items-start gap-3 px-4 py-3.5 md:px-5"
                  >
                    <span className="w-14 shrink-0 pt-0.5 font-mono text-xs tabular-nums text-muted md:w-16">
                      {displayClock(row.booking.time, locale)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold">{row.booking.name}</p>
                        <StatusBadge status={row.booking.status} />
                      </div>
                      <p className="mt-1 truncate text-xs text-muted">{row.booking.service}</p>
                      <p className="mt-1 font-mono text-[0.7rem] text-muted">{row.booking.ref}</p>
                    </div>
                  </li>
                ) : (
                  <li
                    key={`free-${row.slot.starts_at}`}
                    className="flex items-center gap-3 px-4 py-2.5 md:px-5"
                  >
                    <span className="w-14 shrink-0 font-mono text-xs tabular-nums text-muted md:w-16">
                      {displayClock(row.slot.time, locale)}
                    </span>
                    <span className="flex-1 text-xs text-muted">{copy("freeRowLabel")}</span>
                    <span className="shrink-0 rounded-full border px-2.5 py-0.5 text-[0.7rem] font-semibold badge-neutral">
                      {copy("freeTotal")}
                    </span>
                  </li>
                ),
              )}
            </ol>
          )}
        </section>

        <AddAppointmentForm
          date={date}
          booked={booked}
          onDateChange={setDate}
          onBooked={refreshDay}
          onSlotsStale={refreshDay}
        />
      </div>
    </>
  );
}
