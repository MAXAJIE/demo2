import type { I18nText, Locale, Offering } from "../../../types";

export type LangKey = Locale;

/** The two image slots the services editor manages. */
export type ImageKind = "cover" | "detail";

export type ServiceImages = { cover?: string; detail?: string };

export type ImageSpec = {
  /** Aspect ratio as a number, for the crop maths. */
  aspect: number;
  /** Same ratio as a CSS value for the fixed-ratio frame. */
  cssAspect: string;
  /** Nominal upload size in pixels. */
  width: number;
  height: number;
  ratioLabel: string;
};

/**
 * Client-side crop targets. Both ratios are fixed by the owner decision in
 * docs/08-open-questions.md: a 4:5 card cover and a 16:9 detail image.
 */
export const SERVICE_IMAGE_SPECS: Record<ImageKind, ImageSpec> = {
  cover: { aspect: 4 / 5, cssAspect: "4 / 5", width: 800, height: 1000, ratioLabel: "4:5" },
  detail: { aspect: 16 / 9, cssAspect: "16 / 9", width: 1600, height: 900, ratioLabel: "16:9" },
};

export const IMAGE_KINDS: ImageKind[] = ["cover", "detail"];

export const EDITABLE_LANGUAGES: LangKey[] = ["en", "ms", "zh"];

export type ServiceStatus = "draft" | "published";

/**
 * Everything the four wizard steps edit, held as plain strings so inputs stay
 * fully controlled; cents are parsed only when the patch is built.
 */
export type ServiceDraft = {
  title: Record<LangKey, string>;
  summary: Record<LangKey, string>;
  note: Record<LangKey, string>;
  price: string;
  deposit: string;
  status: ServiceStatus;
  images: ServiceImages;
};

/**
 * `offerings.images` is a JSONB column (migration 0007) that the shared
 * `Offering` type and the Supabase gateway mapping do not expose yet. The page
 * reads the URLs the editor saved through this optional view, without widening
 * the shared type or pretending the gateway round-trips them.
 */
export type OfferingWithImages = Offering & { images?: ServiceImages };

export function offeringImages(offering: Offering): ServiceImages {
  const withImages: OfferingWithImages = offering;
  const images = withImages.images;
  if (!images) return {};
  const result: ServiceImages = {};
  if (typeof images.cover === "string" && images.cover !== "") result.cover = images.cover;
  if (typeof images.detail === "string" && images.detail !== "") result.detail = images.detail;
  return result;
}

function languageText(value: I18nText | undefined, lang: LangKey): string {
  if (!value) return "";
  return value[lang] ?? "";
}

function languageRecord(value: I18nText | undefined): Record<LangKey, string> {
  return {
    en: languageText(value, "en"),
    ms: languageText(value, "ms"),
    zh: languageText(value, "zh"),
  };
}

/** Cents to the editable ringgit string, keeping "80" rather than "80.00". */
export function centsToRinggitInput(cents: number): string {
  if (cents % 100 === 0) return String(cents / 100);
  return (cents / 100).toFixed(2);
}

export function draftFromOffering(offering: Offering): ServiceDraft {
  return {
    title: languageRecord(offering.title),
    summary: languageRecord(offering.summary),
    note: languageRecord(offering.price_note),
    price: offering.price_cents === null ? "" : centsToRinggitInput(offering.price_cents),
    deposit: offering.deposit_cents === null ? "" : centsToRinggitInput(offering.deposit_cents),
    status: offering.status === "published" ? "published" : "draft",
    images: offeringImages(offering),
  };
}

export type ParsedAmount = { cents: number | null; invalid: boolean };

const RINGGIT_INPUT = /^\d+(?:\.\d{1,2})?$/;

/**
 * Accepts "80" or "80.50" (and a leading "RM" or thousand separators) and
 * returns integer cents. Empty input means "not priced", which is valid.
 */
export function parseRinggitToCents(raw: string): ParsedAmount {
  const value = raw
    .trim()
    .replace(/^rm\s*/i, "")
    .replace(/[,\s]/g, "");
  if (value === "") return { cents: null, invalid: false };
  if (!RINGGIT_INPUT.test(value)) return { cents: null, invalid: true };
  return { cents: Math.round(Number(value) * 100), invalid: false };
}

/** Merges the three edited languages into a JSONB value, keeping other keys. */
export function mergeLocalized(
  existing: I18nText | undefined,
  values: Record<LangKey, string>,
): I18nText {
  return {
    ...(existing ?? {}),
    en: values.en.trim(),
    ms: values.ms.trim(),
    zh: values.zh.trim(),
  };
}

export function missingTitleLanguages(draft: ServiceDraft): LangKey[] {
  return EDITABLE_LANGUAGES.filter((lang) => draft.title[lang].trim() === "");
}

export type PricingIssues = { price: boolean; deposit: boolean };

export function pricingIssues(draft: ServiceDraft): PricingIssues {
  return {
    price: parseRinggitToCents(draft.price).invalid,
    deposit: parseRinggitToCents(draft.deposit).invalid,
  };
}

export function hasPricingIssue(draft: ServiceDraft): boolean {
  const issues = pricingIssues(draft);
  return issues.price || issues.deposit;
}

/**
 * The patch the wizard sends to `adminUpdateOffering`.
 *
 * `title`, `summary` and `price_note` are i18n JSONB columns: the patch keeps
 * every key that is not edited. `images` is merged the same way so an upload
 * only replaces the slot it belongs to. `currency` is fixed to MYR here because
 * the editor never lets the merchant change it.
 *
 * Adapter note: `frontend/src/lib/gateway/supabase.ts` currently whitelists only
 * title/summary/price_note/price_cents/deposit_cents/status in
 * `buildOfferingPatch` and does not select the `images` column, so on the hosted
 * data source these keys are accepted by this page but not persisted until the
 * gateway mapping catches up with migration 0007; the local demo adapter stores
 * the whole patch.
 */
export function buildOfferingPatch(
  draft: ServiceDraft,
  offering: Offering,
): Record<string, unknown> {
  const images: ServiceImages = { ...offeringImages(offering) };
  for (const kind of IMAGE_KINDS) {
    const url = draft.images[kind];
    if (typeof url === "string" && url !== "") images[kind] = url;
  }

  return {
    title: mergeLocalized(offering.title, draft.title),
    summary: mergeLocalized(offering.summary, draft.summary),
    price_note: mergeLocalized(offering.price_note, draft.note),
    price_cents: parseRinggitToCents(draft.price).cents,
    deposit_cents: parseRinggitToCents(draft.deposit).cents,
    currency: "MYR",
    status: draft.status,
    images,
  };
}
