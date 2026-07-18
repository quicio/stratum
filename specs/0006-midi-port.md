---
id: spec-0006
type: spec
kind: implementation
title: "MIDI Port"
status: draft
version: 0.1.0
owner: hugo
created: 2026-07-18
updated: 2026-07-18
milestone: M2
related: [spec-0005, spec-0007]
impl_progress: 0
tags: [midi, port, m2]
---

# Spec 0006 — MIDI Port

## Vision

Define the TypeScript contract for the MIDI port. The port serializes a `Composition` (spec-0005) into Standard MIDI File bytes. Adapters (spec-0007) implement this port and write to disk; future adapters may stream to a virtual port.

The port is the boundary between the engine's `Composition` (pure data) and any concrete MIDI representation (bytes, ports, libraries). It owns serialization, not transport.

---

## Module Structure

```
packages/composition/src/ports/
  midi.ts              # MidiPort interface + serialize function
  index.ts             # re-exports

packages/composition/tests/ports/
  midi.test.ts         # contract tests with a fake implementation
```

The port lives in the `composition` package because it consumes `Composition`. Adapters live in their own packages (e.g. `packages/midi-writer-adapter`).

---

## Port Contract

```typescript
// src/ports/midi.ts

import type { Composition, Track } from '../domain/composition.js';

export interface MidiSerializeOptions {
  /** Ticks per quarter note. The engine uses 480; this is fixed. */
  readonly ppq: 480;

  /**
   * Optional track filter. If absent, all tracks are serialized.
   * Used by the adapter to write one .mid file per track.
   */
  readonly trackFilter?: (track: Track) => boolean;
}

export interface MidiPort {
  /**
   * Serialize a Composition (or a subset of its tracks) to a Standard
   * MIDI File. Returns the raw bytes (Uint8Array) — the port does
   * not perform I/O. Callers write the bytes to disk or to a port.
   *
   * The output is a Type 1 MIDI file (multi-track) when the input has
   * more than one track, or a Type 0 file (single track) when the
   * input has exactly one. The format choice is the port's decision;
   * the caller does not specify.
   */
  serialize(composition: Composition, options: MidiSerializeOptions): Uint8Array;
}

/**
 * Free function form for one-off use. Adapters may export this in
 * addition to the class form.
 */
export type MidiSerializer = (
  composition: Composition,
  options: MidiSerializeOptions,
) => Uint8Array;
```

The port is a pure function. The bytes are the only output. No I/O, no logging, no side effects.

---

## Contract Guarantees

- **Determinism**: Same `Composition` + same `options` → byte-identical output. The port is a pure function.

- **Standard MIDI File format**: The output is a valid Standard MIDI File. Specifically:
  - Header chunk `MThd` with `MThd` magic, length 6, format 0/1, number of tracks, division (PPQ)
  - One or more track chunks `MTrk` with the right magic, length-prefixed, terminated with `FF 2F 00` (end of track)
  - Note-on velocity 1..127, note-off velocity 0 (or matched note-on with velocity 0)

- **PPQ=480**: The output division is 480 ticks per quarter note (Live 12's default). The port rejects other PPQ values at the type level.

- **Per-track output**: A `trackFilter` lets the adapter write one `.mid` file per track. The bundle composer calls `serialize` once per track.

- **Determinism over multiple calls**: Repeating `serialize` with the same inputs produces byte-identical output. No clock-dependent behavior.

---

## Integration with the Adapter

The adapter (spec-0007) implements this port using `midi-writer-js` (per adr-0010). The adapter:

1. Receives a `Composition` (or a single `Track` from the bundle composer)
2. Maps `NoteEvent` → MIDI note-on / note-off
3. Maps `ControllerEvent` → MIDI CC
4. Maps `MetaEvent` → MIDI meta (tempo, time signature, track name)
5. Calls the library to produce bytes
6. Writes the bytes to disk (this is the adapter's I/O, not the port's)

The port does not know about the library. The adapter does. The port is testable with a fake that returns a hand-built byte array; the adapter is testable with the real library.

---

## Non-Goals

- **Library choice**. The port does not know whether the implementation uses `midi-writer-js`, `easymidi`, or hand-written bytes. The library is the adapter's choice (constrained by adr-0010 for the default adapter).
- **File I/O**. The port returns bytes; the adapter writes them.
- **Transport**. Streaming to a virtual MIDI port is a future adapter.
- **MIDI 2.0**. v1 is Standard MIDI File 1.0.
- **SysEx**. Out of scope for v1.
- **Multi-format output**. v1 produces Type 0 or Type 1 SMF only.
- **Per-event metadata**. The port does not embed per-event metadata; if needed, it goes in the bundle manifest, not the bytes.

---

## Dependencies

- spec-0005 — Composition Engine (defines the `Composition` type the port consumes)
- spec-0007 — MIDI Adapter (implements this port; uses `midi-writer-js` per adr-0010)
- adr-0001 — Hexagonal Architecture (the port is the boundary)
- adr-0010 — MIDI library: midi-writer-js (the default adapter's library)

---

## Acceptance Criteria

- `MidiPort` interface lives in `packages/composition/src/ports/midi.ts`.
- `MidiSerializeOptions` declares `ppq: 480` as a literal type, not a generic number.
- `serialize` returns a `Uint8Array` (not a Buffer; not a string).
- Contract tests with a fake implementation:
  - Same composition + same options → byte-identical output (100 iterations)
  - Output starts with `MThd` magic (bytes 0..3 are `0x4d 0x54 0x68 0x64`)
  - Output contains at least one `MTrk` chunk (bytes `0x4d 0x54 0x72 0x6b`)
  - Each track chunk ends with `0xff 0x2f 0x00` (end of track)
  - Multi-track composition produces Type 1 SMF; single-track produces Type 0
  - PPQ in the output is 480
- No I/O, no logging, no environment access in the port module.

---

## Future Work

- **spec-0007** — MIDI Adapter (default implementation using `midi-writer-js`).
- **Streaming adapter**: write to a virtual MIDI port for live playback. Out of M2 scope.
- **MIDI 2.0**: future spec.
- **Reading MIDI files**: needed for the M3 FileAdapter (Live can export MIDI). A `deserialize` function in a future spec.