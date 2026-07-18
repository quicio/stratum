---
id: spec-0008
type: spec
kind: implementation
title: "Intent Resolver Adapters"
status: draft
version: 0.1.0
owner: hugo
created: 2026-07-18
updated: 2026-07-18
milestone: M2
related: [spec-0004]
impl_progress: 0
tags: [intent, resolver, adapter, m2]
---

# Spec 0008 — Intent Resolver Adapters

## Vision

Define at least one concrete implementation of the `IntentResolver` port (spec-0004). The M2 ship criterion is "the system can run `stratum generate 'techno raw 139 phrygian arrakis'` and produce a self-contained bundle". A working resolver adapter is required for that to pass.

v1 ships a **rule-based adapter** that runs in CI, requires no API keys, and is deterministic. An LLM-based adapter is a future v1.1 spec.

---

## Module Structure

```
packages/intent-resolver-rules/
  package.json             # @stratum/vocabulary-intent-rules
  tsconfig.json
  tsconfig.build.json
  vitest.config.ts
  src/
    rules.ts               # rule definitions (keyword -> scale/genre/mood)
    resolver.ts            # RuleBasedResolver class implementing IntentResolver
    index.ts               # public exports
  tests/
    resolver.test.ts       # contract tests + integration tests with real vocab
    fixtures/
      intents.ts           # sample inputs for testing
```

The package depends on `@stratum/vocabulary` (for `IntentResolver`, `MusicalSignature` types) only. No external API calls, no model downloads.

---

## The Rule-Based Resolver

The resolver maps natural language to vocabulary by **keyword matching**. The mapping is:

| Keyword (in intent text) | Inferred |
|---|---|
| `phrygian`, `frigian`, `dark scale`, `ritual` | `scale.name = 'phrygian'`, `root_pitch_class = 4` (E) |
| `dorian`, `modal`, `contemplative` | `scale.name = 'dorian'`, `root_pitch_class = 2` (D) |
| `natural minor`, `melancholic` | `scale.name = 'natural-minor'`, `root_pitch_class = 0` (C) |
| `techno`, `hypnotic`, `industrial` | `genre.name = 'hypnotic-techno'` |
| `deep house`, `deep`, `house` | `genre.name = 'deep-house'` |
| `arrakis`, `dune`, `desert`, `mystical` | `mood.name = 'arrakis'` |
| `cathedral`, `luminous`, `reverent` | `mood.name = 'cathedral'` |
| `fast`, `energetic` | `performance.energy = 0.9` |
| `slow`, `languid` | `performance.energy = 0.3` |
| `simple`, `minimal` | `performance.complexity = 0.2` |
| `busy`, `intricate` | `performance.complexity = 0.8` |

The keyword list is **exhaustive for v1**: only these mappings exist. An intent that doesn't match any keyword returns an empty `Partial<DirectComposition>`, and the factory fills from baselines.

The keyword matching is **case-insensitive and substring-based**: the intent is lowercased once, and each rule scans for the keyword. The first match wins per category. There is no scoring, no weighting, no LLM.

---

## Resolver Class

```typescript
// src/resolver.ts

import { IntentResolver } from '@stratum/vocabulary/intent';
import type { DirectComposition } from '@stratum/vocabulary/factory/signature-factory';

export class RuleBasedResolver implements IntentResolver {
  async resolve(
    intent: string,
    partial: Partial<DirectComposition>,
  ): Promise<Partial<DirectComposition>> {
    const result: Partial<DirectComposition> = {};
    const lower = intent.toLowerCase();

    if (/phrygian|frigian|dark scale|ritual/.test(lower)) {
      result.scale = { name: 'phrygian', root_pitch_class: 4 };
    } else if (/dorian|modal|contemplative/.test(lower)) {
      result.scale = { name: 'dorian', root_pitch_class: 2 };
    } else if (/natural minor|melancholic/.test(lower)) {
      result.scale = { name: 'natural-minor', root_pitch_class: 0 };
    }

    if (/techno|hypnotic|industrial/.test(lower)) {
      result.genre = { name: 'hypnotic-techno' };
    } else if (/deep house|deep|house/.test(lower)) {
      result.genre = { name: 'deep-house' };
    }

    if (/arrakis|dune|desert|mystical/.test(lower)) {
      result.mood = { name: 'arrakis' };
    } else if (/cathedral|luminous|reverent/.test(lower)) {
      result.mood = { name: 'cathedral' };
    }

    const perf: DirectComposition['performance'] = {};
    if (/fast|energetic/.test(lower)) perf.energy = 0.9;
    else if (/slow|languid/.test(lower)) perf.energy = 0.3;
    if (/simple|minimal/.test(lower)) perf.complexity = 0.2;
    else if (/busy|intricate/.test(lower)) perf.complexity = 0.8;
    if (Object.keys(perf).length > 0) {
      result.performance = perf;
    }

    return result;
  }
}
```

The resolver does not look at the `partial` argument. It only reads `intent`. The factory's merge logic applies the precedence chain (user > resolver > baseline).

The resolver does not throw. It returns an empty `Partial` if no keywords match. The factory treats that as "no inference", and fields fall back to baselines (or fail if no source).

---

## Determinism

The resolver is fully deterministic: same input string → same output. There is no randomness, no clock, no model state. Tests verify with 100-iteration loops.

---

## Contract Guarantees

The resolver implements the port's guarantees (spec-0004):

- Determinism: same `intent` → same output
- Non-mutation: does not touch `partial`
- Vocabulary-bound: only emits scale/genre/mood names present in the vocabulary
- Field-filling only: does not modify baselines or validation

---

## Limitations (honest)

- **No semantic understanding**. The resolver matches substrings. "A track that feels like being in Arrakis but in a cathedral" matches both `arrakis` and `cathedral`; the order of regex tests decides which wins (mood wins last in the current code, so the cathedral match overrides). This is not intelligence; it is string matching.
- **English only**. The keyword list is English. Spanish, French, etc. would require a parallel list.
- **No fuzzy matching**. "Phrygian" with a typo matches nothing. The resolver is exact.

These limitations are acceptable for v1 because the rule-based resolver is the **CI-friendly default**. A real LLM-based resolver can do better. The architecture supports both because the port is the boundary.

---

## Non-Goals

- **Semantic understanding**. The resolver is rule-based, not LLM-based. An LLM adapter is a future v1.1 spec.
- **Multi-language keywords**. v1 is English-only. Future: parameterize the keyword tables.
- **Fuzzy matching**. Substring match only. Future: edit-distance or embedding-based matching.
- **Caching**. The resolver is pure; no caching.
- **Streaming**. The resolver returns a single `Partial<DirectComposition>`.
- **Confidence scores**. Every returned field has implicit confidence 1.0 (rule matched) or 0.0 (rule did not match → field not returned).

---

## Dependencies

- spec-0004 — Intent Resolver Port (the interface this adapter implements)
- @stratum/vocabulary — the `IntentResolver` and `DirectComposition` types

---

## Acceptance Criteria

- `RuleBasedResolver` class lives in `packages/intent-resolver-rules/src/resolver.ts`.
- `RuleBasedResolver` implements `IntentResolver` (TypeScript type-check).
- The keyword table is in `packages/intent-resolver-rules/src/rules.ts` and exported.
- `resolve` returns a `Partial<DirectComposition>` (not a custom type; the port contract).
- Contract tests pass:
  - "abandoned temple beneath the sands of Arrakis" → `{ scale: undefined, genre: undefined, mood: { name: 'arrakis' } }`
  - "phrygian hypnotic techno at 139 BPM" → `{ scale: { name: 'phrygian', root_pitch_class: 4 }, genre: { name: 'hypnotic-techno' } }`
  - "fast minimal dark techno" → `{ genre: { name: 'hypnotic-techno' }, performance: { energy: 0.9, complexity: 0.2 } }`
  - "no keywords here" → `{}`
  - Same intent → same output (100 iterations)
- The adapter package depends on `@stratum/vocabulary` only. No external API calls.

---

## Future Work

- **v1.1 — LLM-based adapter**: spec for a separate package that wraps an LLM call. Same port contract. The port and this spec are unchanged.
- **Multi-language keywords**: parameterize the keyword tables.
- **Fuzzy matching**: edit-distance or embedding-based fallback for typos.
- **Confidence scores**: per-field confidence so the factory can warn on low-confidence inferences.
- **Learning from feedback**: optional; a separate package.