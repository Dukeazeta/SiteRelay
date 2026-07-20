import { execFileSync, spawn } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir, platform } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const installRoot = join(homedir(), ".siterelay");
const runtimeRoot = projectRoot;
const pluginRoot = join(installRoot, "marketplace", "plugins", "siterelay");
const marketplaceRoot = join(installRoot, "marketplace");
const tokenFile = join(runtimeRoot, ".siterelay-token");
const nodeExecutable = process.execPath;
const pnpm = platform() === "win32" ? "pnpm.cmd" : "pnpm";
const codex = platform() === "win32" ? "codex.exe" : "codex";

function run(command, args, options = {}) {
  console.log(`> ${command} ${args.join(" ")}`);
  if (platform() === "win32" && command.toLowerCase().endsWith(".cmd")) {
    const commandLine = [command, ...args].join(" ");
    execFileSync(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", commandLine], {
      cwd: projectRoot,
      stdio: "inherit",
      ...options,
    });
    return;
  }
  execFileSync(command, args, { cwd: projectRoot, stdio: "inherit", ...options });
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function ensureBuild() {
  run(pnpm, ["install", "--frozen-lockfile"]);
  const serviceBuilt = existsSync(join(projectRoot, "apps", "capture-service", "dist", "server.js"));
  const extensionBuilt = existsSync(join(projectRoot, "apps", "browser-extension", "dist", "background.js"));
  if (!serviceBuilt || !extensionBuilt || !existsSync(tokenFile)) {
    run(pnpm, ["build"]);
  }
}

function verifyRuntime() {
  if (!existsSync(tokenFile)) {
    throw new Error("The extension token was not generated. Run pnpm build and retry installation.");
  }
}

function deployPlugin() {
  rmSync(marketplaceRoot, { recursive: true, force: true });
  mkdirSync(dirname(pluginRoot), { recursive: true });
  cpSync(join(projectRoot, "plugins", "siterelay"), pluginRoot, { recursive: true });
  writeJson(join(pluginRoot, ".mcp.json"), {
    mcpServers: {
      siterelay: {
        command: nodeExecutable,
        args: [join(runtimeRoot, "apps", "capture-service", "dist", "mcp.js")],
        env: {
          SITERELAY_CAPTURE_DIR: join(runtimeRoot, "captures"),
          SITERELAY_RECONSTRUCTION_DIR: join(runtimeRoot, "reconstructions"),
          SITERELAY_COMPARISON_DIR: join(runtimeRoot, "comparisons"),
          SITERELAY_TOKEN_FILE: tokenFile,
        },
      },
    },
  });
  writeJson(join(marketplaceRoot, ".agents", "plugins", "marketplace.json"), {
    name: "siterelay-release",
    interface: { displayName: "SiteRelay Release" },
    plugins: [{
      name: "siterelay",
      source: { source: "local", path: "./plugins/siterelay" },
      policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" },
      category: "Developer Tools",
    }],
  });
}

function registerStartup() {
  const server = join(runtimeRoot, "apps", "capture-service", "dist", "server.js");
  if (platform() === "win32") {
    const startup = join(process.env.APPDATA, "Microsoft", "Windows", "Start Menu", "Programs", "Startup");
    mkdirSync(startup, { recursive: true });
    writeFileSync(join(startup, "SiteRelay Capture Service.cmd"), [
      "@echo off",
      `cd /d \"${runtimeRoot}\"`,
      `start \"\" /min \"${nodeExecutable}\" \"${server}\"`,
      "",
    ].join("\r\n"));
  } else if (platform() === "darwin") {
    const launchAgents = join(homedir(), "Library", "LaunchAgents");
    mkdirSync(launchAgents, { recursive: true });
    const escapeXml = (value) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
    const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>Label</key><string>com.siterelay.capture-service</string>
<key>ProgramArguments</key><array><string>${escapeXml(nodeExecutable)}</string><string>${escapeXml(server)}</string></array>
<key>WorkingDirectory</key><string>${escapeXml(runtimeRoot)}</string>
<key>RunAtLoad</key><true/><key>KeepAlive</key><true/>
<key>StandardOutPath</key><string>${escapeXml(join(installRoot, "service.log"))}</string>
<key>StandardErrorPath</key><string>${escapeXml(join(installRoot, "service-error.log"))}</string>
</dict></plist>`;
    const plistPath = join(launchAgents, "com.siterelay.capture-service.plist");
    writeFileSync(plistPath, plist);
    try { run("launchctl", ["unload", plistPath]); } catch { /* Not loaded yet. */ }
    run("launchctl", ["load", plistPath]);
  } else {
    throw new Error("Automatic installation currently supports Windows and macOS.");
  }

  const child = spawn(nodeExecutable, [server], {
    cwd: runtimeRoot,
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  child.unref();
}

function installCodexPlugin() {
  try {
    run(codex, ["plugin", "marketplace", "add", marketplaceRoot]);
  } catch {
    console.warn("Codex marketplace may already be registered; continuing.");
  }
  run(codex, ["plugin", "add", "siterelay@siterelay-release"]);
}

ensureBuild();
verifyRuntime();
deployPlugin();
registerStartup();
installCodexPlugin();

console.log("\nSiteRelay is installed.");
console.log(`Load this unpacked extension folder in Chrome or Edge:\n${join(runtimeRoot, "apps", "browser-extension", "dist")}`);
console.log("Start a new Codex task after installation so the SiteRelay tools are loaded.");
