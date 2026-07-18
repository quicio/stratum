---
id: spec-0001
type: spec
title: "Musical Vocabulary & Signature Schema"
status: draft
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
- Intent Resolution may infer missing values.
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

defaults:

  energy:

  complexity:

  groove:

rhythm_signature:

harmonic_density:
```

| Field | Type |
|--------|------|
| tempo.min | integer |
| tempo.max | integer |
| defaults.energy | float (0–1) |
| defaults.complexity | float (0–1) |
| defaults.groove | float (0–1) |
| rhythm_signature | kebab-case string |
| harmonic_density | enum: low \| medium \| high |

### Example

```yaml
name: hypnotic-techno

tempo:
  min: 136
  max: 142

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

Biases are added to defaults and clamped to [0, 1] at resolution time.

```
performance.energy   = clamp(defaults.energy   + bias.energy   + intent.delta.energy,   0, 1)
performance.complexity = clamp(defaults.complexity + bias.complexity + intent.delta.complexity, 0, 1)
performance.groove   = clamp(defaults.groove   + bias.groove   + intent.delta.groove,   0, 1)
```

A user-defined value at the signature level replaces the computed value entirely (no clamp applied to user overrides).

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

Only missing fields may be inferred.

---

# Signature Resolution

Resolution order is deterministic.

1. Genre defaults
2. Mood biases
3. Intent inference
4. User overrides
5. Validation

Explicit user values always have highest priority.

---

# Provenance

Every resolved field stores its origin.

Allowed values

```yaml
source:

  user

  inferred

  default
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

  source: inferred

mood:

  value:

    name: arrakis

  source: inferred

performance:

  tempo:
    value: 140
    source: default

  energy:
    value: 0.82
    source: user

  complexity:
    value: 0.35
    source: default

  groove:
    value: 0.91
    source: inferred
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
- MusicalSignature can be built from Intent Composition.
- Hybrid Composition preserves explicit user values.
- Signature resolution is deterministic.
- Every resolved field stores provenance.
- Unknown vocabulary generates descriptive validation errors.
- Tempo conflicts emit warnings.
- Validator never invents missing values.
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