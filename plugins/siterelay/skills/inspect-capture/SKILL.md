---
name: inspect-capture
description: Inspect a SiteRelay browser capture when the user asks about a selected web component, section, page, font, asset, styling, or animation, or asks to reconstruct the latest item sent from the SiteRelay browser extension.
---

# Inspect a SiteRelay capture

Use SiteRelay MCP to ground every observation in the browser capture.

## Workflow

1. Call `list_captures` unless the user supplied a capture ID or explicitly requested the latest capture.
2. Prefer `get_capture_summary` before loading large capture data. Read its warnings and limitations aloud when they affect the request.
3. Use the narrowest MCP tool that answers the question: `get_capture_node`, `search_capture`, typography, assets, animations, design tokens, or stylesheet rules.
4. Call `get_capture_screenshot` before making visual claims or implementing a reconstruction. For full-page work, inspect relevant mobile, tablet, and desktop references with `get_responsive_screenshot`.
5. Use `get_capture` only when the complete capture is genuinely required.
6. When implementing, preserve source fidelity first. Use `generate_react_reconstruction` for the raw baseline, then refactor only after visual verification.
7. Use `verify_reconstruction` or `compare_capture_to_screenshot` and inspect the heatmap. Report geometry, typography, color, asset, responsive, and motion discrepancies separately.
8. Call `download_capture_assets` only after the user explicitly confirms authorization to reuse those assets. Preserve the generated provenance manifest.

## Fidelity rules

- Do not estimate a captured value when the exact value is present.
- Do not call a result identical without screenshot-based evidence.
- Do not compress fidelity into one misleading score; pair metrics with the difference image and known capture limitations.
- Keep typography metrics, animation timing, gradients, masks, and responsive behavior in scope.
- Do not copy restricted assets or fonts when capture metadata indicates that reuse is not authorized.
- Treat cross-origin iframe contents and inaccessible stylesheets as explicit capture boundaries.
