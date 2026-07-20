# SiteRelay installation

## Supported platforms

- Windows 10 or later with PowerShell
- macOS 13 or later
- Chrome or Microsoft Edge 120 or later
- Node.js 20 or later
- pnpm 11
- Codex desktop or CLI with local plugin support

## One-command setup

From the extracted SiteRelay folder:

### Windows

```powershell
.\install.ps1
```

### macOS

```bash
chmod +x install.sh uninstall.sh
./install.sh
```

The installer builds SiteRelay only when compiled files are absent, generates
the private local token, registers the capture service at sign-in, creates a
portable local Codex marketplace, and installs the SiteRelay plugin.

The final message prints the exact `apps/browser-extension/dist` folder to load
through Chrome or Edge's **Load unpacked** button. Start a new Codex task after
installation so Codex discovers the new MCP tools.

## Verify

```bash
pnpm health
pnpm test
```

The health check should report `SiteRelay is healthy (schema 2)`.

## Uninstall

Windows:

```powershell
.\uninstall.ps1
```

macOS:

```bash
./uninstall.sh
```

Then remove the unpacked browser extension from Chrome or Edge.

## Troubleshooting

- **Service worker is inactive:** Manifest V3 workers sleep when idle. Clicking
  SiteRelay wakes the worker. If the popup reports that the worker is
  unavailable, reload the unpacked extension once.
- **Service offline:** run `pnpm health`, then rerun the installer.
- **Protected page:** Chrome does not allow inspection on `chrome://`, browser
  extension stores, or some internal PDF and settings pages. Open a regular
  `http://` or `https://` page.
- **Codex cannot see a capture:** begin a new Codex task after installing or
  updating the plugin.

## macOS verification status

The macOS installer, LaunchAgent definition, browser discovery paths, and shell
entrypoints are implemented. A final clean-machine smoke test on physical macOS
hardware remains required before the Devpost submission is marked ready.
