import { describe, expect, it } from "vitest";

import { displayClock, money, safeHttpUrl, whatsappHref } from "./utils";

describe("displayClock", () => {
  it("keeps 24-hour time in Chinese", () => {
    expect(displayClock("22:30", "zh")).toBe("22:30");
    expect(displayClock("09:05", "zh")).toBe("09:05");
  });

  it("renders 12-hour time in English", () => {
    expect(displayClock("22:30", "en")).toBe("10:30 PM");
    expect(displayClock("00:15", "en")).toBe("12:15 AM");
  });
});

describe("money", () => {
  it("formats ringgit without trailing cents", () => {
    expect(money(3000)).toBe("RM 30");
    expect(money(8050)).toBe("RM 80.50");
  });
});

describe("whatsappHref", () => {
  it("normalizes the number and encodes the message", () => {
    expect(whatsappHref("+60 17-741 0100", "Hi & hello")).toBe(
      "https://wa.me/60177410100?text=Hi%20%26%20hello",
    );
  });
});

describe("safeHttpUrl", () => {
  it("keeps http(s) links", () => {
    expect(safeHttpUrl("https://maps.google.com/?q=clinic")).toBe("https://maps.google.com/?q=clinic");
  });

  it("drops executable and malformed URLs", () => {
    expect(safeHttpUrl("javascript:alert(1)")).toBe("#");
    expect(safeHttpUrl("data:text/html,<script>alert(1)</script>")).toBe("#");
    expect(safeHttpUrl("not a url")).toBe("#");
    expect(safeHttpUrl("")).toBe("#");
  });
});
