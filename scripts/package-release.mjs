import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { platform } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const releaseRoot = join(projectRoot, "release");
const stagingRoot = join(releaseRoot, "SiteRelay-0.2.0");
const archive = join(releaseRoot, "SiteRelay-0.2.0.zip");
const included = [
  "apps",
  "packages",
  "plugins",
  "scripts",
  "AGENTS.md",
  "AUTHORIZED_USE.md",
  "LICENSE",
  "README.md",
  "docs",
  "install.ps1",
  "install.sh",
  "uninstall.ps1",
  "uninstall.sh",
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "tsconfig.base.json",
];

const ignoredNames = new Set(["node_modules", ".inspection", "captures", "reconstructions", "comparisons", ".logs"]);
const filter = (source) => !ignoredNames.has(basename(source)) && !source.endsWith(".tsbuildinfo");

rmSync(stagingRoot, { recursive: true, force: true });
rmSync(archive, { force: true });
mkdirSync(stagingRoot, { recursive: true });

for (const entry of included) {
  cpSync(join(projectRoot, entry), join(stagingRoot, entry), { recursive: true, filter });
}

if (platform() === "win32") {
  execFileSync("powershell.exe", [
    "-NoProfile",
    "-Command",
    `Compress-Archive -LiteralPath '${stagingRoot.replaceAll("'", "''")}' -DestinationPath '${archive.replaceAll("'", "''")}' -CompressionLevel Optimal`,
  ], { stdio: "inherit" });
} else {
  execFileSync("zip", ["-qr", archive, basename(stagingRoot)], { cwd: releaseRoot, stdio: "inherit" });
}

const bytes = readFileSync(archive);
const sha256 = createHash("sha256").update(bytes).digest("hex");
writeFileSync(join(releaseRoot, "SHA256SUMS.txt"), `${sha256}  ${basename(archive)}\n`);
console.log(`Created ${archive}`);
console.log(`SHA-256 ${sha256}`);
