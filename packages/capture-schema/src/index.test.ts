import { describe, expect, it } from "vitest";

import { parseCapture } from "./index.js";

describe("parseCapture", () => {
  it("rejects incomplete captures", () => {
    expect(() => parseCapture({ schemaVersion: 1 })).toThrow();
  });

  it("keeps version-one captures readable with version-two defaults", () => {
    const parsed = parseCapture({
      schemaVersion: 1,
      id: "legacy",
      createdAt: "2026-07-18T12:00:00.000Z",
      source: { url: "https://example.com", title: "Legacy", userAgent: "test" },
      selection: { selector: "body", outerHTML: "<body></body>", rect: { x: 0, y: 0, width: 1, height: 1, top: 0, right: 1, bottom: 1, left: 0 } },
      viewport: { width: 1, height: 1, devicePixelRatio: 1, scrollX: 0, scrollY: 0 },
      nodes: [], fonts: [], assets: [], animations: [], warnings: [],
    });
    expect(parsed.captureMode).toBe("component");
    expect(parsed.responsiveScreenshots).toEqual([]);
  });
});
