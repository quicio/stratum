---
id: adr-0010
type: adr
title: "MIDI library: midi-writer-js"
status: accepted
version: 1.0.0
owner: hugo
created: 2026-07-18
updated: 2026-07-18
related: []
tags: [midi, m2, library]
---

# ADR 0010: MIDI library — `midi-writer-js`

## Status

accepted · 2026-07-18

## Context

M2 requires producing `.mid` files from a `Composition` (M2 spec, M2 ship criterion). The decision is binding for the MIDI port and adapter (Implementation Specs to be written under M2).

The Composition Engine produces pure data. We need a library that:
- Declares notes as data and serializes to Standard MIDI File bytes
- Supports PPQ=480 (Live 12's default)
- Is pure (no I/O, no native bindings) so it is testable in CI and runs identically everywhere
- Is ESM-native (matches the rest of the workspace)
- Is actively maintained

## Spike: candidate comparison

| Library | License | Maintenance | Module | API | PPQ control | Native bindings | Testability |
|---|---|---|---|---|---|---|---|
| `midi-writer-js` | MIT | active (2024) | ESM, dual | declarative (notes -> bytes) | yes (PPQ header, default 96, set 480) | none | pure function, byte fixtures |
| `easymidi` | MIT | dormant (2020) | CJS only | imperative (open port, send events) | not at file level (host sets it) | yes (CoreMIDI on macOS) | requires real or mocked MIDI port |
| `midi-file` (node-midi) | MIT | sporadic | CJS | low-level | yes | yes | low-level byte manipulation |

`midi-writer-js` is the only candidate that is pure, ESM, actively maintained, and exposes PPQ control. The declarative API matches the Composition Engine's output model (notes-as-data -> bytes). The zero-I/O / zero-native-binding property makes it testable in CI without mocks or system dependencies.

## Decision

Use **`midi-writer-js`** for MIDI serialization.

## Consequences

Positive:
- Declarative API matches the Composition Engine's output model
- Zero I/O during serialization → fast, deterministic, easy to test
- No native bindings → identical behavior on macOS dev / Linux CI / Windows
- PPQ=480 is configurable per file
- Active maintenance (2024)
- ESM-native, dual-published

Negative:
- Cannot stream MIDI in real time. We never wanted to.
- Cannot use system virtual MIDI ports. We don't need to.

## Alternatives considered

- **easymidi**: CJS-only, dormant (last release 2020), requires native bindings. Imperative API around virtual ports. Wrong shape for our use case.
- **midi-file** (node-midi): similar issues to easymidi.

## What this enables

- The MIDI port contract (Implementation Spec, to be written): a single function signature `serialize(composition, options): Uint8Array`.
- The MIDI adapter (Implementation Spec, to be written): thin wrapper that sets PPQ=480 and writes to disk; can include a multi-track bundle composer.
- Tests assert on `Uint8Array` byte output against fixture `.mid` files.

## Open question for M3

- We may want a separate library to **read** `.mid` files for the M3 FileAdapter (Live can also export MIDI). For writing, midi-writer-js is enough. For reading, we can use `midi-parser-js` if needed. Flag for M3 spike.
