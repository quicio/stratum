---
id: spec-0005
type: spec
kind: implementation
title: "Composition Engine"
status: draft
version: 0.1.0
owner: hugo
created: 2026-07-18
updated: 2026-07-18
milestone: M2
related: [spec-0001, spec-0003]
impl_progress: 0
tags: [composition, engine, m2, domain, typescript]
---

# Spec 0005 — Composition Engine

## Vision

The Composition Engine consumes a validated `MusicalSignature` (spec-0001 / spec-0003) and produces a `Composition`: a structured, deterministic, language-agnostic representation of a piece of music ready to be rendered into MIDI, audio stems, and a bundle manifest.

The engine is **pure**: no I/O, no port implementations, no adapter calls. It takes a signature and a seed, and returns a Composition. The adapters (spec-0007 MIDI, spec-0009 Audio) consume the Composition.

The engine is the heart of M2. Everything else in M2 is an adapter that takes its output and writes bytes.

---

## Module Structure

The engine lives in a new workspace package, separate from `@stratum/vocabulary`, because it depends on a deterministic PRNG (for repeatable rhythm/ornament variation) and a small amount of internal state that does not belong in the domain types.

```
packages/composition/
  package.json
  tsconfig.json
  tsconfig.build.json
  vitest.config.ts
  src/
    domain/
      composition.ts        # Composition type, Track type, Event type
    engine/
      signature-factory.ts  # factory: signature + seed -> Composition
      rhythm-builder.ts      # per-genre rhythm patterns
      harmony-builder.ts     # per-scale note generation
      ornament-builder.ts    # per-mood ornamentation
      director.ts            # orchestrates the three builders
      prng.ts                # seeded PRNG (mulberry32 or similar)
      index.ts               # public exports
  tests/
    signature-factory.test.ts
    rhythm-builder.test.ts
    harmony-builder.test.ts
    ornament-builder.test.ts
    director.test.ts
    fixtures/                # optional: pre-computed compositions for regression
```

`packages/composition/` depends on `@stratum/vocabulary` (for the `MusicalSignature` type and the `VocabularyRepository`) and on a seeded PRNG. No other runtime dependencies.

---

## Domain: the `Composition` Type

```typescript
// src/domain/composition.ts

export type EventKind = 'note-on' | 'note-off' | 'controller' | 'meta';

export interface NoteEvent {
  readonly kind: 'note-on' | 'note-off';
  readonly pitch: number;          // MIDI note number 0..127
  readonly velocity: number;       // 1..127
  readonly tick: number;           // absolute tick in the composition's PPQ
}

export interface ControllerEvent {
  readonly kind: 'controller';
  readonly controller: number;     // CC number 0..127
  readonly value: number;          // 0..127
  readonly tick: number;
}

export interface MetaEvent {
  readonly kind: 'meta';
  readonly meta: 'tempo' | 'time-signature' | 'track-name' | 'end-of-track';
  readonly value: string | number;
  readonly tick: number;
}

export type Event = NoteEvent | ControllerEvent | MetaEvent;

export type TrackRole = 'drums' | 'bass' | 'lead' | 'pad' | 'drone' | 'fx';

export interface Track {
  readonly role: TrackRole;
  readonly name: string;
  readonly events: readonly Event[];
}

export interface Composition {
  readonly schema_version: '1.0';
  readonly intent: {              // what the user asked for
    readonly scale_name: string;
    readonly scale_root_pitch_class: number;
    readonly genre_name: string;
    readonly mood_name: string;
    readonly tempo: number;        // the resolved tempo (after clamping)
    readonly bars: number;         // 4..256, default 16
  };
  readonly seed: string;           // hex PRNG seed
  readonly bpm: number;            // resolved BPM
  readonly ppq: number;            // 480 (Live 12 default)
  readonly sample_rate: number;    // 48000
  readonly bit_depth: 16 | 24 | 32; // default 16
  readonly tracks: readonly Track[];
  readonly metadata: {
    readonly generated_at: string;     // ISO 8601
    readonly generator_version: string; // package.json version
    readonly signature_provenance: {    // for verification
      readonly scale: 'user' | 'resolver' | 'baseline';
      readonly genre: 'user' | 'resolver' | 'baseline';
      readonly mood: 'user' | 'resolver' | 'baseline';
      readonly performance: 'user' | 'resolver' | 'baseline';
    };
  };
}
```

The `Composition` is the contract between the engine and every adapter. Adapters read this type and produce bytes.

---

## Engine: from Signature to Composition

### Entry point

```typescript
// src/engine/signature-factory.ts

export interface EngineOptions {
  readonly bars: number;       // default 16, range 4..256
  readonly seed?: string;      // hex; auto-generated if absent
}

export function compose(
  signature: MusicalSignature,
  options: EngineOptions = { bars: 16 },
): Composition;
```

`compose` is a pure function. The `seed` is part of the bundle manifest so the same `(signature, seed)` always produces the same `Composition`. The engine does not call any I/O; the caller (the bundle composer) writes the result to disk.

### Director

The director orchestrates three builders:

```typescript
// src/engine/director.ts

interface DirectorContext {
  readonly signature: MusicalSignature;
  readonly bars: number;
  readonly prng: SeededPrng;
  readonly bpm: number;          // resolved (post-clamp)
  readonly ppq: number;          // 480
  readonly ticksPerBar: number;  // ppq * 4 (4/4 time)
}

function buildDrums(ctx: DirectorContext): Track;
function buildBass(ctx: DirectorContext): Track;
function buildLead(ctx: DirectorContext): Track;
function buildPad(ctx: DirectorContext): Track;
function buildDrone(ctx: DirectorContext): Track;

function director(ctx: DirectorContext): readonly Track[];
```

The director returns a fixed set of tracks in a fixed order: `[drums, bass, lead, pad, drone]`. The bundle composer maps these to the M2 stem filenames (`drums.mid`, `bass.mid`, `lead.mid`, `pad.wav`, `drone.wav`).

### Builders

Each builder consumes a `DirectorContext` and returns a `Track`. The builders are pure: same context → same track.

**Rhythm builder (`buildDrums`)**: generates kick / hat / percussion patterns based on `genre.rhythm_signature` (e.g. `four-on-the-floor` → kick on every beat, hat on off-beats, occasional snare on 2 and 4). Velocity is modulated by `performance.energy`. Variation is driven by the seeded PRNG.

**Harmony builder (`buildBass`, `buildLead`)**: generates bass and lead notes from `scale.intervals` rooted at `scale.root_pitch_class`. Phrasing depends on `genre.harmonic_density` (`low` → sparse; `medium` → walking; `high` → busy). The bass plays the root, the lead plays the scale in a motif.

**Ornament builder (`buildPad`, `buildDrone`)**: `buildDrone` plays a sustained chord on the tonic with fifth and octave. `buildPad` plays the same chord with a slow attack and long release, modulated by `mood.effects` (effects are applied as filter and envelope hints in the audio renderer, not as MIDI events in this version). Mood `bias.complexity` controls the chord richness.

### Tempo clamping

The factory's `signature.performance.tempo` is already clamped to the genre range (spec-0003). The engine consumes the clamped value and uses it for `bpm` in the Composition. No further clamping in the engine.

---

## Determinism and the PRNG

The engine uses a **seeded PRNG** (mulberry32 or similar; the implementation choice is open). Same `seed` → same `Composition` byte-for-byte. Different `seed` → different but valid `Composition`.

The PRNG is consumed in this order:
1. Rhythm builder uses it for variation (kick velocity, hat pattern jitter)
2. Harmony builder uses it for motif selection (which scale degrees to use in the lead)
3. Ornament builder uses it for chord voicing variations

The `seed` is included in the `Composition.metadata` so the bundle manifest can verify reproducibility.

---

## BPM, bars, and PPQ

- **BPM**: taken from `signature.performance.tempo.value`. Already clamped by the factory.
- **Bars**: `options.bars`, default 16, range 4..256. The engine raises `EngineError` if out of range.
- **PPQ**: fixed at 480 (Live 12's default). The engine does not accept a different PPQ in v1; if a future spec requires it, this is a non-breaking addition.

Total ticks: `bars * 4 * ppq` (4/4 time signature). For 16 bars at PPQ=480, that is `16 * 4 * 480 = 30,720` ticks.

---

## Edge cases

- **Empty track role**: a builder may return an empty `events: []` track if the role is not appropriate (e.g. `pad` is silent for a `drone`-only mood). The bundle composer still writes the file; it is just silence.
- **Tempo at the lower/upper bound**: handled by the factory (clamp + warning). The engine does not re-check.
- **Seed format**: `seed` is a hex string of arbitrary length. The engine hashes it to 32 bits before seeding the PRNG. An invalid hex string is an `EngineError`.

---

## Error model

```typescript
// src/engine/signature-factory.ts

export class EngineError extends Error {
  constructor(
    public readonly reason: 'invalid-bars' | 'invalid-seed' | 'internal',
    message: string,
  ) {
    super(message);
    this.name = 'EngineError';
  }
}
```

The engine does not catch or wrap errors. Errors propagate to the caller (the bundle composer in M2.1+).

---

## Non-Goals

- **Adapter code**. The MIDI port (spec-0006), MIDI adapter (spec-0007), audio stem renderer (spec-0009), and bundle composer are separate specs. The engine does not import any of them.
- **Vocabulary expansion**. The engine does not add new scales, genres, or moods. It selects from the loaded `VocabularyRepository`.
- **Live integration**. The engine has no concept of Ableton, OSC, or Live devices.
- **Streaming**. The engine returns a single `Composition`; partial updates are out of scope.
- **Multi-track effects chains beyond the five fixed roles**. The engine produces drums, bass, lead, pad, drone. No synths, no arpeggiators, no custom plugins.
- **MIDI export**. The engine produces `Event[]` per track. Serialization to `.mid` is the adapter's job (spec-0007).
- **Audio synthesis**. The engine produces `Composition`. Audio rendering is the audio adapter's job (spec-0009).
- **Real-time scheduling**. The engine is not a sequencer. It produces a static score; playback is downstream.

---

## Dependencies

- spec-0001 — Musical Vocabulary & Signature Schema (Domain Spec: vocabulary, performance, validation)
- spec-0003 — SignatureFactory and Domain Types (consumes the validated `MusicalSignature` and its provenance)
- spec-0006 — MIDI Port (the engine's output is consumed by the MIDI adapter via the MIDI port)
- spec-0009 — Audio Stem Renderer (consumes the engine's output for audio stems)
- adr-0001 — Hexagonal Architecture (the engine is the core of M2; ports are its boundary)

---

## Acceptance Criteria

- `Composition` type is defined in `packages/composition/src/domain/composition.ts` with the exact fields above.
- `compose(signature, options)` is a pure function in `packages/composition/src/engine/signature-factory.ts`.
- `bars` defaults to 16, range 4..256; out-of-range throws `EngineError('invalid-bars')`.
- `seed` is optional, auto-generated if absent, hashed to 32 bits internally; invalid hex throws `EngineError('invalid-seed')`.
- Same `(signature, seed)` produces byte-identical `Composition` (test: 100 iterations).
- Different seeds produce different but valid compositions (test: sample three seeds, assert events differ).
- The director produces five tracks in the order `[drums, bass, lead, pad, drone]`.
- Each builder is a pure function of its `DirectorContext` (test: same context → same track).
- `bpm` in the Composition equals `signature.performance.tempo.value`.
- `ppq` is 480 in every Composition.
- `intent` in the Composition is a faithful snapshot of the input signature (scale_name, scale_root_pitch_class, genre_name, mood_name, tempo, bars).
- `metadata.signature_provenance` reflects the per-source labels from the signature.
- No I/O, no port imports, no adapter imports in the engine module.
- Unit tests cover: each builder in isolation, the director's full pipeline, determinism, edge cases.

---

## Future Work

- **Other rhythm signatures**: `breakbeat`, `half-time`, `polyrhythm` are currently undefined in spec-0001. The engine handles them as `unknown rhythm_signature` errors. A future spec adds a `rhythm_signature` catalog.
- **MIDI port and adapter**: spec-0006 / spec-0007.
- **Audio stem renderer**: spec-0009.
- **Bundle composer**: a higher-level function that calls `compose`, runs the MIDI adapter on each track, runs the audio adapter for the audio tracks, and writes a `bundle.json` manifest. M2.1+; out of scope here.
- **Effect catalog**: `Mood.effects` is opaque strings in v1. A future spec defines a catalog of effect identifiers and their mappings.