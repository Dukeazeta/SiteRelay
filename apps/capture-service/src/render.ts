import { execFile } from "node:child_process";
import { access, mkdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { join } from "node:path";

const execFileAsync = promisify(execFile);

async function chromeExecutable(): Promise<string> {
  const candidates = [
    process.env.SITERELAY_CHROME_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  ].filter((candidate): candidate is string => Boolean(candidate));
  for (const candidate of candidates) {
    try { await access(candidate); return candidate; } catch { /* Try the next known browser. */ }
  }
  throw new Error("Chrome or Edge executable was not found. Set SITERELAY_CHROME_PATH.");
}

export async function renderPreview(previewPath: string, outputDirectory: string, width: number, height: number) {
  await mkdir(outputDirectory, { recursive: true });
  const screenshotPath = join(outputDirectory, `render-${width}x${height}.png`);
  const executable = await chromeExecutable();
  await execFileAsync(executable, [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--run-all-compositor-stages-before-draw",
    "--virtual-time-budget=1500",
    `--window-size=${width},${height}`,
    `--screenshot=${screenshotPath}`,
    pathToFileURL(previewPath).href,
  ], { timeout: 30_000, windowsHide: true });
  return { screenshotPath, width, height, executable };
}
