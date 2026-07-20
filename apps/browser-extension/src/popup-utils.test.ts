import { describe, expect, it } from "vitest";

import { isInspectableUrl, readableError, sourceHostname } from "./popup-utils.js";

describe("popup utilities", () => {
  it("accepts ordinary web pages and rejects protected browser URLs", () => {
    expect(isInspectableUrl("https://example.com/component")).toBe(true);
    expect(isInspectableUrl("http://localhost:3000")).toBe(true);
    expect(isInspectableUrl("chrome://extensions")).toBe(false);
    expect(isInspectableUrl(undefined)).toBe(false);
  });

  it("renders actionable fallback errors", () => {
    expect(readableError(new Error("Worker unavailable"), "Unknown error")).toBe("Worker unavailable");
    expect(readableError("bad", "Unknown error")).toBe("Unknown error");
  });

  it("formats capture source hosts without throwing", () => {
    expect(sourceHostname("https://example.com/path")).toBe("example.com");
    expect(sourceHostname("not-a-url")).toBe("unknown source");
  });
});
