import { execFile } from "node:child_process";
import { access, mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
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
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
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
  const browserProfile = await mkdtemp(join(tmpdir(), "siterelay-chrome-"));
  try {
    await execFileAsync(executable, [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      "--no-first-run",
      "--no-default-browser-check",
      `--user-data-dir=${browserProfile}`,
      "--run-all-compositor-stages-before-draw",
      "--virtual-time-budget=1500",
      `--window-size=${width},${height}`,
      `--screenshot=${screenshotPath}`,
      pathToFileURL(previewPath).href,
    ], { timeout: 30_000, windowsHide: true });
    return { screenshotPath, width, height, executable };
  } finally {
    await rm(browserProfile, { recursive: true, force: true });
  }
}
