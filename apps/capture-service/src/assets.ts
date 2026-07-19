import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";

import type { SiteRelayCapture } from "@siterelay/capture-schema";

const MAX_ASSET_BYTES = 25 * 1024 * 1024;

function safeFilename(url: URL, index: number, contentType: string | null): string {
  const original = basename(url.pathname).replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-100);
  if (original && extname(original)) return `${String(index + 1).padStart(3, "0")}-${original}`;
  const extension = contentType?.includes("font/woff2") ? ".woff2"
    : contentType?.includes("font/woff") ? ".woff"
      : contentType?.includes("svg") ? ".svg"
        : contentType?.includes("png") ? ".png"
          : contentType?.includes("jpeg") ? ".jpg" : ".bin";
  return `${String(index + 1).padStart(3, "0")}-asset${extension}`;
}

export async function downloadCaptureAssets(capture: SiteRelayCapture, rootDirectory: string) {
  const directory = join(rootDirectory, capture.id, "assets");
  await mkdir(directory, { recursive: true });
  const records = [];
  for (const [index, asset] of capture.assets.entries()) {
    if (asset.url.startsWith("inline:") || asset.url.startsWith("data:")) {
      records.push({ ...asset, status: "metadata-only", reason: "Inline asset remains in captured markup." });
      continue;
    }
    try {
      const url = new URL(asset.url);
      if (!["http:", "https:"].includes(url.protocol)) throw new Error("Unsupported asset protocol");
      const response = await fetch(url, { redirect: "follow" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const declaredLength = Number(response.headers.get("content-length") ?? "0");
      if (declaredLength > MAX_ASSET_BYTES) throw new Error("Asset exceeds the 25 MB limit");
      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length > MAX_ASSET_BYTES) throw new Error("Asset exceeds the 25 MB limit");
      const filename = safeFilename(url, index, response.headers.get("content-type"));
      const path = join(directory, filename);
      await writeFile(path, bytes);
      records.push({
        ...asset,
        status: "downloaded",
        path,
        bytes: bytes.length,
        sha256: createHash("sha256").update(bytes).digest("hex"),
        contentType: response.headers.get("content-type"),
      });
    } catch (error) {
      records.push({ ...asset, status: "failed", reason: error instanceof Error ? error.message : "Unknown asset error" });
    }
  }
  const manifestPath = join(directory, "manifest.json");
  await writeFile(manifestPath, `${JSON.stringify({
    captureId: capture.id,
    sourceUrl: capture.source.url,
    authorizationNote: "Downloaded only after the user explicitly confirmed authorization to reuse these assets.",
    assets: records,
  }, null, 2)}\n`, "utf8");
  return { directory, manifestPath, assets: records };
}
