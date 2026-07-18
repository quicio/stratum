---
id: spec-0002
type: spec
kind: implementation
title: "Vocabulary Repository"
status: approved
version: 0.1.0
owner: hugo
created: 2026-07-18
updated: 2026-07-18
milestone: M1
related: [spec-0001]
impl_progress: 0
tags: [vocabulary, repository, m1]
---

# Spec 0002 — Vocabulary Repository

## Vision

The Vocabulary Repository loads, validates, and exposes the canonical musical vocabulary defined by spec-0001 (scales, genres, moods) from the on-disk YAML files under `vocabulary/` to the rest of the system.

The repository is the single boundary between the YAML files (data) and the domain (code). It guarantees that no partially-loaded, invalid, or unvalidated vocabulary ever enters the domain.

The repository is the only component in the system that reads vocabulary YAML files. YAML parsing (if delegated internally) happens behind the repository boundary; no external component parses vocabulary YAML files.

---

## Design Principles

- The repository is the only component that reads YAML.
- Loaded vocabulary is validated against the schema defined by spec-0001 before being exposed.
- A failed load aborts the whole load. The repository never exposes a partial repository.
- Vocabulary YAML files are immutable for the lifetime of a process; the repository caches them.
- The repository is a pure module: it performs I/O at construction and at explicit reload() calls, never implicitly.

---

## Repository Shape

```
vocabulary/
  scales/
    phrygian.yaml
    dorian.yaml
    natural-minor.yaml
    ...
  genres/
    hypnotic-techno.yaml
    deep-house.yaml
    ...
  moods/
    arrakis.yaml
    cathedral.yaml
    ...
```

Each subdirectory contains one YAML file per vocabulary item. Filenames are kebab-case and must match the name field inside the file. A filename mismatch is a validation error.

---

## Loaded Types

The repository exposes three readonly collections after a successful load:

- `scales`: `ReadonlyMap<string, Scale>` — keyed by scale name
- `genres`: `ReadonlyMap<string, Genre>` — keyed by genre name
- `moods`: `ReadonlyMap<string, Mood>` — keyed by mood name

`Scale`, `Genre`, and `Mood` are the domain objects defined by spec-0001 (their exact representation is part of spec-0003 SignatureFactory; the repository deals in the validated domain objects, not in YAML ASTs).

The collections are exposed as readonly properties, not methods, to make the read-only intent explicit at every call site.

---

## Constructor and `load`

`VocabularyRepository` is not directly constructible. The only way to obtain an instance is through the static factory method:

```
static async load(rootDir: string): Promise<VocabularyRepository>
```

`load` performs, in order:

1. Resolve `rootDir` to an absolute path. Throw with a descriptive error if `rootDir` does not exist or is not a directory.
2. Verify that `scales/`, `genres/`, and `moods/` exist under `rootDir`. Throw with a descriptive error listing the missing paths if any is absent.
3. Load and validate all files. Throw with a `VocabularyLoadError` (see Error Model) if any file fails to load or validate.
4. On success, return a fully initialized `VocabularyRepository` instance.

If `load` fails, no `VocabularyRepository` instance is returned. The caller never holds a reference to a half-initialized repository. Tests of the repository therefore use real on-disk fixtures (success and failure cases alike), not mocks or injected loaders.

The implementation may define additional non-public constructors for internal use; they are not part of this spec.

---

## Validation

Each loaded YAML file is validated against the schema defined by spec-0001. Validation failures MUST include:

- The file path that failed.
- The list of validation errors (per field).
- The valid alternatives when the error is 'unknown vocabulary' (relevant for cross-references).

Validation MUST run on every load, including reload. The repository does not trust the YAML files on disk.

### Diagnostics

The implementation may emit diagnostic logs during load and validation. Logging is a runtime concern, not part of the architectural contract; the spec does not define a logger interface or a logging policy. Callers cannot rely on logs being emitted or on their format.

---

## Reload

async reload(): Promise<void>

Re-reads all YAML files from disk and re-validates. On success, the exposed collections are replaced atomically. Callers holding a reference to a previous VocabularyRepository instance must call reload() to see changes; the instance itself is not replaced.

---

## Error Model

The repository throws (or rejects) a single VocabularyLoadError aggregating all issues found during a load. The error carries:

- rootDir: the path being loaded
- issues: a non-empty array of VocabularyIssue objects
- Each VocabularyIssue has: filePath, kind ('parse' | 'schema' | 'filename' | 'missing-dir' | 'missing-file'), and a human-readable message.

The repository never returns a partial repository. A failed load leaves the previous state intact (or, for first load, leaves the repository in an invalid/uninitialized state that throws on every read).

---

## Cross-Reference Validation

Cross-references between vocabulary items (e.g., a Genre whose rhythm_signature would reference a RhythmSignatureCatalog) are out of scope for this spec. The repository validates intra-file schema only.

Cross-references that the spec-0001 schema declares (such as Mood.effects referencing future effect catalogs) are accepted as opaque strings in v1; the repository does not validate them. A future spec for the effect catalog will add the cross-reference check.

---

## Atomicity invariants

The following invariants are observable contract. How they are implemented is an implementation detail.

- A load is atomic. External observers never see a partially loaded repository.
- A load and a read cannot interleave. A read either sees the previous complete state or the new complete state.
- Two concurrent `load` or `reload` calls on the same instance do not corrupt internal state. The second call sees the result of the first.
- A failed load does not mutate the previously exposed state.

---

## Out of Scope

- Resolution of cross-references (handled by future specs).
- Mutation of vocabulary (vocabulary is immutable for the process lifetime).
- Hot-reload via file watcher (callers must invoke `reload()` explicitly).
- Caching across processes (the repository loads from disk every time the process starts; in-memory caching only).
- Mutation, indexing, or search of vocabulary items (callers receive readonly maps and iterate as needed).
- Defining a logger interface or logging policy (see Diagnostics).
- Specifying how YAML files are parsed (the parser is an implementation detail behind the repository boundary).

---

## Dependencies

- spec-0001 — Musical Vocabulary & Signature Schema (source of truth for field shape and semantics)
- adr-0001 — Hexagonal Architecture
- adr-0002 — TypeScript / Node 22

---

## Acceptance Criteria

- Repository loads all YAML files under vocabulary/{scales,genres,moods}/.
- A missing subdirectory fails the load with a descriptive error.
- A malformed YAML file fails the load with file path and parse error.
- A schema-invalid YAML file fails the load with file path and field-level errors.
- A filename that does not match the name field inside the file fails the load.
- After a successful load, the three readonly maps contain all loaded items, keyed by their name field.
- reload() re-reads from disk atomically.
- The repository has no I/O outside construction and reload().
- The repository imports no adapter implementation; it is a pure boundary module.
- Unit tests cover: happy path, missing directory, malformed YAML, schema violation, filename mismatch, reload, concurrency.

---

## Future Work

- Effect catalog and cross-reference validation
- Rhythm signature catalog and cross-reference validation
- File watcher for hot-reload
- Process-wide singleton accessor (optional)