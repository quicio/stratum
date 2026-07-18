---
id: spec-0009
type: spec
kind: implementation
title: "Audio Stem Renderer"
status: draft
version: 0.1.0
owner: hugo
created: 2026-07-18
updated: 2026-07-18
milestone: M2
related: [spec-0005, adr-0011]
impl_progress: 0
tags: [audio, renderer, m2, dsp, wav]
---

# Spec 0009 — Audio Stem Renderer

## Vision

The default implementation of the audio stem renderer port. It produces WAV bytes for the `drone` and `pad` tracks of a `Composition` (spec-0005). The renderer is a **procedural DSP** (per adr-0011) that synthesizes basic oscillators, filters, and envelopes in pure Node.

v1 quality is "synthesizer demo" — usable as a sketch reference, not a final master. A future v1.1 spec adds a model-based adapter behind the same port.

---

## Module Structure

```
packages/audio-renderer/
  package.json             # @stratum/audio-renderer
  tsconfig.json
  tsconfig.build.json
  vitest.config.ts
  src/
    renderer.ts            # renderStem function: signature + options -> Float32Array
    wav.ts                 # encode Wav: Float32Array -> Uint8Array (44-byte header + PCM)
    oscillators.ts         # sine, saw, square primitives
    envelope.ts            # ADSR envelope
    filter.ts              # simple one-pole low-pass
    index.ts               # public exports
  tests/
    renderer.test.ts       # tests for each stem type
    wav.test.ts            # WAV byte layout
    fixtures/              # pre-computed float arrays for regression
```

The package depends on `@stratum/composition` (for `Composition` and `MusicalSignature`) only. No external API calls, no native bindings.

---

## The Render Function

```typescript
// src/renderer.ts

import type { Composition, Track } from '@stratum/composition/domain/composition';

export interface RenderOptions {
  readonly sampleRate: number;     // 48000 default
  readonly durationSec: number;    // composition.bars * 240 / bpm (one bar = 4 beats, 60s/min)
  readonly bitDepth: 16 | 24 | 32;  // 16 default
  readonly seed: string;           // for the PRNG that drives variation
}

export type StemType = 'drone' | 'pad' | 'bass';

export function renderStem(
  composition: Composition,
  trackRole: StemType,
  options: RenderOptions,
): Float32Array;
```

The renderer is **pure**: same inputs → same output (deterministic). No I/O, no environment access.

The renderer is also **stateless across calls**: a second call with the same inputs produces the same output. (The PRNG is reseeded from `options.seed` per call.)

---

## Synthesis Strategy

### Drone

- One sine oscillator per scale degree (1..7 oscillators, depending on `complexity` and `mood.bias.complexity`)
- Slight detune (1-3 cents) for chorus effect
- Low-pass filter with cutoff modulated by `mood.bias.energy` and `genre.defaults.energy`
- No attack/release; the drone is constant
- Amplitude sum normalized to 0.7 to avoid clipping

### Pad

- Same oscillators as drone
- Slow attack (0.5-2 seconds depending on `energy`)
- Long release (2-4 seconds depending on `complexity`)
- Low-pass filter
- Amplitude sum normalized to 0.6

### Bass

- Square wave (or sine if `complexity < 0.3`)
- Plays the root note (from `scale.root_pitch_class`) and the fifth, alternating every half-bar
- Filter envelope: open at note start, close over 0.3s
- Velocity derived from `energy`

The PRNG drives per-note variation: tiny pitch jitter (±2 cents), amplitude jitter (±5%), filter cutoff jitter. Same seed → same jitter.

---

## WAV Encoding

```typescript
// src/wav.ts

export function encodeWav(
  samples: Float32Array,
  sampleRate: number,
  bitDepth: 16 | 24 | 32,
): Uint8Array;
```

The encoder writes the standard 44-byte WAV header:
- `RIFF` magic (4 bytes)
- File size - 8 (4 bytes, little-endian)
- `WAVE` magic (4 bytes)
- `fmt ` chunk (24 bytes): PCM format, mono channel, sample rate, byte rate, block align, bits per sample
- `data` chunk: size header + PCM samples

For 16-bit, samples are clamped to `[-1, 1]` and converted to `Int16LE`. For 24-bit and 32-bit, similar conversion. The function is pure; no I/O.

---

## Determinism

The PRNG is `mulberry32` seeded with the SHA-256 of `(options.seed, trackRole)`. Same seed → same output. The renderer has no other source of randomness.

Tests verify:
- Same `(composition, trackRole, options)` → byte-identical WAV (100 iterations)
- Different seeds produce different outputs (sample 3 seeds, assert bytes differ)

---

## Error model

```typescript
export class RenderError extends Error {
  constructor(
    public readonly reason: 'unsupported-stem' | 'invalid-options' | 'internal',
    message: string,
  ) {
    super(message);
    this.name = 'RenderError';
  }
}
```

`unsupported-stem` is thrown when `trackRole` is not one of `'drone' | 'pad' | 'bass'` (e.g. `'drums'` or `'lead'`, which are MIDI-only).

---

## Non-Goals

- **Studio-quality audio**. v1 is "synthesizer demo". A future v1.1 spec adds a model-based adapter.
- **MIDI synthesis**. Drums and lead are MIDI tracks; the audio renderer does not produce them.
- **Effects chains beyond low-pass**. Reverb, delay, chorus would require convolutions and longer runtime. Out of scope for v1.
- **Multi-channel output**. v1 is mono. Stereo is a future spec.
- **Live device integration**. The renderer produces WAV bytes. Live integration is M3.
- **SF2 soundfont support**. A future v1.1 spec.

---

## Dependencies

- spec-0005 — Composition Engine (defines `Composition` and `Track`)
- adr-0011 — Audio stem renderer: deterministic procedural placeholder (the decision behind v1)
- @stratum/composition — the `Composition` type

---

## Acceptance Criteria

- `renderStem` function lives in `packages/audio-renderer/src/renderer.ts`.
- `renderStem` returns a `Float32Array` (PCM samples, range `[-1, 1]`).
- `encodeWav` returns a `Uint8Array` (WAV bytes with valid header).
- The renderer supports `drone`, `pad`, `bass` stem types. Other roles throw `RenderError('unsupported-stem')`.
- `RenderOptions.sampleRate` defaults to 48000; `bitDepth` defaults to 16; `durationSec` is required.
- Contract tests pass:
  - Same `(composition, trackRole, options)` → byte-identical WAV (100 iterations)
  - Different seeds → different WAV (3-sample test)
  - WAV header is valid (parseable by an off-the-shelf WAV reader)
  - `drone` output has nonzero amplitude throughout
  - `pad` output has nonzero amplitude with attack ramp
  - `bass` output has rhythmic onsets at the expected ticks
- The renderer package depends on `@stratum/composition` only. No external API calls, no native bindings.

---

## Future Work

- **v1.1 — Model-based adapter**: same port, model-based implementation. Spec deferred.
- **Effects chains**: reverb, delay, chorus. Each is a post-process on the rendered signal.
- **Multi-channel output**: stereo, surround.
- **SF2 soundfont support**: richer timbres, still deterministic.
- **Live device integration**: M3.