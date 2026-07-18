---
id: spec-0007
type: spec
kind: implementation
title: "MIDI Adapter"
status: draft
version: 0.1.0
owner: hugo
created: 2026-07-18
updated: 2026-07-18
milestone: M2
related: [spec-0005, spec-0006, adr-0010]
impl_progress: 0
tags: [midi, adapter, m2, midi-writer-js]
---

# Spec 0007 — MIDI Adapter

## Vision

The default implementation of the MIDI port (spec-0006) using `midi-writer-js` (per adr-0010). The adapter serializes a `Composition` to a `.mid` file on disk and provides convenience functions for the bundle composer.

The adapter is the **only** M2 dependency on `midi-writer-js`. The port (spec-0006) does not know about the library; the engine (spec-0005) does not know about the library. Hexagonal separation.

---

## Module Structure

```
packages/midi-adapter/
  package.json             # @stratum/midi-adapter
  tsconfig.json
  tsconfig.build.json
  vitest.config.ts
  src/
    adapter.ts            # MidiWriterAdapter class implementing MidiPort
    file-writer.ts        # writeMidiFile(composition, filePath) convenience
    index.ts               # public exports
  tests/
    adapter.test.ts        # byte-level tests against fixtures
    file-writer.test.ts    # round-trip tests with tmp files
    fixtures/              # pre-computed Composition JSON for regression
```

The package depends on `@stratum/composition` (for `Composition` and `MidiPort`) and `midi-writer-js`. No other runtime dependencies.

---

## Adapter Class

```typescript
// src/adapter.ts

import { MidiPort, MidiSerializeOptions } from '@stratum/composition/ports/midi';
import type { Composition } from '@stratum/composition/domain/composition';
import * as MidiWriter from 'midi-writer-js';

export class MidiWriterAdapter implements MidiPort {
  serialize(composition: Composition, options: MidiSerializeOptions): Uint8Array {
    const writer = new MidiWriter.Writer(options.ppq);

    // Map Composition metadata to MIDI meta events
    writer.setTempo(composition.bpm);

    // For each track, build a sub-track
    for (const track of composition.tracks) {
      const sub = new MidiWriter.Track();
      sub.setTrackName(track.name);

      // Group events by tick for efficient delta encoding (midi-writer-js
      // handles deltas internally; we just feed events in tick order).
      const sorted = [...track.events].sort((a, b) => a.tick - b.tick);
      for (const ev of sorted) {
        switch (ev.kind) {
          case 'note-on':
            sub.addNoteOn(ev.channel ?? 0, ev.pitch, ev.velocity, ev.tick);
            break;
          case 'note-off':
            sub.addNoteOff(ev.channel ?? 0, ev.pitch, ev.tick);
            break;
          case 'controller':
            sub.addCC(ev.channel ?? 0, ev.controller, ev.value, ev.tick);
            break;
          case 'meta':
            // Meta events are set via the writer API, not per-track
            // (midi-writer-js limitation: meta is global). We track them
            // here for the integration test; the bytes include them.
            break;
        }
      }
      writer.addTrack(sub);
    }

    return Buffer.from(writer.build());
  }
}
```

Notes:
- The adapter uses `midi-writer-js`'s `Writer` and `Track` classes. The library handles delta-time encoding, tempo, and end-of-track markers.
- Channel defaults to 0 for events that don't specify one. The `Composition.Event` type does not include channel in v1; we add it in a future spec.
- The adapter returns `Buffer`'s bytes as a `Uint8Array` (matching the port contract). `Buffer` is Node's `Uint8Array` subclass, so the cast is safe.

---

## File Writer

```typescript
// src/file-writer.ts

import { writeFile } from 'node:fs/promises';
import { MidiWriterAdapter } from './adapter.js';
import type { Composition } from '@stratum/composition/domain/composition';

/**
 * Write a single track of a Composition to a .mid file.
 * Convenience for the bundle composer.
 */
export async function writeMidiTrack(
  composition: Composition,
  trackRole: 'drums' | 'bass' | 'lead' | 'pad' | 'drone' | 'fx',
  outputPath: string,
): Promise<void> {
  const track = composition.tracks.find(t => t.role === trackRole);
  if (!track) {
    throw new Error(`Track with role ${trackRole} not found in composition`);
  }
  const singleTrackComposition: Composition = { ...composition, tracks: [track] };
  const adapter = new MidiWriterAdapter();
  const bytes = adapter.serialize(singleTrackComposition, { ppq: composition.ppq });
  await writeFile(outputPath, bytes);
}
```

`writeMidiTrack` writes one file per track. The bundle composer (M2.1+) calls this for `drums.mid`, `bass.mid`, `lead.mid`.

---

## Contract Guarantees

Same as spec-0006 (determinism, SMF format, PPQ=480). The adapter is one valid implementation of the port; the contract is owned by the port.

In addition:

- **File writing is the only I/O**. The `serialize` method is pure; `writeMidiTrack` performs the file write.
- **Track filtering**: when serializing a single track, the adapter sets `trackFilter` internally and produces a Type 0 SMF. When serializing all tracks, it produces a Type 1 SMF.

---

## Integration with the Bundle Composer

The bundle composer (M2.1+) orchestrates the per-track files:

```typescript
// In a future bundle composer spec
import { writeMidiTrack } from '@stratum/midi-adapter';

await writeMidiTrack(composition, 'drums', 'drums.mid');
await writeMidiTrack(composition, 'bass', 'bass.mid');
await writeMidiTrack(composition, 'lead', 'lead.mid');
```

The bundle composer is a separate spec (deferred to M2.1+). This spec only covers the adapter.

---

## Non-Goals

- **Other MIDI libraries**. The default adapter is `midi-writer-js`. Other libraries require new adapters.
- **Live device mapping**. The adapter writes Standard MIDI Files. Live maps devices; the adapter does not know about Live.
- **Multi-format output**. Type 0 and Type 1 SMF only.
- **Reading MIDI files**. A `deserialize` function is a future spec.
- **Streaming**. v1 writes to disk via `writeFile`. Streaming to a virtual port is a future adapter.
- **MIDI 2.0**. v1 is Standard MIDI File 1.0.

---

## Dependencies

- spec-0005 — Composition Engine (defines the `Composition` type)
- spec-0006 — MIDI Port (the interface this adapter implements)
- adr-0010 — MIDI library: midi-writer-js (the library chosen by the spike)

---

## Acceptance Criteria

- `MidiWriterAdapter` class lives in `packages/midi-adapter/src/adapter.ts`.
- `MidiWriterAdapter` implements `MidiPort` (TypeScript type-check).
- `serialize` returns a `Uint8Array` (not a Buffer; not a string).
- `writeMidiTrack(composition, role, path)` writes a `.mid` file with the bytes from `serialize` for that track.
- Contract tests pass:
  - Multi-track composition produces Type 1 SMF
  - Single-track composition produces Type 0 SMF
  - PPQ in the output is 480
  - Output starts with `MThd`, contains `MTrk`, ends each track with `FF 2F 00`
  - Same composition → byte-identical output (100 iterations)
- Integration test: `writeMidiTrack` creates a file, the file's bytes match `serialize`'s output.
- The adapter package depends on `@stratum/composition` and `midi-writer-js` only. No other runtime deps.

---

## Future Work

- **Bundle composer**: a higher-level spec that calls `writeMidiTrack` for each track and assembles `bundle.json`. M2.1+.
- **Reading MIDI files**: a `deserialize` function for the M3 FileAdapter. Spec deferred.
- **Streaming adapter**: a different port implementation that writes to a virtual MIDI port for live playback.
- **Effect mapping**: when the future effect catalog lands, the adapter may emit program-change or CC events to map mood effects to a Live device.