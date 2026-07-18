---
id: spec-0004
type: spec
kind: implementation
title: "Intent Resolver Port"
status: draft
version: 0.1.0
owner: hugo
created: 2026-07-18
updated: 2026-07-18
milestone: M2
related: [spec-0001, spec-0003]
impl_progress: 0
tags: [intent, resolver, port, m2]
---

# Spec 0004 — Intent Resolver Port

## Vision

Define the contract for the Intent Resolver: the component that converts a free-text user intent into a partial `DirectComposition` that fills the missing fields of a `MusicalSignature` resolution.

The Intent Resolver is a **port**, not an implementation. The Domain Spec (spec-0001) defines what an Intent Composition is and what a resolver is allowed to do. This Implementation Spec defines the TypeScript contract that any implementation of the port must satisfy.

An adapter implementing this port (spec-0008) may be a rule-based lookup, an LLM call, a fine-tuned model, or any hybrid. The port is the boundary; adapters are swappable.

---

## Module Structure

The port contract lives in the existing `@stratum/vocabulary` package because it is consumed by the `SignatureFactory` (spec-0003) and returns partial `DirectComposition` values, which are part of the vocabulary domain.

```
packages/vocabulary/src/intent/
  resolver.ts          # IntentResolver type + ResolvedField metadata
  errors.ts            # ResolutionError variants specific to intent composition
  index.ts             # re-exports

packages/vocabulary/tests/intent/
  resolver.test.ts     # contract tests using a fake implementation
```

The port is a **pure interface**; it owns no I/O. Adapters live in their own packages (e.g. `@stratum/vocabulary-intent-rules`, `@stratum/vocabulary-intent-llm`).

---

## Port Contract

```typescript
// src/intent/resolver.ts

import type { DirectComposition } from '../factory/signature-factory.js';

/**
 * A value produced by an Intent Resolver.
 *
 * The resolver never produces a value marked `user`; user values come
 * exclusively from the caller. The resolver's outputs are marked
 * `resolver` in the resulting provenance (spec-0001).
 */
export type ResolverValue = 'resolver';

/**
 * A partial DirectComposition with provenance metadata.
 *
 * Each field the resolver supplies is paired with the role `resolver`.
 * The SignatureFactory (spec-0003) walks the partial, fills any
 * missing fields from baselines, and wraps each value in Provenance<T>
 * with the matching source.
 */
export interface ResolvedComposition {
  readonly scale?: { name: string; root_pitch_class: number };
  readonly genre?: { name: string };
  readonly mood?: { name: string };
  readonly performance?: Partial<{
    tempo: number;
    energy: number;
    complexity: number;
    groove: number;
  }>;
}

/**
 * The Intent Resolver port.
 *
 * Implementations receive a free-text intent and the partial
 * composition the user already supplied. They return a
 * ResolvedComposition containing only the fields they want to fill.
 * Fields they leave undefined are filled by the SignatureFactory
 * from baselines (or fail validation if no source supplies them).
 *
 * Implementations MUST be deterministic for a given (intent, partial)
 * pair. Non-deterministic implementations are forbidden because the
 * M2 ship criterion requires deterministic generation given the
 * same seed (which includes the intent and the partial).
 *
 * Implementations MUST NOT modify the partial argument. They MUST
 * return a new ResolvedComposition.
 *
 * Implementations MUST NOT invent unknown vocabulary. If the
 * resolver decides a scale/genre/mood name, it must be a name that
 * the VocabularyRepository exposes; otherwise the SignatureFactory
 * will reject it at validation time.
 */
export interface IntentResolver {
  resolve(
    intent: string,
    partial: Partial<DirectComposition>,
  ): Promise<ResolvedComposition>;
}
```

---

## Contract Tests

The port's contract is verified by tests that use a **fake implementation** (not a real adapter). The fake lives in `tests/intent/` and exercises every guarantee the port makes.

### Tests required

1. **Identity resolver (no-op)**: returns `{}` for any input. The factory must then fill everything from baselines.
2. **Deterministic resolver**: given the same `(intent, partial)` pair, returns the same `ResolvedComposition` on every call. Tested with a 100-iteration loop.
3. **Partial preservation**: a resolver that fills `mood` MUST NOT also fill `scale`, `genre`, or `performance` (the resolver is the only thing that knows the partial; it must return only the fields it wants to add). Tested by inspection of the result.
4. **No-mutation**: the resolver MUST NOT mutate the `partial` argument. Tested by snapshotting the partial before and after the call.
5. **Empty intent**: a resolver that supports an empty intent returns `{}`. (This is a contract test on the port, not on a specific resolver.)
6. **Async-only**: the port returns `Promise<ResolvedComposition>`. A sync implementation is forbidden by the type; the test verifies the return type at compile time.

---

## Error Model

The port itself does not throw. The resolver may:

- **Return an empty `ResolvedComposition`** if it cannot determine anything from the intent. The factory then fills from baselines; the user is responsible for ensuring the baseline produces a valid signature.
- **Throw** if the intent is structurally unusable (e.g. empty after normalization, contains a known profanity filter trigger). The factory's `intent()` method catches the throw and re-raises it as a `ResolutionError` with reason `'intent-resolver-failed'`.

```typescript
// src/intent/errors.ts

export class IntentResolverError extends Error {
  constructor(
    public readonly reason: 'empty-intent' | 'filter-triggered' | 'internal',
    message: string,
  ) {
    super(message);
    this.name = 'IntentResolverError';
  }
}
```

The factory (spec-0003) already has a `ResolutionError`. The factory's `intent()` method catches `IntentResolverError` and re-throws as `ResolutionError` with reason `'intent-resolver-failed'`. The original error is attached as `cause`.

---

## Integration with SignatureFactory

`SignatureFactory.intent()` (spec-0003) takes an `IntentComposition` (which has `intent: string` and optional user fields), calls the resolver, and merges the resolver's `ResolvedComposition` with the user's `DirectComposition`-style fields. User fields always win.

The merge order is: **user > resolver > baseline**. This is the per-field precedence chain from spec-0001.

The factory's contract is unchanged. Spec-0003 already declares `IntentResolver` as a constructor parameter; this spec formalizes the type that parameter expects.

---

## Non-Goals

- **Any specific resolver implementation**. Rule-based, LLM, hybrid — all live in spec-0008 (adapters).
- **Vocabulary expansion**. A resolver cannot introduce new scales, genres, or moods; it can only select from the existing vocabulary.
- **Intent parsing rules** (e.g. NLP tokenization, prompt templates). These live in the adapter, not the port.
- **Caching**. The factory does not cache resolver outputs. Each call is fresh. Caching is an adapter concern.
- **Streaming**. The resolver returns a single `ResolvedComposition`. Streaming partial updates is not supported.
- **Multi-turn conversation**. The resolver takes one intent string per call. Multi-turn is out of scope.

---

## Dependencies

- spec-0001 — Musical Vocabulary & Signature Schema (Domain Spec: defines Intent Composition, DirectComposition, resolution algorithm, provenance)
- spec-0003 — SignatureFactory and Domain Types (consumes IntentResolver at construction; defines `DirectComposition` which the resolver returns)
- spec-0008 — Intent Resolver Adapters (Implementation Spec: implements this port for at least one strategy)
- adr-0001 — Hexagonal Architecture (the port is the boundary between domain and adapter)

---

## Acceptance Criteria

- `IntentResolver` type lives in `packages/vocabulary/src/intent/resolver.ts`.
- The interface has a single method `resolve(intent, partial): Promise<ResolvedComposition>`.
- The interface declares that the resolver is deterministic, non-mutating, and vocabulary-bound.
- `IntentResolverError` is defined in `packages/vocabulary/src/intent/errors.ts`.
- The existing `SignatureFactory.intent()` accepts any object satisfying `IntentResolver` (no TypeScript change needed in spec-0003's code; this spec documents the contract that was already implicit).
- Contract tests pass with a fake implementation:
  - identity resolver returns `{}`
  - deterministic over 100 iterations
  - partial preservation
  - no mutation of `partial`
  - empty intent handling
  - async-only signature
- The factory wraps `IntentResolverError` as `ResolutionError` with `cause` set (one integration test, in the vocabulary test suite).

---

## Future Work

- **spec-0008** — Intent Resolver Adapters: at least one rule-based adapter (deterministic, no API keys, runs in CI) and optionally an LLM-based adapter (out of CI scope, requires API key).
- **Multi-turn conversation**: the resolver could accept a session/history. Out of scope for v1.
- **Streaming partial updates**: useful for very long intents. Out of scope for v1.
- **Confidence scores**: each resolved field could carry a confidence (0..1) so the factory can warn on low-confidence inferences. Out of scope for v1.