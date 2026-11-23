import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import type { I18nText, Locale } from "../types";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function text(value: I18nText | undefined, locale: Locale, fallback = ""): string {
  if (!value) return fallback;
  return value[locale] || value.en || value.zh || Object.values(value)[0] || fallback;
}

export function safeHttpUrl(value: string | null | undefined): string {
  if (!value) return "#";
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? value : "#";
  } catch {
    return "#";
  }
}

export function money(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "";
  const amount = cents / 100;
  const hasCents = Math.round(amount * 100) % 100 !== 0;
  return `RM ${amount.toLocaleString("en-MY", {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

const localeTag = (locale: Locale) =>
  locale === "zh" ? "zh-CN" : locale === "ms" ? "ms-MY" : "en-MY";

export function formatTime(
  iso: string,
  locale: Locale,
  timeZone: string,
  withSuffix = true,
): string {
  const formatted = new Intl.DateTimeFormat(localeTag(locale), {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: locale !== "zh" && withSuffix,
  }).format(new Date(iso));
  return locale === "zh" ? formatted : formatted.replace(/(am|pm)/gi, (m) => m.toUpperCase());
}

export function formatDateLong(iso: string, locale: Locale, timeZone: string): string {
  const formatted = new Intl.DateTimeFormat(localeTag(locale), {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
  return locale === "zh" ? formatted.replace(/(日)(星期)/, "$1 $2") : formatted;
}

export function formatDateMedium(iso: string, locale: Locale, timeZone: string): string {
  const formatted = new Intl.DateTimeFormat(localeTag(locale), {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(iso));
  return locale === "zh" ? formatted.replace(/(日)(周)/, "$1 $2") : formatted;
}

export function formatDateTime(iso: string, locale: Locale, timeZone: string): string {
  return `${formatDateMedium(iso, locale, timeZone)} · ${formatTime(iso, locale, timeZone)}`;
}

export function dateParts(dateKey: string): { day: string; month: string; weekday: string } {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  return {
    day: new Intl.DateTimeFormat("en-MY", { timeZone: "UTC", day: "numeric" }).format(date),
    month: new Intl.DateTimeFormat("en-MY", { timeZone: "UTC", month: "short" }).format(date),
    weekday: new Intl.DateTimeFormat("en-MY", { timeZone: "UTC", weekday: "short" }).format(date),
  };
}

export function datePartsLocalized(
  dateKey: string,
  locale: Locale,
): { day: string; month: string; weekday: string } {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  return {
    day: new Intl.DateTimeFormat(localeTag(locale), { timeZone: "UTC", day: "numeric" }).format(
      date,
    ),
    month: new Intl.DateTimeFormat(localeTag(locale), {
      timeZone: "UTC",
      month: "short",
    }).format(date),
    weekday: new Intl.DateTimeFormat(localeTag(locale), {
      timeZone: "UTC",
      weekday: "short",
    }).format(date),
  };
}

export function todayLabel(isoDate: string): string {
  return isoDate;
}

export function displayClock(hhmm: string, locale: Locale): string {
  if (!hhmm || !hhmm.includes(":")) return hhmm;
  const [h, m] = hhmm.split(":").map(Number);
  if (locale === "zh") return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  const hour = h % 12 || 12;
  const suffix = locale === "ms" ? (h < 12 ? "PG" : "PTG") : h < 12 ? "AM" : "PM";
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function zonedNow(timeZone: string): { weekday: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(new Date());
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const hours = Number(lookup.hour === "24" ? "0" : lookup.hour);
  return {
    weekday: weekdayMap[lookup.weekday ?? "Mon"] ?? 1,
    minutes: hours * 60 + Number(lookup.minute ?? "0"),
  };
}

export function isPhoneValid(raw: string): boolean {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = `6${digits}`;
  return /^\d{9,15}$/.test(digits);
}

export function normalizePhone(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = `6${digits}`;
  return digits;
}

export function whatsappHref(number: string, message: string): string {
  return `https://wa.me/${normalizePhone(number)}?text=${encodeURIComponent(message)}`;
}

export function pluralOffering(
  labels: { offerings_plural?: I18nText } | undefined,
  locale: Locale,
  fallback = "Services",
): string {
  return text(labels?.offerings_plural, locale, fallback);
}

export function percent(numerator: number, denominator: number): number {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 100);
}

export function cxAmount(value: number | null | undefined): number {
  return value ?? 0;
}

export function isoFromSlot(iso: string): string {
  return iso;
}

export function weekdayNumberToKey(weekday: number): string {
  return ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][weekday] ?? "mon";
}

export function datesEqual(a: string, b: string): boolean {
  return a === b;
}
