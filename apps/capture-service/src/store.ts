import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { gzip, gunzip } from "node:zlib";

import { captureSchema, type SiteRelayCapture } from "@siterelay/capture-schema";

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

export interface CaptureSummary {
  id: string;
  createdAt: string;
  sourceUrl: string;
  title: string;
  selector: string;
  nodeCount: number;
  fontCount: number;
  assetCount: number;
  animationCount: number;
  screenshotPath?: string;
  fullPageScreenshotPath?: string;
  responsiveProfiles: Array<"mobile" | "tablet" | "desktop">;
  captureName?: string;
  captureMode: SiteRelayCapture["captureMode"];
  stateLabel: string;
  assetAuthorization: SiteRelayCapture["assetAuthorization"];
  byteSize: number;
  storedByteSize: number;
  limitations: string[];
  warnings: string[];
}

export class CaptureStore {
  constructor(private readonly rootDirectory: string) {}

  async save(input: unknown): Promise<CaptureSummary> {
    const capture = captureSchema.parse(input);
    const directory = join(this.rootDirectory, capture.id);
    await mkdir(directory, { recursive: true });

    let screenshotPath: string | undefined;
    if (capture.screenshotDataUrl) {
      const match = /^data:image\/png;base64,(.+)$/.exec(capture.screenshotDataUrl);
      if (match?.[1]) {
        screenshotPath = join(directory, "screenshot.png");
        await writeFile(screenshotPath, Buffer.from(match[1], "base64"));
      }
    }

    let fullPageScreenshotPath: string | undefined;
    if (capture.fullPageScreenshotDataUrl) {
      const match = /^data:image\/png;base64,(.+)$/.exec(capture.fullPageScreenshotDataUrl);
      if (match?.[1]) {
        fullPageScreenshotPath = join(directory, "full-page-screenshot.png");
        await writeFile(fullPageScreenshotPath, Buffer.from(match[1], "base64"));
      }
    }

    const responsiveScreenshotPaths: Record<string, string> = {};
    for (const screenshot of capture.responsiveScreenshots) {
      if (!screenshot.screenshotDataUrl) continue;
      const match = /^data:image\/png;base64,(.+)$/.exec(screenshot.screenshotDataUrl);
      if (!match?.[1]) continue;
      const path = join(directory, `responsive-${screenshot.profile}-${screenshot.width}.png`);
      await writeFile(path, Buffer.from(match[1], "base64"));
      responsiveScreenshotPaths[screenshot.profile] = path;
    }

    const storedCapture: SiteRelayCapture = {
      ...capture,
      screenshotDataUrl: undefined,
      fullPageScreenshotDataUrl: undefined,
      responsiveScreenshots: capture.responsiveScreenshots.map(({ screenshotDataUrl: _data, ...metadata }) => metadata),
    };
    const serializedCapture = `${JSON.stringify(storedCapture, null, 2)}\n`;
    const serializedBytes = Buffer.from(serializedCapture, "utf8");
    const compressedCapture = await gzipAsync(serializedBytes, { level: 9 });
    await writeFile(join(directory, "capture.json.gz"), compressedCapture);
    const summary = this.toSummary(
      storedCapture,
      serializedBytes.length,
      compressedCapture.length,
      screenshotPath,
      fullPageScreenshotPath,
    );
    await writeFile(join(directory, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
    return summary;
  }

  async list(): Promise<CaptureSummary[]> {
    await mkdir(this.rootDirectory, { recursive: true });
    const entries = await readdir(this.rootDirectory, { withFileTypes: true });
    const summaries = await Promise.all(
      entries
        .filter((entry) => entry.isDirectory())
        .map(async (entry) => {
          try {
            const raw = await readFile(join(this.rootDirectory, entry.name, "summary.json"), "utf8");
            return JSON.parse(raw) as CaptureSummary;
          } catch {
            return null;
          }
        }),
    );

    return summaries
      .filter((summary): summary is CaptureSummary => summary !== null)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  async get(id: string): Promise<SiteRelayCapture> {
    this.assertSafeId(id);
    try {
      const compressed = await readFile(join(this.rootDirectory, id, "capture.json.gz"));
      return captureSchema.parse(JSON.parse((await gunzipAsync(compressed)).toString("utf8")));
    } catch (error) {
      const fallbackPath = join(this.rootDirectory, id, "capture.json");
      try {
        const raw = await readFile(fallbackPath, "utf8");
        return captureSchema.parse(JSON.parse(raw));
      } catch {
        throw error;
      }
    }
  }

  async screenshot(id: string, kind: "selection" | "viewport" = "selection"): Promise<Buffer> {
    this.assertSafeId(id);
    return readFile(join(this.rootDirectory, id, kind === "selection" ? "screenshot.png" : "full-page-screenshot.png"));
  }

  async responsiveScreenshot(id: string, profile: "mobile" | "tablet" | "desktop"): Promise<Buffer> {
    this.assertSafeId(id);
    const capture = await this.get(id);
    const metadata = capture.responsiveScreenshots.find((candidate) => candidate.profile === profile);
    if (!metadata) throw new Error(`Responsive screenshot not found: ${profile}`);
    return readFile(join(this.rootDirectory, id, `responsive-${profile}-${metadata.width}.png`));
  }

  async getNode(id: string, path: string) {
    const capture = await this.get(id);
    const node = capture.nodes.find((candidate) => candidate.path === path);
    if (!node) throw new Error(`Node path not found: ${path}`);
    return node;
  }

  async search(id: string, query: string) {
    const capture = await this.get(id);
    const normalized = query.toLocaleLowerCase();
    return capture.nodes.filter((node) =>
      node.path.toLocaleLowerCase().includes(normalized)
      || node.tagName.toLocaleLowerCase().includes(normalized)
      || node.text.toLocaleLowerCase().includes(normalized)
      || Object.values(node.attributes).some((value) => value.toLocaleLowerCase().includes(normalized)),
    ).slice(0, 100);
  }

  async remove(id: string): Promise<void> {
    this.assertSafeId(id);
    await rm(join(this.rootDirectory, id), { recursive: true, force: false });
  }

  private assertSafeId(id: string): void {
    if (!/^[a-zA-Z0-9-]+$/.test(id)) throw new Error("Invalid capture ID");
  }

  private toSummary(
    capture: SiteRelayCapture,
    byteSize: number,
    storedByteSize: number,
    screenshotPath?: string,
    fullPageScreenshotPath?: string,
  ): CaptureSummary {
    return {
      id: capture.id,
      createdAt: capture.createdAt,
      sourceUrl: capture.source.url,
      title: capture.source.title,
      selector: capture.selection.selector,
      nodeCount: capture.nodes.length,
      fontCount: capture.fonts.length,
      assetCount: capture.assets.length,
      animationCount: capture.animations.length,
      screenshotPath,
      fullPageScreenshotPath,
      responsiveProfiles: capture.responsiveScreenshots.map((screenshot) => screenshot.profile),
      captureName: capture.captureName,
      captureMode: capture.captureMode,
      stateLabel: capture.stateLabel,
      assetAuthorization: capture.assetAuthorization,
      byteSize,
      storedByteSize,
      limitations: capture.limitations,
      warnings: capture.warnings,
    };
  }
}
