---
id: M1
type: milestone
title: "Musical Vocabulary"
status: active
version: 0.1.0
owner: hugo
created: 2026-07-18
updated: 2026-07-18
related: [spec-0001]
tags: [m1, vocabulary]
---

# Milestone M1 — Musical Vocabulary

## Goal

Implement the foundational musical domain defined by **spec-0001**.

This milestone delivers the canonical musical vocabulary, deterministic signature resolution, and validation required for every subsequent composition workflow.

---

## Scope

### Included

* YAML vocabulary repository

  * Scales
  * Genres
  * Moods
* Vocabulary loaders
* Vocabulary validation
* `MusicalSignature`
* `SignatureFactory`
* Baseline computation
* Per-field resolution
* Provenance generation
* Validation rules

### Explicitly out of scope

* Intent Resolver
* Composition Engine
* MIDI generation
* Ableton Live integration
* Effect implementations
* Arrangement generation

---

## Definition of Done

### Vocabulary

* At least **3** Scale YAML definitions.
* At least **2** Genre YAML definitions.
* At least **2** Mood YAML definitions.

### Domain

* `MusicalSignature` implemented.
* `SignatureFactory` implemented.
* Deterministic baseline computation.
* Deterministic per-field precedence resolution.
* Provenance generated for every resolved field.

### Validation

* Unknown vocabulary produces descriptive errors.
* Invalid enum values are rejected.
* Tempo constraints are enforced.
* Missing required fields fail validation.
* Validator never invents values.

### Testing

Unit tests cover:

* Direct Composition
* Hybrid Composition
* Vocabulary loading
* Baseline computation
* Resolution precedence
* Validation failures
* Provenance generation

---

## Exit Criteria

The system can deterministically construct a valid `MusicalSignature` from the vocabulary defined in `spec-0001`, without relying on an Intent Resolver or any DAW integration.