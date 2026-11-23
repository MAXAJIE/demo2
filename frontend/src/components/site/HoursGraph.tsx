import { motion, useReducedMotion } from "motion/react";
import { useTranslation } from "react-i18next";

import { useTenant } from "../../app/tenant-context";
import { displayClock, zonedNow } from "../../lib/utils";
import type { ScheduleDay } from "../../types";

const EASE = [0.16, 1, 0.3, 1] as const;
const WINDOW_START = 8 * 60;
const WINDOW_END = 23 * 60;
const WINDOW_RANGE = WINDOW_END - WINDOW_START;
const TICKS = [8, 12, 16, 20, 23];

function toMinutes(value: string | undefined): number {
  if (!value) return 0;
  const [hours, minutes] = value.split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

export function HoursGraph({
  schedule,
  today,
}: {
  schedule: ScheduleDay[];
  today: number;
}) {
  const { bundle, t, locale } = useTenant();
  const { t: translate } = useTranslation();
  const reduceMotion = useReducedMotion();
  const timezone = bundle.site.timezone;
  const now = zonedNow(timezone);
  const nowMinutes = now.minutes;

  const todaySchedule = schedule.find((day) => day.weekday === today);
  const todayStart = toMinutes(todaySchedule?.start);
  const closingMinutes = toMinutes(bundle.site.contact.closes_at || "23:00");
  const todayEnd = closingMinutes;
  const openNow = Boolean(
    todaySchedule && !todaySchedule.closed && nowMinutes >= todayStart && nowMinutes < todayEnd,
  );
  const closesAt = displayClock(bundle.site.contact.closes_at || "23:00", locale);
  const nextOpen = (() => {
    if (todaySchedule && !todaySchedule.closed && nowMinutes < todayStart) {
      return displayClock(todaySchedule.start ?? "00:00", locale);
    }
    for (let offset = 1; offset <= 7; offset += 1) {
      const day = schedule.find((item) => item.weekday === (today + offset) % 7);
      if (day && !day.closed && day.start) return displayClock(day.start, locale);
    }
    return "";
  })();

  const statusLabel = openNow
    ? `${translate("status.openNow")} · ${translate("status.closesAt", { time: closesAt })}`
    : `${translate("status.closedNow")}${nextOpen ? ` · ${translate("status.opensAt", { time: nextOpen })}` : ""}`;
  const nowVisible = Boolean(
    todaySchedule && !todaySchedule.closed && nowMinutes >= todayStart && nowMinutes <= todayEnd,
  );
  const nowPercent = Math.min(
    100,
    Math.max(0, ((nowMinutes - WINDOW_START) / WINDOW_RANGE) * 100),
  );

  return (
    <div className="relative">
      <div className="flex items-center justify-between gap-4 border-b border-line pb-3.5">
        <p className="text-[0.95rem] font-semibold">{translate("hero.hoursLabel")}</p>
        <span className="flex items-center gap-1.5 text-xs text-muted">
          <span
            aria-hidden="true"
            className={`inline-block h-1.5 w-1.5 rounded-full ${
              openNow ? "bg-[var(--hours-now)]" : "bg-muted/60"
            }`}
          />
          {statusLabel}
        </span>
      </div>

      <div className="mt-1 divide-y divide-line/60">
        {schedule.map((day, index) => {
          const start = toMinutes(day.start);
          const end = closingMinutes;
          const left = ((start - WINDOW_START) / WINDOW_RANGE) * 100;
          const width = ((end - start) / WINDOW_RANGE) * 100;
          const isToday = day.weekday === today;
          const hoursLabel = day.closed
            ? t({ en: "Closed", zh: "休息", ms: "Tutup" })
            : `${displayClock(day.start ?? "00:00", locale)} – ${displayClock(bundle.site.contact.closes_at || "23:00", locale)}`;

          return (
            <motion.div
              key={day.weekday}
              initial={reduceMotion ? false : { opacity: 0, y: 10, filter: "blur(5px)" }}
              whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{
                duration: reduceMotion ? 0 : 0.6,
                delay: reduceMotion ? 0 : index * 0.045,
                ease: EASE,
              }}
              className={isToday ? "relative -mx-2 rounded-[9px] bg-[var(--hours-today-surface)] px-2" : "relative"}
            >
              <div className="grid grid-cols-[4.2rem_1fr] items-center gap-3 py-2.5 md:grid-cols-[5.5rem_1fr_8rem]">
                <span className="flex items-center gap-2 text-xs font-medium text-ink">
                  {t(day.label)}
                  {isToday ? (
                    <span className="text-xs font-normal text-muted">
                      {translate("home.todayLabel")}
                    </span>
                  ) : null}
                </span>

                <div className="relative h-2.5">
                  {!day.closed ? (
                    <motion.span
                      initial={reduceMotion ? false : { scaleX: 0 }}
                      whileInView={{ scaleX: 1 }}
                      viewport={{ once: true, amount: 0.4 }}
                      transition={{
                        duration: reduceMotion ? 0 : 0.75,
                        delay: reduceMotion ? 0 : 0.1 + index * 0.045,
                        ease: EASE,
                      }}
                      className={`absolute inset-y-0 origin-left rounded-full ${
                        isToday ? "bg-[var(--hours-active)]" : "bg-[var(--hours-idle)]"
                      }`}
                      style={{ left: `${left}%`, width: `${width}%` }}
                      aria-hidden="true"
                    />
                  ) : null}

                  {isToday && nowVisible ? (
                    <>
                      <span
                        aria-hidden="true"
                        className="absolute -top-[1.1rem] bottom-[-0.45rem] z-10 w-px bg-[var(--hours-now)]"
                        style={{ left: `${nowPercent}%` }}
                      />
                      <span
                        aria-hidden="true"
                        className="absolute top-1/2 z-10 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--hours-now)] ring-2 ring-white"
                        style={{ left: `${nowPercent}%` }}
                      />
                    </>
                  ) : null}
                </div>

                <span className="hidden text-right text-xs tabular-nums text-muted md:block">
                  {hoursLabel}
                </span>
              </div>
              <p className="ml-[4.95rem] pb-1.5 text-xs tabular-nums text-muted md:hidden">
                {hoursLabel}
              </p>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-3 grid grid-cols-[4.2rem_1fr] gap-3 md:grid-cols-[5.5rem_1fr_8rem]">
        <span />
        <div className="relative flex justify-between text-xs font-medium text-muted">
          {TICKS.map((tick) => (
            <span key={tick}>{displayClock(`${String(tick).padStart(2, "0")}:00`, locale)}</span>
          ))}
        </div>
        <span className="hidden md:block" />
      </div>

    </div>
  );
}
