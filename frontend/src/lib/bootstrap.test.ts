import { describe, expect, it } from "vitest";

import { readBootstrap } from "./bootstrap";

const doc = (text: string | null) => ({
  getElementById: () => (text === null ? null : ({ textContent: text } as HTMLElement)),
});
const bundle = JSON.stringify({ tenant: { slug: "setapak-dental-jb" }, site: {} });

describe("readBootstrap", () => {
  it("returns the inlined bundle when no tenant override is set", () => {
    expect(readBootstrap(null, doc(bundle))?.tenant.slug).toBe("setapak-dental-jb");
  });

  it("returns it when the override names the same tenant", () => {
    expect(readBootstrap("setapak-dental-jb", doc(bundle))).toBeDefined();
  });

  it("ignores it when the browser asks for a different tenant", () => {
    expect(readBootstrap("other-tenant", doc(bundle))).toBeUndefined();
  });

  it("ignores missing, empty or malformed data", () => {
    expect(readBootstrap(null, doc(null))).toBeUndefined();
    expect(readBootstrap(null, doc(""))).toBeUndefined();
    expect(readBootstrap(null, doc("{not json"))).toBeUndefined();
    expect(readBootstrap(null, doc("{}"))).toBeUndefined();
  });
});
