# Document Hierarchy

This document is the source of truth for the type of documents Stratum produces and the rules they obey. Every spec, ADR, milestone, task, and implementation spec must respect this hierarchy.

## Hierarchy

```
ADR
  ↓
Domain Spec
  ↓
Implementation Spec
  ↓
Code
  ↓
Tests
```

Each layer constrains the next. Lower layers MUST be derivable from higher layers. Lower layers MUST NOT contradict higher layers.

## Responsibilities

### ADR (Architecture Decision Record)

* Captures a single architectural decision: a technology choice, a pattern adoption, a system boundary, a constraint.
* Stable once accepted. Superseded only by a new ADR that explicitly deprecates it.
* Lives in `adr/`.

### Domain Spec

* Defines the behavior of the domain.
* Language-agnostic. No references to TypeScript, zod, file layout, packages, or libraries.
* The single source of truth for the conceptual model.
* Lives in `specs/` with frontmatter `type: spec, kind: domain`.
* Frozen once approved. Changes require a new version (`0.2.0+`).

### Implementation Spec

* The canonical implementation of a domain concept in TypeScript.
* May specify: package structure, classes, interfaces, libraries, code organization, conventions, public APIs, testing strategy.
* MUST be derivable from the corresponding Domain Spec.
* MAY specialize, MAY concretize, MAY complete aspects the Domain Spec leaves open.
* MUST NOT contradict the Domain Spec.
* MUST NOT redefine domain behavior.
* If a contradiction exists, the bug is in the Implementation Spec, not the Domain Spec.
* Lives in `specs/` with frontmatter `type: spec, kind: implementation`.

### Code

* TypeScript source files.
* Implements Implementation Specs.
* Verified by tests.

### Tests

* Verifies the code against the spec.
* Each test traces back to an acceptance criterion in a spec.

## Precedence Rule

In case of conflict:

```
ADR > Domain Spec > Implementation Spec > Code > Tests
```

The implementation always obeys the Domain Spec. The Implementation Spec always obeys the Domain Spec. If an Implementation Spec contradicts a Domain Spec, the Implementation Spec is wrong.

## Decision Routing

When a new decision is needed during implementation:

* If the decision affects domain behavior → modify the Domain Spec (or write an ADR if it is a structural decision).
* If the decision only affects implementation → document it in the Implementation Spec.

## Spec Review Questions

Every spec review answers exactly these three questions:

1. Does it contradict an ADR or a Domain Spec?
2. Is there an ambiguity that allows two incompatible implementations?
3. Does the decision belong to the domain or only to the implementation?

If all three answers are satisfactory, the spec is approved and we move forward.

## Frontmatter Convention

Domain Spec:

```yaml
type: spec
kind: domain
```

Implementation Spec:

```yaml
type: spec
kind: implementation
```

This preserves the existing dashboard parser (which keys on `type: spec`) and adds a new dimension (`kind`) for tooling, filtering, and review.

## Goal

The goal is not minimal documentation. The goal is specifications precise enough that an implementing agent can produce a consistent, reproducible component without making design decisions, while keeping a single source of truth for the domain.

This hierarchy is closed. We do not revisit it absent a real problem during implementation.