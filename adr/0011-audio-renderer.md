---
id: adr-0011
type: adr
title: "Audio stem renderer: deterministic procedural placeholder"
status: accepted
version: 1.0.0
owner: hugo
created: 2026-07-18
updated: 2026-07-18
related: []
tags: [audio, m2, renderer]
---

# ADR 0011: Audio stem renderer — deterministic procedural placeholder

## Status

accepted · 2026-07-18

## Context

M2 requires producing audio stems (drone, pad) alongside MIDI files in the bundle. The M2 ship criterion requires "deterministic generation given the same seed" (per M2 spec).

We need an audio renderer that:
- Is deterministic (same seed -> same bytes)
- Runs in CI and air-gapped environments
- Has zero external dependencies
- Produces something audible (not silence, not a placeholder text file)
- Is pure (testable as a function)

## Spike: candidate comparison

| Strategy | Quality | Determinism | External deps | Cost | CI-friendly |
|---|---|---|---|---|---|
| A. Procedural (Node + DSP) | "synth demo" (usable) | yes (seeded PRNG) | none | free | yes |
| B. FFmpeg / SoX | depends on soundfont | yes if no SF2 | native binary | free | harder (native build) |
| C. Model (HeartMuLa, Suno, MusicGen) | studio | NOT by default (stochastic at temp=0) | API key, network | per-render | no (needs network + paid) |

Option A wins on determinism + zero deps + CI-friendly. The cost is "synth demo" quality, which is honest framing for a system whose role is to produce sketch material, not final masters.

## Decision

Use a **procedural renderer in pure Node** for v1. The renderer synthesizes basic oscillators (drone, pad, bass) deterministically from the spec and seed. A model-based renderer (HeartMuLa, Suno, etc.) is **deferred to v1.1 post-M2** behind the same `render` port contract.

## Consequences

Positive:
- Deterministic by construction (seeded PRNG, no randomness)
- No network, no API keys, no native bindings
- Runs identically in dev, CI, and air-gapped environments
- The v1 quality is "synthesizer demo" — usable as a sketch reference
- The port contract allows a future model-based adapter without changes elsewhere

Negative:
- Quality is not studio-grade. A composer will still want to re-record in a DAW.
- Limited synthesis: oscillators + filters + envelopes, no sampling, no physical modeling.

## Alternatives considered

- **FFmpeg / SoX**: adds a native system dependency; soundfont-dependent; harder to ship.
- **Model-based (HeartMuLa, Suno)**: not deterministic by default, requires network + API key, costs money. Deferred to v1.1.

## What this enables

- The audio stem renderer (Implementation Spec, to be written): `render(spec, sampleRate, durationSec, seed): Float32Array` then encode to WAV bytes.
- WAV is trivial to write (44-byte header + PCM). No external library needed.
- The renderer produces a few stem types:
  - `drone`: one oscillator per note of the scale, slight detune, low-pass filter
  - `pad`: same as drone but with slow attack and longer release
  - `bass`: square wave, root note only, 1/4 note pulses
- Mood bias `energy` / `complexity` / `groove` modulates filter cutoff, oscillator count, rhythm.

## Future work

- v1.1: model-based renderer adapter (HeartMuLa, Suno) behind the same `render` port. The model is invoked with `(spec, durationSec, seed)` and returns audio. Determinism requires `temperature=0` and the provider to support it. **Out of M2 scope.**
- v1.1: SF2 soundfont support for SF2-rendered MIDI (richer than pure DSP, still deterministic).
- v2.0+: integration with Live devices for in-DAW preview (M3 territory).