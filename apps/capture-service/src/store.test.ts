import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { CaptureStore } from "./store.js";

function capture(id: string) {
  return {
    schemaVersion: 1 as const,
    id,
    createdAt: "2026-07-18T12:00:00.000Z",
    source: { url: "https://example.com/", title: "Example", userAgent: "test" },
    selection: {
      selector: "#hero",
      outerHTML: "<section id=\"hero\">Hello</section>",
      rect: { x: 0, y: 0, width: 100, height: 50, top: 0, right: 100, bottom: 50, left: 0 },
    },
    viewport: { width: 1440, height: 900, devicePixelRatio: 1, scrollX: 0, scrollY: 0 },
    nodes: [],
    fonts: [],
    assets: [],
    animations: [],
    warnings: [],
    screenshotDataUrl: `data:image/png;base64,${Buffer.from("png").toString("base64")}`,
  };
}

describe("CaptureStore", () => {
  it("persists, lists, and reads captures", async () => {
    const directory = await mkdtemp(join(tmpdir(), "siterelay-test-"));
    const store = new CaptureStore(directory);
    await store.save(capture("capture-1"));

    expect(await store.list()).toHaveLength(1);
    expect((await store.get("capture-1")).source.title).toBe("Example");
    expect((await store.screenshot("capture-1")).toString()).toBe("png");
    expect((await store.list())[0]?.captureMode).toBe("component");
  });

  it("searches a capture without returning the entire document", async () => {
    const directory = await mkdtemp(join(tmpdir(), "siterelay-test-"));
    const store = new CaptureStore(directory);
    const input = capture("capture-search");
    input.nodes = [{
      path: ":scope",
      tagName: "button",
      html: "<button>Continue</button>",
      text: "Continue",
      attributes: { type: "button" },
      styles: { color: "rgb(0, 0, 0)" },
      rect: input.selection.rect,
    }];
    await store.save(input);
    expect(await store.search("capture-search", "continue")).toHaveLength(1);
    expect((await store.getNode("capture-search", ":scope")).tagName).toBe("button");
  });

  it("rejects traversal-like capture IDs", async () => {
    const directory = await mkdtemp(join(tmpdir(), "siterelay-test-"));
    const store = new CaptureStore(directory);
    await expect(store.get("../secret")).rejects.toThrow("Invalid capture ID");
  });

  it("deletes only the requested validated capture", async () => {
    const directory = await mkdtemp(join(tmpdir(), "siterelay-test-"));
    const store = new CaptureStore(directory);
    await store.save(capture("capture-delete"));
    await store.remove("capture-delete");
    expect(await store.list()).toEqual([]);
  });
});
