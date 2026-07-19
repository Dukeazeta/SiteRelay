import { randomBytes } from "node:crypto";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { build } from "esbuild";

await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });

const tokenPath = resolve("../../.siterelay-token");
let serviceToken;
try {
  serviceToken = (await readFile(tokenPath, "utf8")).trim();
} catch {
  serviceToken = randomBytes(32).toString("hex");
  await writeFile(tokenPath, `${serviceToken}\n`, { encoding: "utf8", mode: 0o600 });
}

await build({
  entryPoints: {
    background: "src/background.ts",
    content: "src/content.ts",
    popup: "src/popup.ts",
  },
  bundle: true,
  format: "iife",
  outdir: "dist",
  sourcemap: true,
  target: "chrome120",
  define: {
    __SITERELAY_TOKEN__: JSON.stringify(serviceToken),
  },
});

await Promise.all([
  cp("src/manifest.json", "dist/manifest.json"),
  cp("src/popup.html", "dist/popup.html"),
]);
