import { execFileSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { homedir, platform } from "node:os";
import { join } from "node:path";

const installRoot = join(homedir(), ".siterelay");

if (platform() === "win32") {
  const launcher = join(process.env.APPDATA, "Microsoft", "Windows", "Start Menu", "Programs", "Startup", "SiteRelay Capture Service.cmd");
  if (existsSync(launcher)) rmSync(launcher, { force: true });
} else if (platform() === "darwin") {
  const plist = join(homedir(), "Library", "LaunchAgents", "com.siterelay.capture-service.plist");
  if (existsSync(plist)) {
    try { execFileSync("launchctl", ["unload", plist], { stdio: "ignore" }); } catch { /* Already stopped. */ }
    rmSync(plist, { force: true });
  }
}

rmSync(installRoot, { recursive: true, force: true });
console.log("SiteRelay runtime and automatic startup entry were removed.");
console.log("Remove the unpacked extension from Chrome or Edge to finish uninstalling.");
