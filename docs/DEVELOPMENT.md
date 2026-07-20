# SiteRelay development

## Requirements

- Node.js 20 or later
- pnpm 11.12.0
- Chrome or Edge 120 or later

## Workspace commands

```bash
pnpm install
pnpm check
pnpm test
pnpm build
pnpm health
```

Windows PowerShell may block command shims. Use `pnpm.cmd` when that occurs.

Run the local capture service:

```bash
pnpm dev:service
```

Run the original showcase:

```bash
pnpm dev:showcase
```

Then open `http://127.0.0.1:4321`.

## Repository conventions

- Source code belongs under `apps`, `packages`, or `plugins`.
- Cross-project documentation belongs under `docs`.
- Root-level install and uninstall files are intentional entrypoints for judges.
- Do not commit tokens, captures, comparisons, reconstructions, logs, screenshots,
  release archives, dependencies, or compiler output.
- Keep capture, reconstruction, and verification logic separate.
- Add focused tests for every new browser capture or reconstruction capability.
- Do not claim pixel-identical output without a rendered comparison.

## Release

```bash
pnpm package:release
```

The generated ZIP and SHA-256 checksum are written to `release/`, which is
excluded from Git.
