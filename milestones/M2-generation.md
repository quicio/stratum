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

Generate MIDI tracks and audio stems from a musical signature, without touching Live. Produces a `.stratum/` bundle per intent.

This milestone makes the vocabulary executable: given a `MusicalSignature`, Stratum produces the artifacts a composer would otherwise hand-author.

---

## Scope

### Included

* Intent parsing (natural language → partial signature)
* MIDI generation pipeline

  * Rhythm builder (kick, hat, perc from `genre.rhythm_signature`)
  * Harmony builder (chords/melody from `scale` + `genre.harmonic_density`)
  * Ornament builder (from `mood.ornamentation`)
  * Director (orchestrates builders for an intent)
* MIDI serialization (notes → `.mid` files)
* Audio stem renderer (drone, pad, FX based on `mood.effects`)
* Bundle manifest (`bundle.json`) with deterministic SHA-256 per artifact
* `stratum generate "<intent>"` CLI command

### Explicitly out of scope

* Intent Resolver port contract (spec-0006 in M1)
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

---

## Exit Criteria

The system can run `stratum generate "techno raw 139 phrygian arrakis"` and produce a self-contained `.stratum/` bundle that another tool can import without contacting Ableton.