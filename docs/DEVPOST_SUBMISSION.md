# SiteRelay — OpenAI Build Week submission draft

## Category

Developer Tools

## One-line pitch

Select any authorized web interface and relay its browser-rendered truth to
Codex, including structure, computed styling, typography, assets, responsive
references, states, and motion.

## Problem

Screenshots show appearance but hide implementation evidence. Browser developer
tools expose evidence but make it difficult to package and discuss with an AI
coding agent. Developers lose time manually describing the exact component,
font, responsive behavior, or animation they want Codex to understand.

## Solution

SiteRelay connects a precise browser capture to Codex through an authenticated
local service and MCP plugin. Codex can inspect focused parts of a capture,
generate a fidelity-first React reconstruction, render it, and compare the
result against the original with a pixel-difference heatmap.

## What makes it different

- Captures computed browser truth, not a screenshot alone.
- Keeps large evidence locally and gives Codex focused query tools.
- Treats fidelity as measurable through rendered comparisons.
- Records limitations and asset provenance rather than hiding uncertainty.
- Requires explicit authorization before downloading fonts or assets.

## How Codex contributed

Before submission, replace this section with a factual narrative covering:

1. Where Codex accelerated architecture, implementation, tests, and debugging.
2. Which product, engineering, and design decisions remained human decisions.
3. The verified work performed with GPT-5.6.
4. The `/feedback` Session ID for the task containing most core development.

Do not claim GPT-5.6 usage until the corresponding task or log is verified.

## Required evidence checklist

- [ ] Public repository or private access for both judging addresses
- [ ] Release ZIP or equivalent functioning test build
- [ ] Windows installation verified on a clean account
- [ ] macOS installation verified on a real Mac
- [ ] Public YouTube demo under three minutes
- [ ] Demo contains audio and no unlicensed music or third-party trademarks
- [ ] Demo explains both Codex and verified GPT-5.6 usage
- [ ] `/feedback` Codex Session ID recorded
- [ ] Repository and video URLs tested in a signed-out browser
- [ ] Submission text and test instructions are in English

## Three-minute demo outline

**0:00–0:20 — Problem and promise**

Show the original SiteRelay showcase and explain that screenshots cannot convey
DOM, computed CSS, fonts, responsive states, or animation to a coding agent.

**0:20–1:05 — Capture**

Open SiteRelay, confirm authorized asset use for the original showcase, select
the signal-card component, and capture its default and hover states. Briefly
show capture history and local-only status.

**1:05–1:55 — Codex inspection and reconstruction**

Ask Codex what was captured. Show focused typography and animation evidence,
generate the React reconstruction, and open its rendered preview.

**1:55–2:30 — Verification**

Show source and reconstruction alongside the pixel-difference heatmap. State
the measured result honestly and mention browser limitations.

**2:30–2:55 — Technical implementation and impact**

Show the browser extension, authenticated local service, MCP tools, and explain
how Codex and verified GPT-5.6 work contributed.

**2:55–3:00 — Close**

“SiteRelay lets the browser show Codex exactly what you mean.”
