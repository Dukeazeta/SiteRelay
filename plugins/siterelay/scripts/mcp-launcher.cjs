const { existsSync } = require("node:fs");
const { homedir } = require("node:os");
const { join, resolve } = require("node:path");
const { spawnSync } = require("node:child_process");

const candidates = [
  process.env.SITERELAY_PROJECT_ROOT,
  resolve(__dirname, "../../.."),
  join(homedir(), ".siterelay", "runtime"),
  process.cwd(),
].filter(Boolean);

const projectRoot = candidates.find((candidate) =>
  existsSync(join(candidate, "apps", "capture-service", "dist", "mcp.js")),
);

if (!projectRoot) {
  console.error("SiteRelay runtime not found. Run install.ps1 on Windows or ./install.sh on macOS.");
  process.exit(1);
}

const environment = {
  ...process.env,
  SITERELAY_CAPTURE_DIR: process.env.SITERELAY_CAPTURE_DIR || join(projectRoot, "captures"),
  SITERELAY_RECONSTRUCTION_DIR: process.env.SITERELAY_RECONSTRUCTION_DIR || join(projectRoot, "reconstructions"),
  SITERELAY_COMPARISON_DIR: process.env.SITERELAY_COMPARISON_DIR || join(projectRoot, "comparisons"),
  SITERELAY_TOKEN_FILE: process.env.SITERELAY_TOKEN_FILE || join(projectRoot, ".siterelay-token"),
};

const result = spawnSync(process.execPath, [join(projectRoot, "apps", "capture-service", "dist", "mcp.js")], {
  env: environment,
  stdio: "inherit",
});

process.exit(result.status ?? 1);
