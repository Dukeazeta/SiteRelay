# SiteRelay

> Select anything on the web. Bring it into Codex.

SiteRelay is a browser-to-Codex capture system for inspecting and reconstructing
web components, sections, typography, animations, and complete pages with
extremely high visual fidelity.

SiteRelay is intended only for interfaces you own, are licensed to use, or have
permission to reproduce. Read [AUTHORIZED_USE.md](AUTHORIZED_USE.md) before
capturing third-party material.

## Install SiteRelay

SiteRelay supports Windows 10+ and macOS 13+, with Chrome or Edge 120+, Node.js
20+, pnpm 11, and Codex desktop or CLI.

Windows:

```powershell
.\install.ps1
```

macOS:

```bash
chmod +x install.sh uninstall.sh
./install.sh
```

The installer generates a local authentication token, registers the capture
service at sign-in, creates a portable local Codex marketplace, and prints the
exact unpacked-extension folder to load. See
[docs/INSTALLATION.md](docs/INSTALLATION.md) for verification, troubleshooting,
and uninstall instructions.

The Chrome or Edge extension directory is:

```text
apps/browser-extension/dist
```

## Build Week submission

SiteRelay is being prepared for OpenAI Build Week in the **Developer Tools**
track. The submission copy, evidence checklist, and under-three-minute demo plan
live in [docs/DEVPOST_SUBMISSION.md](docs/DEVPOST_SUBMISSION.md).

## Product standard

“Looks similar” is not good enough. SiteRelay should preserve and verify:

- DOM structure and semantic meaning
- computed styles, CSS variables, and layout measurements
- responsive behavior across relevant viewport sizes
- typography, including font sources, weights, axes, and fallback behavior
- images, SVGs, icons, gradients, masks, and other visible assets
- hover, focus, active, disabled, loading, and expanded states
- transitions, keyframes, easing curves, durations, and scroll-linked motion
- accessibility information and keyboard behavior
- screenshots of the selection and enough surrounding context to understand it

Every generated implementation should be compared with the source using
repeatable screenshots and visual-difference measurements. Differences must be
reported honestly rather than hidden behind a single confidence score.

## System

1. **Browser extension** — selects and captures an element, section, or page.
2. **Local capture service** — stores captures and coordinates browser data.
3. **MCP server** — exposes captures, screenshots, styles, fonts, and assets to Codex.
4. **Codex plugin** — provides inspection and reconstruction workflows.
5. **Reconstruction engine** — produces clean, reusable frontend code.
6. **Visual verification runner** — compares source and output across states and viewports.

## Fidelity principles

- Capture browser-rendered truth instead of relying only on stylesheet source.
- Preserve original measurements before attempting to simplify generated code.
- Record provenance and licensing metadata for fonts and other assets.
- Never claim to extract server code, databases, or logic unavailable to the browser.
- Never bypass authentication, access controls, anti-bot systems, or licensing restrictions.
- Separate faithful capture from later adaptation to a different brand or product.

## Core product loop

The first milestone is an end-to-end vertical slice:

1. Select one visible component in Chrome or Edge.
2. Capture its DOM, computed styles, assets, fonts, states, and screenshot.
3. Make that capture directly readable through SiteRelay MCP in Codex.
4. Reconstruct it as a runnable component.
5. Compare the result with the source at desktop and mobile widths.

## Development setup

```powershell
pnpm.cmd install
pnpm.cmd build
pnpm.cmd test
pnpm.cmd dev:service
```

Run the original authorized showcase in a second terminal:

```powershell
pnpm.cmd dev:showcase
```

Architecture, development conventions, and the complete documentation index are
available in [docs/README.md](docs/README.md).

The capture service listens only on `127.0.0.1:4319` by default. Captures are
stored in the local `captures` directory, which is excluded from Git. Capture
writes require the private token generated in `.siterelay-token`; ordinary web
pages cannot write to the service, and cross-origin requests are limited to
Chrome extension origins.

On Windows, `scripts/start-capture-service.ps1` starts the service only when it
is not already running. The development installation registers this launcher at
user sign-in so browser captures have a local destination before Codex opens.

To load the development extension in Chrome or Edge:

1. Run `pnpm.cmd build`.
2. Open the browser's extensions page and enable Developer mode.
3. Choose **Load unpacked**.
4. Select `apps/browser-extension/dist`.
5. Start the local service with `pnpm.cmd dev:service`.
6. Open a normal website, click SiteRelay, and choose **Select component**.

The local Codex plugin lives in `plugins/siterelay`. Its MCP configuration reads
the same capture directory used by the browser service.

## Current capabilities

The first implemented slice can:

- select a component or semantic section with an on-page inspection outline
- capture a viewport or complete page without element selection
- collect DOM and up to 2,000 descendants, computed CSS, geometry, pseudo-elements,
  accessibility metadata, open Shadow DOM, stylesheet rules, and design tokens
- capture exact component crops, viewport screenshots, true full-page screenshots,
  and mobile/tablet/desktop full-page references
- record named interaction states and group related states by capture name
- collect font sources, variable/font-feature settings, responsive images, masks,
  border images, inline SVG references, and Web Animations timing/keyframes
- authenticate extension-to-service writes and retry up to 20 captures locally
  when the service is unavailable
- inspect service health, queue state, and recent captures in the extension popup
- query compact summaries, nodes, typography, assets, animations, tokens, and
  stylesheet evidence without loading an entire capture into Codex
- generate a raw fidelity-first React/CSS reconstruction and standalone preview
- render reconstructions in headless Chrome and generate pixel-difference heatmaps
- download assets only after explicit authorization, with provenance, size, MIME,
  and SHA-256 records

## Browser boundaries

- Closed Shadow DOM and protected cross-origin iframe contents are not inspectable.
- Canvas and WebGL pixels are preserved in screenshots, but proprietary drawing
  code and server-side logic are not available to the browser.
- Responsive screenshots show layout at three widths; detailed computed-node
  styles describe the viewport in which the user made the capture.
- Font source discovery is limited by stylesheet CORS. A rendered font may be
  identifiable even when its protected source file is not readable.
- Full-page capture temporarily attaches Chrome's debugging protocol and detaches
  immediately afterward. Chrome may display a short-lived debugging notice.
- Generated React is deliberately a raw baseline using captured HTML. It must be
  reviewed for semantics, licensing, and maintainability after visual fidelity is proven.
