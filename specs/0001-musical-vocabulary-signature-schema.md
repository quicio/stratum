---
id: spec-0001
type: spec
title: "Musical Vocabulary & Signature Schema"
status: approved
version: 0.1.0
owner: hugo
created: 2026-07-18
updated: 2026-07-18
milestone: M1
related: [adr-0001, adr-0002]
impl_progress: 0
tags: [vocabulary, music, schema, signature]
---

# Spec 0001 — Musical Vocabulary & Signature Schema

## Vision

Define the canonical musical vocabulary consumed by Stratum.

The vocabulary is independent of Ableton, MIDI, LLMs, or any composition engine. It represents the shared musical language of the system.

Its primary responsibility is to produce a validated **MusicalSignature**, the canonical representation of a musical composition request.

---

# Design Principles

- Vocabulary definitions are immutable.
- MusicalSignature is deterministic.
- Validation never invents values.
- Intent Resolution completes missing fields; it does not modify computed baselines.
- Explicit user values always take precedence.

---

# Core Concepts

## Scale

Represents a musical mode independent of its root note.

### Required fields

```yaml
name:
intervals:
character:
```

| Field | Type | Description |
|--------|------|-------------|
| name | kebab-case string | Scale identifier |
| intervals | integer[] | Semitone offsets from tonic |
| character | string[] | Free-form descriptors |

### Example

```yaml
name: phrygian

intervals:
  - 0
  - 1
  - 3
  - 5
  - 7
  - 8
  - 10

character:
  - dark
  - tense
  - ritual
```

---

## Genre

Represents stylistic conventions and default performance characteristics.

### Required fields

```yaml
name:

tempo:
  min:
  max:
  default:

defaults:

  energy:

  complexity:

  groove:

rhythm_signature:

harmonic_density:
```

| Field | Type | Required |
|-------|------|----------|
| tempo.min | integer | yes |
| tempo.max | integer | yes |
| tempo.default | integer | no (baseline.tempo exists only if present) |
| defaults.energy | float (0–1) | yes |
| defaults.complexity | float (0–1) | yes |
| defaults.groove | float (0–1) | yes |
| rhythm_signature | kebab-case string | yes |
| harmonic_density | enum: low \| medium \| high | yes |

### Example

```yaml
name: hypnotic-techno

tempo:
  min: 136
  max: 142
  default: 140

defaults:

  energy: 0.75
  complexity: 0.30
  groove: 0.90

rhythm_signature: four-on-the-floor

harmonic_density: low
```

---

## Mood

Represents expressive modifiers.

### Required fields

```yaml
name:

effects:

register:

ornamentation:

descriptors:

bias:

  energy:

  complexity:

  groove:
```

| Field | Type |
|--------|------|
| effects | ordered string[] |
| register | enum: bass \| mid \| high \| full |
| ornamentation | string[] |
| descriptors | string[] (free-form, v1) |
| bias.energy | float (-1..1) |
| bias.complexity | float (-1..1) |
| bias.groove | float (-1..1) |

### Notes

- `effects` is an ordered list of effect identifiers.
- Effect semantics are intentionally outside the scope of this specification.
- `descriptors` are unrestricted strings in v1.
- A future specification will define a descriptor taxonomy.

### Bias application

Biases are added to genre defaults and the sum is clamped to [0, 1]. This produces the **baseline** for each performance axis.

```
baseline.energy     = clamp(genre.defaults.energy     + mood.bias.energy,     0, 1)
baseline.complexity = clamp(genre.defaults.complexity + mood.bias.complexity, 0, 1)
baseline.groove     = clamp(genre.defaults.groove     + mood.bias.groove,     0, 1)
```

The Intent Resolver never modifies these baselines. It MAY replace a baseline with a concrete value for any field the user did not supply (see Composition Modes). User values at the signature level replace the corresponding baseline field with no clamping.

### Example

```yaml
name: arrakis

effects:
  - cavern-delay
  - atmospheric-reverb

register: bass

ornamentation:
  - glide

descriptors:
  - dry
  - vast
  - mystical

bias:

  energy: 0.05
  complexity: 0.10
  groove: -0.10
```

---

# MusicalSignature

The canonical validated representation of a musical idea.

```yaml
scale:

  name:

  root_pitch_class:

genre:

  name:

mood:

  name:

performance:

  tempo:

  energy:

  complexity:

  groove:

metadata:

  provenance:
```

### Notes

- `root_pitch_class` follows MIDI convention (`C=0 ... B=11`).
- `Scale` defines the mode.
- `root_pitch_class` defines the tonic for that scale.

A MusicalSignature is immutable once validated.

---

# Composition Modes

## Direct Composition

For users who know exactly what they want.

Example

```yaml
scale:
  name: phrygian
  root_pitch_class: 2

genre:
  name: hypnotic-techno

mood:
  name: arrakis

performance:

  tempo: 140
  energy: 0.90
```

The system validates the supplied values.

No inference occurs.

---

## Intent Composition

For exploratory workflows.

Example

```
Create something that feels like an abandoned temple beneath the sands of Arrakis.
```

An Intent Resolver may infer missing vocabulary and performance values.

The resulting object MUST still be a valid `MusicalSignature`.

---

## Hybrid Composition

Users may define some fields explicitly while allowing the Intent Resolver to infer the rest.

Example

```yaml
scale:
  name: phrygian
  root_pitch_class: 2

intent: abandoned temple beneath the sands of Arrakis
```

The resolver MUST preserve every user-defined field.

Only missing fields may be completed by the resolver.

---

# Signature Resolution

Every field of a MusicalSignature has a fixed, field-specific precedence chain. Resolution is deterministic.

## Per-field precedence chains

| Field | Chain (highest wins) |
|-------|----------------------|
| scale.name | user > resolver |
| scale.root_pitch_class | user > resolver |
| genre.name | user > resolver |
| mood.name | user > resolver |
| performance.tempo | user > resolver > baseline.tempo |
| performance.energy | user > resolver > baseline.energy |
| performance.complexity | user > resolver > baseline.complexity |
| performance.groove | user > resolver > baseline.groove |

A field is **filled** by taking the first value present in its chain, top to bottom. If no source supplies a value, validation fails (see Validation Rules).

A scale, by definition, has no implied tonic. The chain for `scale.root_pitch_class` therefore has no baseline: a scale mode (e.g. `phrygian`) does not mean `C phrygian`. If neither user nor resolver supplies a tonic, validation fails explicitly: *"scale.root_pitch_class is required; the scale mode does not imply a tonic."*

## Baseline computation

Baselines are computed deterministically from genre defaults and mood biases before per-field resolution:

```
baseline.energy     = clamp(genre.defaults.energy     + mood.bias.energy,     0, 1)
baseline.complexity = clamp(genre.defaults.complexity + mood.bias.complexity, 0, 1)
baseline.groove     = clamp(genre.defaults.groove     + mood.bias.groove,     0, 1)
```

`baseline.tempo` exists only if the genre declares an explicit `tempo.default`. When present:

```
baseline.tempo = genre.tempo.default
```

When absent, the chain for `performance.tempo` has no baseline and falls directly from resolver to validation. The midpoint of `tempo.min` and `tempo.max` is **not** used as a default: a musical default cannot be derived from a numeric range; it must be declared.

Baselines are immutable for the duration of resolution. The Intent Resolver may fill any field the user did not supply by providing a concrete value; it does not modify baselines.

## Resolution algorithm

For each field of the MusicalSignature:

1. Compute baselines (once, before per-field resolution).
2. For each field, walk its precedence chain top to bottom and take the first present value.
3. Validate the chosen value against field constraints (tempo range, register enum, etc.).
4. Record the provenance of the chosen value (`source: user | resolver | baseline`).

The algorithm is total: every required field MUST resolve to exactly one source. If any field has no source, validation fails before the signature is constructed.

---

# Provenance

Every resolved field stores its origin.

Allowed values

```yaml
source:

  user

  resolver

  baseline
```

Example

```yaml
scale:

  value:

    name: phrygian
    root_pitch_class: 2

  source: user

genre:

  value:

    name: hypnotic-techno

  source: resolver

mood:

  value:

    name: arrakis

  source: resolver

performance:

  tempo:
    value: 140
    source: baseline

  energy:
    value: 0.82
    source: user

  complexity:
    value: 0.35
    source: baseline

  groove:
    value: 0.91
    source: resolver
```

---

# Validation Rules

## Unknown vocabulary

Unknown scales, genres or moods MUST produce descriptive validation errors including valid alternatives.

---

## Tempo conflicts

If the requested tempo falls outside the genre range:

- Clamp to the nearest valid value.
- Emit a warning.

---

## Missing required fields

The validator MUST NOT invent values.

Validation fails with an actionable error.

Only an Intent Resolver may infer missing fields before validation.

---

# Dependencies

- adr-0001 — Hexagonal Architecture
- adr-0002 — TypeScript / Node 22

---

# Acceptance Criteria

- MusicalSignature can be built from Direct Composition.
- MusicalSignature can be built from Intent Composition (resolver completes missing fields only).
- Hybrid Composition preserves explicit user values.
- Signature resolution is deterministic; per-field precedence chains are exactly as specified.
- Every resolved field stores provenance (`user`, `resolver`, or `baseline`).
- Unknown vocabulary generates descriptive validation errors.
- Tempo conflicts clamp to the nearest valid value and emit a warning.
- Validator never invents missing values.
- Resolution algorithm completes without producing a signature if any required field has no source.
- YAML repository contains at least:
  - 3 scales
  - 2 genres
  - 2 moods
- Unit tests cover direct, intent and hybrid composition flows.

---

# Future Work

Not part of this specification.

- Descriptor taxonomy
- Effect catalog
- Rhythm signature catalog
- Intent Resolver contract
- Instrument profiles
- Chord progression grammar
- Arrangement templates
- Composition Engine
- MIDI generation
- Ableton Live Bridge