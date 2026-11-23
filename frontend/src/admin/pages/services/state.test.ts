import { describe, expect, it } from "vitest";

import type { I18nText, Offering } from "../../../types";
import {
  baseCropSize,
  clampCropCenter,
  cropRect,
  cropSizeAtZoom,
  panCropCenter,
} from "./crop";
import {
  buildOfferingPatch,
  centsToRinggitInput,
  draftFromOffering,
  mergeLocalized,
  missingTitleLanguages,
  offeringImages,
  parseRinggitToCents,
  type ServiceDraft,
} from "./state";

const baseOffering: Offering = {
  id: "offering-1",
  slug: "gentle-clean",
  kind: "service",
  title: { en: "Gentle clean", ms: "", zh: "温和洗牙", legacy: "keep me" },
  summary: { en: "A calm clean", zh: "" },
  body: {},
  price_cents: 8000,
  deposit_cents: 5050,
  currency: "MYR",
  price_note: { en: "Per visit", zh: "每次" },
  attributes: {},
  duration_min: 45,
  status: "published",
  sort: 1,
};

function withImages(images: { cover?: string; detail?: string }): Offering {
  return Object.assign({}, baseOffering, { images });
}

describe("parseRinggitToCents", () => {
  it("accepts whole ringgit and two decimal places", () => {
    expect(parseRinggitToCents("80")).toEqual({ cents: 8000, invalid: false });
    expect(parseRinggitToCents("80.50")).toEqual({ cents: 8050, invalid: false });
    expect(parseRinggitToCents("80.5")).toEqual({ cents: 8050, invalid: false });
    expect(parseRinggitToCents("0.05")).toEqual({ cents: 5, invalid: false });
  });

  it("ignores the RM prefix, spaces and thousand separators", () => {
    expect(parseRinggitToCents(" RM 1,200.00 ")).toEqual({ cents: 120000, invalid: false });
  });

  it("treats an empty input as not priced", () => {
    expect(parseRinggitToCents("")).toEqual({ cents: null, invalid: false });
    expect(parseRinggitToCents("   ")).toEqual({ cents: null, invalid: false });
  });

  it("rejects words, negatives and more than two decimals", () => {
    expect(parseRinggitToCents("abc").invalid).toBe(true);
    expect(parseRinggitToCents("-5").invalid).toBe(true);
    expect(parseRinggitToCents("80.123").invalid).toBe(true);
    expect(parseRinggitToCents("80.").invalid).toBe(true);
  });

  it("round-trips the editable string form", () => {
    expect(centsToRinggitInput(8000)).toBe("80");
    expect(centsToRinggitInput(8050)).toBe("80.50");
  });
});

describe("draftFromOffering", () => {
  it("reads all three languages, cents and status", () => {
    const draft = draftFromOffering(baseOffering);
    expect(draft.title).toEqual({ en: "Gentle clean", ms: "", zh: "温和洗牙" });
    expect(draft.price).toBe("80");
    expect(draft.deposit).toBe("50.50");
    expect(draft.status).toBe("published");
    expect(draft.images).toEqual({});
  });

  it("treats an unpublished status as draft", () => {
    const draft = draftFromOffering({ ...baseOffering, status: "archived" });
    expect(draft.status).toBe("draft");
  });

  it("reads the images JSONB column through the optional view", () => {
    const offering = withImages({ cover: "https://cdn.test/cover.jpg" });
    expect(offeringImages(offering)).toEqual({ cover: "https://cdn.test/cover.jpg" });
    expect(draftFromOffering(offering).images).toEqual({ cover: "https://cdn.test/cover.jpg" });
  });
});

describe("mergeLocalized", () => {
  it("keeps keys that are not edited", () => {
    const existing: I18nText = { en: "Old", zh: "旧", legacy: "keep me" };
    expect(mergeLocalized(existing, { en: " New ", ms: "Baharu", zh: "" })).toEqual({
      en: "New",
      ms: "Baharu",
      zh: "",
      legacy: "keep me",
    });
  });
});

describe("buildOfferingPatch", () => {
  it("sends the three i18n columns, cents, MYR and status", () => {
    const draft = draftFromOffering(baseOffering);
    draft.title.ms = "Bersih lembut";
    draft.summary.ms = "Bersih tenang";
    draft.note.ms = "Setiap lawatan";
    draft.price = "95.50";
    draft.deposit = "";
    draft.status = "draft";

    const patch = buildOfferingPatch(draft, baseOffering);
    expect(patch.title).toEqual({
      en: "Gentle clean",
      ms: "Bersih lembut",
      zh: "温和洗牙",
      legacy: "keep me",
    });
    expect(patch.price_note).toEqual({ en: "Per visit", ms: "Setiap lawatan", zh: "每次" });
    expect(patch.price_cents).toBe(9550);
    expect(patch.deposit_cents).toBeNull();
    expect(patch.currency).toBe("MYR");
    expect(patch.status).toBe("draft");
  });

  it("keeps the image that was not replaced", () => {
    const existing = withImages({ detail: "https://cdn.test/detail.jpg" });
    const draft: ServiceDraft = draftFromOffering(existing);
    draft.images = { ...draft.images, cover: "https://cdn.test/new-cover.jpg" };

    const patch = buildOfferingPatch(draft, existing);
    expect(patch.images).toEqual({
      detail: "https://cdn.test/detail.jpg",
      cover: "https://cdn.test/new-cover.jpg",
    });
  });
});

describe("missingTitleLanguages", () => {
  it("lists every language that still needs a title", () => {
    const draft = draftFromOffering(baseOffering);
    expect(missingTitleLanguages(draft)).toEqual(["ms"]);
    draft.title.ms = "  ";
    expect(missingTitleLanguages(draft)).toEqual(["ms"]);
    draft.title.ms = "Bersih lembut";
    expect(missingTitleLanguages(draft)).toEqual([]);
  });
});

describe("crop maths", () => {
  it("fits a wide image by height and a tall image by width", () => {
    expect(baseCropSize(2000, 1000, 4 / 5)).toEqual({ width: 800, height: 1000 });
    expect(baseCropSize(800, 2000, 4 / 5)).toEqual({ width: 800, height: 1000 });
  });

  it("shrinks the crop window as zoom increases", () => {
    expect(cropSizeAtZoom(1000, 1000, 4 / 5, 1)).toEqual({ width: 800, height: 1000 });
    expect(cropSizeAtZoom(1000, 1000, 4 / 5, 2)).toEqual({ width: 400, height: 500 });
    expect(cropSizeAtZoom(1000, 1000, 4 / 5, 3)).toEqual({ width: 800 / 3, height: 1000 / 3 });
  });

  it("keeps the crop inside the image at the edges", () => {
    const rect = cropRect(1000, 1000, 4 / 5, 2, { x: 0, y: 0 });
    expect(rect.sx).toBe(0);
    expect(rect.sy).toBe(0);
    expect(rect.sw).toBe(400);
    expect(rect.sh).toBe(500);

    const bottomRight = cropRect(1000, 1000, 4 / 5, 2, { x: 10_000, y: 10_000 });
    expect(bottomRight.sx).toBe(600);
    expect(bottomRight.sy).toBe(500);
  });

  it("pans within the image and clamps at the crop boundary", () => {
    const centered = { x: 500, y: 500 };
    // A 4:5 crop on a square image is 800x1000, so it can pan 100px sideways.
    expect(panCropCenter(1000, 1000, 4 / 5, 1, centered, 100, 0)).toEqual({ x: 600, y: 500 });
    expect(panCropCenter(1000, 1000, 4 / 5, 1, centered, -5000, 0)).toEqual({ x: 400, y: 500 });
    expect(panCropCenter(1000, 1000, 1, 1, centered, 5000, 5000)).toEqual({ x: 500, y: 500 });
    expect(clampCropCenter(1000, 1000, 4 / 5, 2, { x: 0, y: 0 })).toEqual({ x: 200, y: 250 });
  });
});
