# SiteRelay architecture

SiteRelay is a local-first browser-to-Codex pipeline. Capture, storage,
inspection, reconstruction, and verification remain separate so each boundary
can be tested and explained independently.

```text
Chrome / Edge extension
        |
        | authenticated capture on 127.0.0.1:4319
        v
Local capture service ----> captures/ (local runtime data)
        |
        | shared capture schema
        v
SiteRelay MCP server -----> Codex plugin and inspection skill
        |
        +----> reconstruction output
        +----> headless browser render
        +----> pixel-difference report
```

## Workspace ownership

| Path | Responsibility |
| --- | --- |
| `apps/browser-extension` | Browser selection, screenshots, retry queue, popup, and capture collection |
| `apps/capture-service` | Authenticated HTTP service, storage, MCP tools, reconstruction, rendering, and comparison |
| `apps/showcase` | Original authorized demonstration and visual test target |
| `packages/capture-schema` | Versioned capture contract shared by the browser and service |
| `plugins/siterelay` | Codex plugin manifest, portable MCP launcher, and capture-inspection skill |
| `scripts` | Setup, health, startup, uninstall, and release automation |
| `docs` | Human-facing engineering and submission documentation |

## Runtime boundaries

- Browser pages cannot write captures without the private extension token.
- The service binds to localhost by default.
- Captures, downloaded assets, comparisons, logs, tokens, and reconstructions are
  local generated data and are excluded from Git.
- Asset downloads require explicit user authorization and retain provenance.
- The browser cannot extract server-side logic, closed shadow roots, protected
  iframe contents, or rights that the user does not possess.
