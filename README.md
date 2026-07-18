# Stratum

Hexagonal bridge between Ableton Live 12 and a generative music vocabulary.

## What

Describe musical intent in Spanish; Stratum produces MIDI + audio stems and pushes them into specific racks/channels of a running Live set.

Example:
```
stratum generate \"percusión techno raw 139 BPM, lead Arrakis en frigio\"
stratum push --target drums --rack \"BD-909\" --channel 3
```

## How (architecture)

Three strata, hexagonal boundaries:

1. **vocabulary** — YAML-defined scales, genres, moods (Strategy pattern)
2. **generation** — Builder + Director → MIDI tracks + audio stems
3. **live-bridge** — pure domain + ports + adapters (OSC, MCP, M4L, .als file)

See `docs/architecture.md`.

## Status

```bash
pnpm status    # dashboard of specs, ADRs, milestones, tasks
```

## Development

```bash
pnpm install
pnpm test       # all packages
pnpm typecheck
pnpm status     # see project dashboard
```

## Specs / ADRs

All design lives in `specs/`, `adr/`, `milestones/`, `tasks/`. Standardized frontmatter; see `specs/_template.md`.