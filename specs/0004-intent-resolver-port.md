---
id: spec-0004
type: spec
kind: implementation
title: "Intent Resolver Port"
status: approved
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

Define the TypeScript contract for the Intent Resolver port. The Domain Spec (spec-0001) defines what an Intent Resolver is and the invariants it must satisfy. This Implementation Spec defines the concrete TypeScript interface that any adapter implements.

The Intent Resolver is a **port**, not an implementation. Adapters (spec-0008) may be rule-based, LLM-based, fine-tuned, or hybrid. The port is the boundary; adapters are swappable without changes elsewhere.

---

## Module Structure

The port contract lives in the existing `@stratum/vocabulary` package because it is consumed by the `SignatureFactory` (spec-0003) and returns partial `DirectComposition` values, which are part of the vocabulary domain.

```
packages/vocabulary/src/intent/
  resolver.ts          # IntentResolver type
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
 * The Intent Resolver port.
 *
 * Receives a free-text intent and the partial composition the user
 * already supplied. Returns a partial DirectComposition containing
 * only the fields the resolver wants to fill. Fields it leaves
 * undefined are filled by the SignatureFactory from baselines (or
 * fail validation if no source supplies them).
 *
 * The resolver is a pure function: deterministic for a given
 * (intent, partial) pair, non-mutating, vocabulary-bound, and
 * field-filling only. These invariants are defined in spec-0001
 * (Domain Spec, Intent Resolver Invariants section). This port
 * concrete-specs the TypeScript shape; the invariants are the
 * domain's and hold for every language and every adapter.
 *
 * Failure handling is the adapter's choice: an adapter may return
 * an empty partial (no inferences possible) or throw an Error
 * with any shape. The SignatureFactory catches the throw and
 * wraps it as a ResolutionError with the original error attached
 * as `cause`. The port itself does not define a specific error
 * type — that is the factory's translation concern, not the
 * port's contract.
 */
export interface IntentResolver {
  resolve(
    intent: string,
    partial: Partial<DirectComposition>,
  ): Promise<Partial<DirectComposition>>;
}
```

The return type is `Partial<DirectComposition>`, not a custom `ResolvedComposition` interface. The factory distinguishes the resolver's contribution from the user's by the precedence chain (resolver values carry `source: 'resolver'` in the provenance), not by a type distinction. One type, one meaning, no duplicate.

---

## Contract Guarantees

The port is a contract. The guarantees below are **observable**: any implementation that violates them is invalid, regardless of how the violation is detected (unit tests, property tests, fuzzing, manual review).

- **Determinism**: Repeated invocations with identical `(intent, partial)` inputs MUST produce byte-identical outputs. A resolver that is not deterministic is not a valid Intent Resolver.

- **Non-mutation**: The resolver MUST NOT mutate the `partial` argument. The caller can rely on the partial being unchanged after the resolver returns.

- **Vocabulary-bound**: The resolver MUST NOT introduce scale, genre, or mood names that are not present in the loaded `VocabularyRepository`. The factory validates against the repository after the resolver returns, so a violation surfaces as a `ResolutionError` with reason `unknown-scale` / `unknown-genre` / `unknown-mood`.

- **Field-filling only**: The resolver's output is consumed by the factory's per-field precedence chain. Resolver values take the place of `baseline` values where the resolver supplies a field. Resolver values MUST NOT override user values. The factory enforces this; the port requires the resolver to behave accordingly.

- **Async-only**: The port returns a `Promise`. Synchronous resolvers are forbidden by the type. This keeps the door open for network-bound adapters (LLM calls) without breaking the contract for pure-function adapters (which simply return `Promise.resolve(...)`).

- **No side effects on the vocabulary**: The resolver does not load, mutate, or re-load the `VocabularyRepository`. The vocabulary is passed implicitly (via the factory's captured reference) but the resolver does not touch it. This keeps the resolver easy to test in isolation.

---

## Integration with SignatureFactory

`SignatureFactory.intent()` (spec-0003) takes an `IntentComposition` (which has `intent: string` and optional user fields), calls the resolver, and merges the resolver's output with the user's `DirectComposition`-style fields. User fields always win.

The merge order is: **user > resolver > baseline**. This is the per-field precedence chain from spec-0001.

The factory wraps any throw from the resolver as a `ResolutionError` with reason `'intent-resolver-failed'` and the original error as `cause`. This is the factory's translation; the port itself does not need to know about `ResolutionError` shapes.

The factory's contract is unchanged. Spec-0003 already declares `IntentResolver` as a constructor parameter; this spec formalizes the type that parameter expects.

---

## Non-Goals

- **Any specific resolver implementation**. Rule-based, LLM, hybrid — all live in spec-0008 (adapters).
- **Vocabulary expansion**. A resolver cannot introduce new scales, genres, or moods; it can only select from the existing vocabulary.
- **Intent parsing rules** (e.g. NLP tokenization, prompt templates). These live in the adapter, not the port.
- **Caching**. The factory does not cache resolver outputs. Each call is fresh. Caching is an adapter concern.
- **Streaming**. The resolver returns a single `Partial<DirectComposition>`. Streaming partial updates is not supported.
- **Multi-turn conversation**. The resolver takes one intent string per call. Multi-turn is out of scope.
- **Confidence scores**. Each resolved field could carry a confidence (0..1) so the factory can warn on low-confidence inferences. Out of scope for v1.
- **Error type definition**. The port does not define a specific error class. The factory translates any thrown error to a `ResolutionError` with `cause` preserved. The adapter's error type is the adapter's choice.

---

## Dependencies

- spec-0001 — Musical Vocabulary & Signature Schema (Domain Spec: defines Intent Resolver Invariants, Hybrid Composition, provenance, validation)
- spec-0003 — SignatureFactory and Domain Types (consumes IntentResolver at construction; defines `DirectComposition` which the resolver returns; wraps resolver errors as `ResolutionError`)
- spec-0008 — Intent Resolver Adapters (Implementation Spec: implements this port for at least one strategy)
- adr-0001 — Hexagonal Architecture (the port is the boundary between domain and adapter)

---

## Acceptance Criteria

- `IntentResolver` type lives in `packages/vocabulary/src/intent/resolver.ts`.
- The interface has a single method `resolve(intent, partial): Promise<Partial<DirectComposition>>`.
- The TypeDoc comment on the interface references spec-0001's Intent Resolver Invariants section.
- No custom error class is defined in the port module.
- Contract tests pass with a fake implementation, verifying each of the six contract guarantees above.
- The factory's `intent()` integration test (one test in the vocabulary test suite) verifies that a resolver's throw is caught and re-raised as a `ResolutionError` with `cause` set.

---

## Future Work

- **spec-0008** — Intent Resolver Adapters: at least one rule-based adapter (deterministic, no API keys, runs in CI) and optionally an LLM-based adapter (out of CI scope, requires API key).
- **Multi-turn conversation**: the resolver could accept a session/history. Out of scope for v1.
- **Streaming partial updates**: useful for very long intents. Out of scope for v1.
- **Confidence scores**: see Non-Goals.