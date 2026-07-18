---
id: spec-0001
type: spec
title: "Vocabulary musical: scales/genres/moods schema"
status: draft
version: 0.1.0
owner: hugo
created: 2026-07-18
updated: 2026-07-18
milestone: M1
related: [adr-0001]
impl_progress: 0
tags: [vocabulary, music, schema]
---

# Spec 0001: Vocabulary Schema

## Vision
Define a YAML-based vocabulary of musical signatures that Stratum consumes. A signature is a tuple {scale, genre, mood} whose combinations are validated for coherence.

## Behavior

### Scale
- name: kebab-case identifier
- root_pitch_class: integer 0-11 (C=0, C#=1, ..., B=11)
- intervals: semitone offsets from root, ascending
- character: short evocative tag (dark, tense, exotic)

### Genre
- name: kebab-case
- bpm_range: [min, max]
- rhythm_signature: drum pattern abstraction
- kick_dominance: 0-1
- harmonic_density: notes-per-bar

### Mood
- name: kebab-case
- fx_chain: ordered list of effect hints
- ornamentation: pattern of grace notes / glissandi
- register: bass / mid / high / full

### Combination validity
- SignatureFactory.fromYaml(scale, genre, mood) returns a MusicalSignature.
- Validity rules encoded per genre.

## Edge cases
- Unknown scale/genre/mood -> throw with list of valid options
- Conflicting BPM (genre 120-130, intent 139) -> clamp + warn
- Empty mood -> fall back to genre defaults

## Dependencies
- adr-0001 (hexagonal bridge)
- adr-0002 (TS/Node22)

## Acceptance criteria
- [ ] SignatureFactory.fromYaml('phrygian', 'techno-raw', 'arrakis') returns valid signature
- [ ] Unknown combo throws with helpful message
- [ ] YAML files for at least 3 scales, 2 genres, 2 moods committed
- [ ] Unit tests cover all happy paths and edge cases

## Metadata
- Status: draft
- Author: hugo
- Created: 2026-07-18