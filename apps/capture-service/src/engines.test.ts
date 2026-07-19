import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { parseCapture } from "@siterelay/capture-schema";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { compareImages } from "./compare.js";
import { reconstructCapture } from "./reconstruct.js";

const capture = parseCapture({
  schemaVersion: 2,
  id: "engine-test",
  createdAt: "2026-07-18T12:00:00.000Z",
  source: { url: "https://example.com", title: "Hero", userAgent: "test" },
  selection: { selector: "#hero", outerHTML: "<section id=\"hero\">Hello</section>", rect: { x: 0, y: 0, width: 2, height: 2, top: 0, right: 2, bottom: 2, left: 0 } },
  viewport: { width: 2, height: 2, devicePixelRatio: 1, scrollX: 0, scrollY: 0 },
  nodes: [{ path: ":scope", tagName: "section", html: "<section id=\"hero\">Hello</section>", text: "Hello", attributes: { id: "hero" }, styles: { display: "block", color: "rgb(0, 0, 0)" }, rect: { x: 0, y: 0, width: 2, height: 2, top: 0, right: 2, bottom: 2, left: 0 } }],
  fonts: [], assets: [], animations: [], warnings: [],
});

describe("SiteRelay engines", () => {
  it("generates a fidelity-first React artifact", async () => {
    const directory = await mkdtemp(join(tmpdir(), "siterelay-reconstruct-"));
    const result = await reconstructCapture(capture, directory);
    expect(await readFile(result.componentPath, "utf8")).toContain("dangerouslySetInnerHTML");
    expect(await readFile(result.cssPath, "utf8")).toContain("display: block");
  });

  it("produces an exact zero-difference result for identical images", async () => {
    const directory = await mkdtemp(join(tmpdir(), "siterelay-compare-"));
    const candidatePath = join(directory, "candidate.png");
    const image = await sharp({ create: { width: 4, height: 4, channels: 3, background: "#d8ff52" } }).png().toBuffer();
    await sharp(image).toFile(candidatePath);
    const result = await compareImages(image, candidatePath, join(directory, "output"));
    expect(result.mismatchPercentage).toBe(0);
  });
});
