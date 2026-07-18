---
id: M2
type: milestone
title: "Generation"
status: planned
version: 0.1.0
owner: hugo
created: 2026-07-18
updated: 2026-07-18
related: []
tags: [m2, generation]
---

# Milestone M2 — Generation

## Goal

Generate MIDI tracks and audio stems from a `MusicalSignature`, without touching Live. Produces a `.stratum/` bundle per intent.

This milestone makes the vocabulary executable: given a signature, Stratum produces the artifacts a composer would otherwise hand-author.

M2 has three internal layers, each with its own spec(s):

1. **Composition Engine** (spec-0005) — consumes a `MusicalSignature`, produces a `Composition` (a structured intermediate representation of a piece: tracks, events, sections).
2. **Ports** (spec-0004 Intent Resolver Port, spec-0006 MIDI Port) — interfaces only. No implementation, no I/O.
3. **Adapters** (spec-0007 MIDI Adapter, spec-0008 Intent Resolver Adapters, spec-0009 Audio Stem Renderer) — concrete implementations of ports.

The separation matters: the engine knows nothing about MIDI files or Ableton; adapters know nothing about signatures or vocabulary.

---

## Scope

### Included

* Intent parsing (natural language → partial signature) — via the Intent Resolver port
* Composition Engine

  * Rhythm builder (kick, hat, perc from `genre.rhythm_signature`)
  * Harmony builder (notes/melody from `scale` + `genre.harmonic_density`)
  * Ornament builder (from `mood.ornamentation`)
  * Director (orchestrates builders for a signature)
* MIDI serialization (Composition → `.mid` files via the MIDI adapter)
* Audio stem renderer (drone, pad, FX based on `mood.effects`)
* Bundle manifest (`bundle.json`) with deterministic SHA-256 per artifact
* `stratum generate "<intent>"` CLI command

### Explicitly out of scope

* Live integration (M3)
* Audio mastering or final mix
* Multi-track arrangement beyond the bundle's named stems
* Stem processing that depends on Live device parameter mapping

---

## Pre-M2 Mandatory Spikes

These must complete and merge before any M2 implementation code is written.

| Spike ID | Title | Required ADR | Deliverable |
|---|---|---|---|
| spec-0010-a | MIDI library selection: `midi-writer-js` vs `easymidi` | adr-0010-midi-library.md | Locked library choice + reason the rejected option loses |
| spec-0011-a | Audio stem renderer feasibility: render (FFmpeg / SoX / node) vs model (HeartMuLa / Suno) | adr-0011-audio-renderer.md | Locked renderer choice OR explicit decision to ship a deterministic placeholder first and gate real audio on a second spike |

---

## Definition of Done

### Generation

* `stratum generate "<intent>"` produces a `.stratum/` directory.
* Bundle contains `bundle.json` plus `drums.mid`, `bass.mid`, `lead.mid`, `drone.wav`, `pad.wav`.
* Generation is deterministic given the same seed.
* Bundle manifest declares: schema version, intent (scale/genre/mood + BPM), seed, MIDI PPQ, length in bars, key signature, tempo, sample rate, bit depth, per-track role, SHA-256 of every binary artifact.

### Layer separation

* Composition Engine depends on no I/O, no port, no adapter implementation. It is testable in isolation.
* MIDI Port is an interface. The Composition Engine never imports a concrete MIDI library directly.
* Audio Stem Renderer is an adapter with bounded resource policy.
* Intent Resolver Port is an interface. Adapters (rule-based, LLM-based, ...) implement it.

### Interface

* Generation accepts a valid `MusicalSignature` (from M1) as input.
* Generation returns a manifest + artifact paths.
* No Live integration in the generation path (pure offline).

### Testing

Unit tests cover:

* Each builder produces a valid output for a known signature.
* Director produces a complete bundle for representative intents.
* Bundle manifest SHA-256 matches actual artifacts.
* Determinism: same seed produces byte-identical artifacts.
* Composition Engine tests do not import any adapter implementation.
* Adapter contract tests (mocked port) verify behavior independently of the engine.

---

## Exit Criteria

The system can run `stratum generate "techno raw 139 phrygian arrakis"` and produce a self-contained `.stratum/` bundle that another tool can import without contacting Ableton. The Composition Engine and the MIDI adapter are independently testable; the Intent Resolver can be swapped (rule-based vs LLM-based) without engine changes.