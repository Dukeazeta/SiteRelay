# SiteRelay

> Select anything on the web. Bring it into Codex.

SiteRelay is a browser-to-Codex capture system for inspecting and reconstructing
web components, sections, typography, animations, and complete pages with
extremely high visual fidelity.

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

## Planned system

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

## Initial milestone

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

The capture service listens only on `127.0.0.1:4319` by default. Captures are
stored in the local `captures` directory, which is excluded from Git.

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

## Current vertical slice

The first implemented slice can:

- select a rendered element with an on-page inspection outline
- collect the selected DOM and up to 2,000 descendants
- capture computed CSS, layout rectangles, typography, visible assets, and Web Animations data
- take a screenshot of the visible browser tab
- validate and persist the result locally
- list and read captures, including screenshots, through SiteRelay MCP

Responsive recapture, interaction-state orchestration, asset downloading,
reconstruction, and pixel-difference verification are the next engineering stages.
