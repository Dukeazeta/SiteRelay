import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

export const serviceHost = process.env.SITERELAY_HOST ?? "127.0.0.1";
export const servicePort = Number(process.env.SITERELAY_PORT ?? "4319");
export const captureDirectory = resolve(process.env.SITERELAY_CAPTURE_DIR ?? "captures");
export const reconstructionDirectory = resolve(process.env.SITERELAY_RECONSTRUCTION_DIR ?? "reconstructions");
export const comparisonDirectory = resolve(process.env.SITERELAY_COMPARISON_DIR ?? "comparisons");
export const maxRequestBytes = Number(process.env.SITERELAY_MAX_REQUEST_BYTES ?? String(50 * 1024 * 1024));

const tokenPath = resolve(process.env.SITERELAY_TOKEN_FILE ?? ".siterelay-token");

function loadOrCreateToken(): string {
  if (process.env.SITERELAY_TOKEN) return process.env.SITERELAY_TOKEN;
  try {
    return readFileSync(tokenPath, "utf8").trim();
  } catch {
    const token = randomBytes(32).toString("hex");
    writeFileSync(tokenPath, `${token}\n`, { encoding: "utf8", mode: 0o600 });
    return token;
  }
}

export const serviceToken = loadOrCreateToken();
