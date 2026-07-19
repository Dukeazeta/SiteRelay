---
name: inspect-capture
description: Inspect a SiteRelay browser capture when the user asks about a selected web component, section, page, font, asset, styling, or animation, or asks to reconstruct the latest item sent from the SiteRelay browser extension.
---

# Inspect a SiteRelay capture

Use SiteRelay MCP to ground every observation in the browser capture.

## Workflow

1. Call `list_captures` unless the user supplied a capture ID or explicitly requested the latest capture.
2. Call `get_capture` or `get_latest_capture` to inspect rendered DOM, computed styles, layout, fonts, assets, animations, viewport metadata, and warnings.
3. Call `get_capture_screenshot` before making visual claims or implementing a reconstruction.
4. Explain capture limitations or warnings explicitly.
5. When implementing, preserve source fidelity first. Refactor only after a visually faithful version exists.
6. Compare the implementation with the source at the captured viewport and at least one relevant responsive viewport.

## Fidelity rules

- Do not estimate a captured value when the exact value is present.
- Do not call a result identical without screenshot-based evidence.
- Keep typography metrics, animation timing, gradients, masks, and responsive behavior in scope.
- Do not copy restricted assets or fonts when capture metadata indicates that reuse is not authorized.
- Treat cross-origin iframe contents and inaccessible stylesheets as explicit capture boundaries.
