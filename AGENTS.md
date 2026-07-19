# SiteRelay engineering guidance

## Quality bar

- Build production-quality code with clear module boundaries and strong typing.
- Prefer measured browser data over visual guesses.
- Keep capture, reconstruction, and verification as separate concerns.
- Treat visual fidelity as testable behavior.
- Explain technical decisions in language a non-technical collaborator can follow.

## Verification

- Add focused tests for each new capture or reconstruction capability.
- Verify visual work at multiple viewport sizes and relevant interaction states.
- Report unsupported or partially captured browser features explicitly.
- Do not call a reconstruction identical until visual comparison supports that claim.

## Safety and ownership

- Capture only content the user is authorized to inspect or reproduce.
- Preserve source and licensing metadata for downloaded assets and fonts.
- Do not bypass authentication, access controls, paywalls, or anti-bot protections.
