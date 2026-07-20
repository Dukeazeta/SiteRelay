# Script inventory

| Script | Purpose |
| --- | --- |
| `install.mjs` | Cross-platform setup orchestration for Windows and macOS |
| `uninstall.mjs` | Removes the deployed local marketplace and startup integration |
| `health-check.mjs` | Verifies the localhost capture-service endpoint |
| `package-release.mjs` | Creates the judge-ready ZIP and SHA-256 checksum |
| `start-capture-service.ps1` | Idempotent Windows service launcher with logs |
| `start-siterelay-at-login.cmd` | Windows sign-in compatibility launcher |

The root `install.*` and `uninstall.*` files are intentionally small,
user-facing entrypoints. Keep implementation logic in this directory.
