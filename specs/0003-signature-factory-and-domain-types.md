---
id: spec-0003
type: spec
kind: implementation
title: "SignatureFactory and Domain Types"
status: approved
version: 0.1.0
owner: hugo
created: 2026-07-18
updated: 2026-07-18
milestone: M1
related: [spec-0001, spec-0002]
impl_progress: 100
tags: [vocabulary, factory, m1, domain, typescript]
---

# Spec 0003 — SignatureFactory and Domain Types

## Vision

Define the implementation-side types and operations that satisfy spec-0001's `MusicalSignature` contract. The spec covers three artifacts:

1. The **domain types** (`Scale`, `Genre`, `Mood`, `MusicalSignature`, `Provenance`) expressed in TypeScript and validated at runtime with zod.
2. The **VocabularyRepository** implementation (the concrete code that satisfies spec-0002).
3. The **SignatureFactory**, which builds a `MusicalSignature` from a `VocabularyRepository` plus a partial user input, executing the per-field precedence resolution and validation defined in spec-0001.

This spec is TypeScript-specific. The vocabulary contract (spec-0001) and the repository contract (spec-0002) remain language-agnostic.

---

## Filesystem Layout

The implementation lives in a new workspace package. The exact directory tree is illustrative; only the package boundary and the `src/` tree are normative.

```
packages/vocabulary/
  package.json             # name: @stratum/vocabulary
  tsconfig.json            # extends ../../tsconfig.base.json
  tsconfig.build.json      # emits src only to dist/
  vitest.config.ts
  src/
    ...
  tests/
    ...
    fixtures/
      valid/               # minimal valid vocabulary
      invalid/             # fixtures for failure cases
```

The package depends on `zod` (runtime + types) and `yaml` (YAML parsing). No other runtime dependencies.

## Module Structure

The `src/` tree is normative. The grouping reflects the hexagonal separation of concerns, not the file system depth. Any change to this layout is an Implementation Spec change.

| Path | Concern | Public? |
|---|---|---|
| `src/domain/types.ts` | zod schemas + inferred TS types for `Scale`, `Genre`, `Mood` | yes (types) |
| `src/domain/provenance.ts` | `Provenance<T>` type, `ProvenanceSource` union, helper predicates | yes |
| `src/repository/vocabulary-repository.ts` | concrete class implementing spec-0002's contract | yes |
| `src/repository/errors.ts` | `VocabularyLoadError` and `VocabularyIssue` (see spec-0002 Error Model) | yes |
| `src/repository/file-loader.ts` | YAML file discovery and parsing; private to the repository module | no |
| `src/factory/signature-factory.ts` | the public `SignatureFactory` class | yes |
| `src/factory/resolution.ts` | per-field precedence resolution algorithm | no (internal to factory) |
| `src/factory/baseline.ts` | baseline computation | no (internal to factory) |
| `src/factory/validation.ts` | validation rules derived from spec-0001 | no (internal to factory) |
| `src/index.ts` | public re-exports | yes |

`file-loader.ts` is internal to the repository module because the repository is the only component allowed to read YAML (spec-0002). It is not importable from outside `src/repository/`.

The public surface of the package is: `VocabularyRepository`, `SignatureFactory`, the domain types (`Scale`, `Genre`, `Mood`, `MusicalSignature`, `Provenance`, `ProvenanceSource`), the `IntentResolver` type, and the error classes. Everything else is internal.

---

## Domain Types

All domain types are defined in `src/domain/types.ts` as zod schemas. The TypeScript types are inferred from the schemas with `z.infer<typeof schema>`. This guarantees that the runtime validator and the compile-time types cannot diverge.

```typescript
// Scale (spec-0001)
export const ScaleSchema = z.object({
  name: z.string().regex(/^[a-z][a-z0-9-]*$/),
  intervals: z.array(z.number().int().min(0).max(127)).length(7),
  character: z.array(z.string()).default([]),
});
export type Scale = z.infer<typeof ScaleSchema>;

// Genre (spec-0001)
export const GenreSchema = z.object({
  name: z.string().regex(/^[a-z][a-z0-9-]*$/),
  tempo: z.object({
    min: z.number().int().positive(),
    max: z.number().int().positive(),
    default: z.number().int().positive().optional(),
  }).refine(t => t.min <= t.max, { message: 'tempo.min must be <= tempo.max' })
    .refine(t => t.default === undefined || (t.default >= t.min && t.default <= t.max), {
      message: 'tempo.default must be within [min, max] when present',
    }),
  defaults: z.object({
    energy: z.number().min(0).max(1),
    complexity: z.number().min(0).max(1),
    groove: z.number().min(0).max(1),
  }),
  rhythm_signature: z.string().min(1),
  harmonic_density: z.enum(['low', 'medium', 'high']),
});
export type Genre = z.infer<typeof GenreSchema>;

// Mood (spec-0001)
export const MoodSchema = z.object({
  name: z.string().regex(/^[a-z][a-z0-9-]*$/),
  effects: z.array(z.string()),
  register: z.enum(['bass', 'mid', 'high', 'full']),
  ornamentation: z.array(z.string()),
  descriptors: z.array(z.string()),
  bias: z.object({
    energy: z.number().min(-1).max(1),
    complexity: z.number().min(-1).max(1),
    groove: z.number().min(-1).max(1),
  }),
});
export type Mood = z.infer<typeof MoodSchema>;

// Performance axis (a single field of MusicalSignature)
export type PerformanceAxis = 'tempo' | 'energy' | 'complexity' | 'groove';
```

The validation guarantees that any object passing through zod conforms to the spec-0001 schema, including invariants such as `tempo.min <= tempo.max`.

### Provenance

```typescript
export type ProvenanceSource = 'user' | 'resolver' | 'baseline';

export interface Provenance<T> {
  value: T;
  source: ProvenanceSource;
}

export function isUser<T>(p: Provenance<T>): boolean { return p.source === 'user'; }
export function isResolver<T>(p: Provenance<T>): boolean { return p.source === 'resolver'; }
export function isBaseline<T>(p: Provenance<T>): boolean { return p.source === 'baseline'; }
```

The `source` field is a string literal union, not a free string, to prevent typos at the type level. There is no `default` or `inferred` value (spec-0001 rename: `default` is now `baseline`, `inferred` is now `resolver`).

### MusicalSignature

```typescript
export interface MusicalSignature {
  readonly scale: {
    readonly name: Provenance<string>;
    readonly root_pitch_class: Provenance<number>;
  };
  readonly genre: {
    readonly name: Provenance<string>;
  };
  readonly mood: {
    readonly name: Provenance<string>;
  };
  readonly performance: {
    readonly tempo: Provenance<number>;
    readonly energy: Provenance<number>;
    readonly complexity: Provenance<number>;
    readonly groove: Provenance<number>;
  };
}
```

Every field is wrapped in `Provenance<T>`. The signature is `readonly` to enforce immutability. Constructing a `MusicalSignature` requires a `SignatureFactory`; the constructor is not exported.

---

## VocabularyRepository

The concrete implementation of spec-0002. Lives in `src/repository/`.

```typescript
export class VocabularyRepository {
  private constructor(
    public readonly scales: ReadonlyMap<string, Scale>,
    public readonly genres: ReadonlyMap<string, Genre>,
    public readonly moods: ReadonlyMap<string, Mood>,
  ) {}

  static load(rootDir: string): Promise<VocabularyRepository>;
  async reload(): Promise<void>;
}
```

The constructor is private. The only public way to obtain a repository is `VocabularyRepository.load(rootDir)`. This matches spec-0002.

### Loading order

1. Verify the directory layout (`scales/`, `genres/`, `moods/` exist under `rootDir`).
2. Load all YAML files in the three subdirectories in alphabetical order.
3. Validate each file's `name` field matches the filename (without `.yaml`).
4. Validate each file's content against the corresponding zod schema.
5. Aggregate all issues into a single `VocabularyLoadError` if any step fails.
6. On success, build three readonly maps and return a new instance.

### Error model

The concrete error types live in `src/repository/errors.ts`. Their shape, fields, and aggregation semantics are defined in spec-0002's Error Model section; this Implementation Spec does not redefine them. Implementation note: the `kind` literal union is `'parse' | 'schema' | 'filename' | 'missing-dir' | 'missing-file'`, matching spec-0002 exactly.

### Atomicity

The implementation serializes concurrent `load` / `reload` calls on the same instance. A load cannot interleave with a read. The mechanism (mutex, queue, etc.) is an implementation detail; spec-0002's atomicity invariants are the contract.

---

## SignatureFactory

Lives in `src/factory/`.

```typescript
export interface DirectComposition {
  readonly scale: { name: string; root_pitch_class: number };
  readonly genre: { name: string };
  readonly mood: { name: string };
  readonly performance?: Partial<Record<PerformanceAxis, number>>;
}

export interface IntentComposition {
  readonly intent: string;
  readonly scale?: { name: string; root_pitch_class: number };
  readonly genre?: { name: string };
  readonly mood?: { name: string };
  readonly performance?: Partial<Record<PerformanceAxis, number>>;
}

export interface ResolutionWarning {
  field: string;
  message: string;
}

export interface ResolutionResult {
  readonly signature: MusicalSignature;
  readonly warnings: readonly ResolutionWarning[];
}

export class SignatureFactory {
  constructor(private readonly vocabulary: VocabularyRepository) {}

  // Direct Composition: every field is supplied by the user. No inference.
  direct(input: DirectComposition): ResolutionResult;

  // Intent Composition: a free-text intent is given. A pluggable Intent
  // Resolver (out of scope here, see spec-0004) MAY fill missing fields.
  // In this spec, the Intent Resolver is a function passed at construction
  // time. Its contract is minimal: (intent, partial) -> partial-fill.
  intent(input: IntentComposition): ResolutionResult;
}
```

In v1, the `intent()` method requires an `intentResolver` to be injected at construction:

```typescript
export type IntentResolver = (
  intent: string,
  partial: Partial<DirectComposition>,
  vocabulary: VocabularyRepository,
) => Promise<Partial<DirectComposition>>;

export class SignatureFactory {
  constructor(
    private readonly vocabulary: VocabularyRepository,
    private readonly intentResolver: IntentResolver,
  ) {}
}
```

This keeps the factory decoupled from any specific LLM or rule-based resolver. A rule-based resolver can be passed in tests; an LLM-based one in production. The factory does not know which.

---

## Resolution Algorithm

Given a `DirectComposition` (or a partial filled by the resolver), the algorithm is:

```
1. Compute baselines from vocabulary:
   baseline.energy     = clamp(genre.defaults.energy     + mood.bias.energy,     0, 1)
   baseline.complexity = clamp(genre.defaults.complexity + mood.bias.complexity, 0, 1)
   baseline.groove     = clamp(genre.defaults.groove     + mood.bias.groove,     0, 1)
   baseline.tempo      = genre.tempo.default   (only if defined)

2. For each field, walk its per-field precedence chain (spec-0001):
   scale.name             -> user > (no fallback; fail)
   scale.root_pitch_class -> user > (no fallback; fail)
   genre.name             -> user > (no fallback; fail)
   mood.name              -> user > (no fallback; fail)
   performance.tempo      -> user > baseline.tempo
   performance.energy     -> user > baseline.energy
   performance.complexity -> user > baseline.complexity
   performance.groove     -> user > baseline.groove

3. Each chosen value is wrapped in Provenance<T> with the matching source.
4. Validation runs on the complete signature. Any unresolved required
   field raises a ResolutionError.
```

The factory returns a `ResolutionResult` containing the `signature` and any `warnings`. Warnings are non-fatal (e.g. tempo clamped to the genre range).

### Tempo clamping

If the user's tempo falls outside `[genre.tempo.min, genre.tempo.max]`:

- Clamp to the nearest valid value.
- Emit a warning: `{ field: 'performance.tempo', message: 'clamped from X to Y' }`.

The clamped value is what ends up in the signature; the warning lets the caller log or surface the adjustment.

### Error model

```typescript
export class ResolutionError extends Error {
  constructor(
    public readonly field: string,
    public readonly reason: 'unknown-scale' | 'unknown-genre' | 'unknown-mood' | 'missing-field' | 'invalid-value',
    message: string,
  ) {
    super(message);
    this.name = 'ResolutionError';
  }
}
```

A `ResolutionError` is thrown synchronously by `direct()` and `intent()` if the resolution cannot complete. The thrown error includes the field name, the reason code, and a human-readable message.

### Composite operations

```typescript
// Convenience constructor for the common case
SignatureFactory.create(
  vocabulary: VocabularyRepository,
  intentResolver: IntentResolver,
): SignatureFactory
```

This static method constructs a factory with the standard wiring. Custom factories are also supported by passing the dependencies directly to the constructor.

---

## Validation Rules

The factory enforces the spec-0001 validation rules:

| Rule | Behavior |
|---|---|
| Unknown scale name | `ResolutionError` with reason `unknown-scale` |
| Unknown genre name | `ResolutionError` with reason `unknown-genre` |
| Unknown mood name | `ResolutionError` with reason `unknown-mood` |
| Missing `scale.name` after resolution | `ResolutionError` with reason `missing-field` |
| Missing `scale.root_pitch_class` after resolution | `ResolutionError` with reason `missing-field` |
| Missing `genre.name` after resolution | `ResolutionError` with reason `missing-field` |
| Missing `mood.name` after resolution | `ResolutionError` with reason `missing-field` |
| Performance value out of `[0, 1]` | `ResolutionError` with reason `invalid-value` |
| `root_pitch_class` outside `[0, 11]` | `ResolutionError` with reason `invalid-value` |
| User `tempo` outside genre range | Clamp + warning (not an error) |

The factory never invents values. If a required field has no source after the precedence chain is exhausted, the error is thrown.

---

## Dependencies

- spec-0001 — Musical Vocabulary & Signature Schema
- spec-0002 — Vocabulary Repository
- adr-0001 — Hexagonal Architecture
- adr-0002 — TypeScript / Node 22
- `@stratum/vocabulary` package — zod, yaml (devDependencies: vitest, typescript, @types/node)

---

## Acceptance Criteria

### Domain types

- `Scale`, `Genre`, `Mood`, `MusicalSignature` are defined as zod schemas.
- TypeScript types are inferred from the schemas via `z.infer`.
- `Provenance<T>` is a generic type with a `ProvenanceSource` literal union.
- `MusicalSignature` is fully `readonly` and every field wraps a `Provenance<T>`.

### VocabularyRepository

- `VocabularyRepository.load(rootDir)` returns a `Promise<VocabularyRepository>`.
- Constructor is private; no public `new VocabularyRepository(...)`.
- `reload()` re-reads from disk and replaces the internal maps atomically.
- A failed `load` throws a `VocabularyLoadError` with all aggregated issues.
- The repository loads the seven seed YAMLs (`phrygian`, `dorian`, `natural-minor`, `hypnotic-techno`, `deep-house`, `arrakis`, `cathedral`).

### SignatureFactory

- `direct(input)` builds a `MusicalSignature` from explicit user values, with no inference.
- `intent(input)` calls the injected `IntentResolver` to fill missing fields, then applies the same resolution.
- Per-field precedence chains match spec-0001 exactly.
- Baseline computation matches spec-0001 exactly.
- `root_pitch_class` has no baseline; missing value is a hard error.
- `performance.tempo` falls back to `genre.tempo.default` only when defined; otherwise no baseline.
- Tempo outside genre range is clamped with a warning.
- `ResolutionError` carries field name, reason code, and message.

### Testing

- All 7 seed YAMLs load successfully and pass validation.
- A YAML with a bad filename (`phrygian.yaml` containing `name: dorian`) fails with `VocabularyIssue` of kind `filename`.
- A YAML with a missing field fails with `VocabularyIssue` of kind `schema`.
- A YAML with invalid YAML syntax fails with `VocabularyIssue` of kind `parse`.
- Missing `scales/` directory fails with `kind: 'missing-dir'`.
- `direct()` with all fields produces a `MusicalSignature` with every `source: 'user'`.
- `direct()` with tempo outside range produces a clamped signature with a warning.
- `direct()` with unknown scale name throws `ResolutionError` with `reason: 'unknown-scale'`.
- Missing `root_pitch_class` after resolution throws `ResolutionError` with `reason: 'missing-field'`.
- The intent resolver receives the partial composition and returns additional fields.
- Baseline computation is correct: `phrygian + hypnotic-techno + arrakis` with no user overrides produces `provenance: {source: 'baseline'}` for all performance fields.
- Validator never invents values: a direct composition missing a required field throws.

---

## Future Work

- Cross-reference validation (effect catalog, rhythm signature catalog) — future specs.
- Performance axis extension (e.g. `density`, `brightness`) when spec-0001 grows.
- Cache layer for resolved signatures (currently resolved on every call).
- The Intent Resolver contract (spec-0004) will define the full port; v1 here is a minimal hook.

---

## Non-Goals

This Implementation Spec explicitly excludes:

- **Effect catalog**: a curated set of effect identifiers (e.g. `cavern-delay`, `long-reverb`) referenced by `Mood.effects`. The repository treats them as opaque strings; the catalog itself is a future spec.
- **Rhythm signature catalog**: a curated set of `genre.rhythm_signature` values (e.g. `four-on-the-floor`). The repository validates the field as a string; the catalog is a future spec.
- **Performance axis beyond the four defined in spec-0001** (`tempo`, `energy`, `complexity`, `groove`): no `density`, `brightness`, or any other axis. The set is closed in M1.
- **Composition generation**: this spec is domain-only. MIDI generation, audio stem rendering, and the Composition Engine are spec-0005+ (M2).
- **Live bridge integration**: any reference to Ableton Live, OSC, MCP, or `.als` files is out of scope. Those are M3.
- **Cross-vocabulary cross-references**: the repository validates intra-file schema only. A future spec will add cross-references to catalogs (effect, rhythm signature, etc.).
