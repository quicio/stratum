# Stratum — Implementation Plan (Day 0 + Roadmap to M3)

> **For Hermes:** Use subagent-driven-development skill to execute this plan task-by-task. Each task is a self-contained bite with an explicit TDD cycle. The correction rules below are mandatory and supersede any contradictory example in this document.

## Mandatory execution guardrails

Before implementing a task, Hermes must verify that its tests exercise the behavior named by the test and that the production artifact can run from a clean checkout. In particular:

1. Build only `src/` into `dist/`; never emit tests into the published package layout.
2. Use Node-native ESM resolution (`NodeNext`) and smoke-test the emitted CLI with Node.
3. Treat frontmatter as untrusted input. Validate types, type-specific status, IDs, dates, progress ranges, duplicate IDs, and cross-references at runtime.
4. Never swallow malformed document errors. Ignore only explicitly named templates and report every other error with its path.
5. Workspace discovery must use an unambiguous marker and required directories; an empty parse is not proof that the workspace was found.
6. Aggregation must be invariant to filesystem iteration order.
7. Day 0 is not complete until CI passes install, lint, typecheck, tests, build, package-layout checks, and a CLI smoke test from a clean checkout.
8. Do not begin M2 audio generation or M3 Live mutation until the corresponding contract and feasibility spikes described near the roadmap are resolved.

## Goal

Build **Stratum**: a hexagonal bridge between Ableton Live 12 Suite and a generative music vocabulary. User describes intent in Spanish ("percusión techno raw hipnótica 139 BPM, lead Arrakis en frigio") → Stratum generates MIDI + audio stems → pushes them into specific racks/channels/devices of a Live set. Bidirectional: Stratum reads set state to know what exists, mutates it, and can react to user edits.

**Architecture**: Three strata, hexagonal boundaries, monorepo with pnpm workspaces.
- **Stratum 1 (vocabulary)**: YAML-defined musical signatures (scales, genres, moods) → Strategy pattern.
- **Stratum 2 (generation)**: Builder + Director pipeline → MIDI tracks + audio stems.
- **Stratum 3 (live-bridge)**: Domain core (pure TS) + ports (interfaces) + adapters (OSC, MCP, M4L, .als file).

**Tracking**: Standardized markdown (specs, ADRs, milestones, tasks) parsed by a dashboard in `packages/dashboard`. Single `pnpm status` shows everything.

**Tech Stack**: TypeScript 5.6+, Node 22.23.1, pnpm 8.15, Vitest 2.x, gray-matter, chalk, commander. Live 12 Suite (OSC + MCP). Hexagonal, Clean, TDD, single-branch git (main + ephemeral feature branches).

---

## Current Context

- Working dir: `/Users/hugo/Proyectos/stratum/` (empty, `git init` done, on `main`)
- Node 22.23.1, pnpm 8.15, uv 0.11 available
- Live 12 Suite installed on this Mac
- Future remote: `git@github.com:quicio/stratum.git` (org exists, repo available)
- No code, no specs, no ADRs yet — everything greenfield
- User confirmed Day 0 priority: **build the specs/dashboard system BEFORE any musical logic**

## Day 0 Definition

**Day 0** is the minimum that lets you track work honestly: monorepo scaffold + AGENTS.md + standard markdown schema + parser/dashboard that reads your real files + the first spec, ADR, milestone, and task files. **Zero musical code on Day 0.** Music starts on Day 1.

---

## File Map (target end-state of M3)

```
stratum/
├── package.json                          # root, pnpm workspace
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── .gitignore
├── .editorconfig
├── .nvmrc                                # 22.23.1
├── .npmrc                                # strict-peer-deps
├── biome.json                            # lint + format policy
├── README.md
├── AGENTS.md                             # AI conventions: TDD, specs-first, TS, hexagonal
├── .github/
│   └── workflows/ci.yml                  # clean install, lint, types, tests, build, smoke
│
├── apps/
│   └── cli/                              # entry: `stratum generate`, `stratum push`, `stratum status`
│       ├── src/
│       │   ├── commands/
│       │   │   ├── generate.ts
│       │   │   ├── push.ts
│       │   │   ├── status.ts            # alias: dashboard
│       │   │   └── snapshot.ts
│       │   ├── intent-parser.ts          # Chain of Responsibility
│       │   └── index.ts                  # CLI entry
│       ├── tests/
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   ├── vocabulary/                       # Stratum 1
│   │   ├── src/
│   │   │   ├── scale.ts                  # Strategy interface
│   │   │   ├── scales/                   # Phrygian, Dorian, etc. (one per file)
│   │   │   ├── genre.ts                  # Strategy interface
│   │   │   ├── genres/                   # techno-raw, dub-techno, etc.
│   │   │   ├── mood.ts                   # Strategy interface
│   │   │   ├── moods/                    # arrakis, isolation, etc.
│   │   │   ├── signature-factory.ts      # Abstract Factory
│   │   │   └── index.ts
│   │   ├── vocab/                        # YAML seeds
│   │   │   ├── scales/phrygian.yaml
│   │   │   ├── scales/dorian.yaml
│   │   │   ├── genres/techno-raw.yaml
│   │   │   ├── moods/arrakis.yaml
│   │   │   └── ...
│   │   ├── tests/
│   │   └── package.json
│   │
│   ├── generation/                       # Stratum 2
│   │   ├── src/
│   │   │   ├── midi/
│   │   │   │   ├── builder.ts            # Builder
│   │   │   │   ├── director.ts           # Director
│   │   │   │   ├── builders/             # rhythm, harmony, ornament
│   │   │   │   └── index.ts
│   │   │   ├── audio/
│   │   │   │   ├── stem-renderer.ts
│   │   │   │   └── index.ts
│   │   │   └── index.ts
│   │   ├── tests/
│   │   └── package.json
│   │
│   ├── live-bridge/                      # Stratum 3 — hexagonal
│   │   ├── src/
│   │   │   ├── domain/                   # PURE: no imports from adapters
│   │   │   │   ├── musical-idea.ts
│   │   │   │   ├── live-state.ts
│   │   │   │   ├── targets.ts
│   │   │   │   └── commands.ts           # Command pattern
│   │   │   ├── ports/                    # interfaces
│   │   │   │   ├── live-push.ts
│   │   │   │   ├── live-query.ts
│   │   │   │   └── live-observer.ts
│   │   │   ├── adapters/
│   │   │   │   ├── osc/
│   │   │   │   ├── mcp/
│   │   │   │   ├── m4l/
│   │   │   │   └── file/                 # offline .als parser
│   │   │   ├── facade.ts                 # Facade pattern
│   │   │   └── index.ts
│   │   ├── tests/
│   │   └── package.json
│   │
│   ├── dashboard/                        # spec/ADR/milestone/task tracker
│   │   ├── src/
│   │   │   ├── parser.ts                 # gray-matter → typed records
│   │   │   ├── aggregator.ts             # group by milestone, status, owner
│   │   │   ├── renderer.ts               # chalk output
│   │   │   └── index.ts
│   │   ├── tests/
│   │   └── package.json
│   │   └── tsconfig.build.json            # emits src only
│   │
│   └── shared/                           # common types, errors
│       ├── src/
│       ├── tests/
│       └── package.json
│
├── specs/                                # WHAT — numbered, frontmatter
│   ├── _template.md                      # canonical schema
│   ├── 0001-vocabulary-schema.md
│   └── ...
│
├── adr/                                  # WHY — Nygard format
│   ├── _template.md
│   ├── 0001-hexagonal-bridge.md
│   ├── 0002-typescript-node22.md
│   └── 0003-pnpm-monorepo-vitest.md
│
├── milestones/                           # WHEN — group specs
│   ├── M1-vocabulary.md
│   ├── M2-generation.md
│   └── M3-live-bridge.md
│
├── tasks/                                # TODAY — dated, scoped to one spec
│   └── YYYY-MM-DD-spec-NN.md
│
├── scripts/                              # maintainer scripts (not run by users)
│   ├── new-spec.sh
│   ├── new-adr.sh
│   ├── new-milestone.sh
│   └── new-task.sh
│
├── docs/
│   ├── architecture.md                   # hexagonal overview with diagrams
│   ├── patterns.md                       # GoF catalog applied to Stratum
│   └── getting-started.md
│
└── .hermes/
    └── plans/
        └── 2026-07-18_135825-stratum-day0-and-roadmap.md   # ← this file
```

---

## Standard Markdown Schema (used by dashboard parser)

All four doc types use the same YAML frontmatter shape, with `type`-specific `status` enums.

```yaml
---
id: spec-0001                            # unique: <type>-<number>
type: spec                               # spec | adr | milestone | task
title: "Vocabulario musical: scales/genres/moods"
status: draft                            # see enums below
version: 0.1.0
owner: hugo
created: 2026-07-18
updated: 2026-07-18
milestone: M1                            # only for spec + task
related: [adr-0001]                      # cross-refs
impl_progress: 0                         # 0-100, set by humans (NOT auto-derived)
tags: [vocabulary, music]
---

# Markdown body...
```

**Status enums** (parser validates):

| type       | allowed statuses                                          |
|------------|-----------------------------------------------------------|
| spec       | `draft` · `approved` · `in_progress` · `stable` · `deprecated` |
| adr        | `proposed` · `accepted` · `superseded` · `rejected`      |
| milestone  | `planned` · `active` · `shipped` · `cancelled`           |
| task       | `todo` · `doing` · `done` · `blocked` · `cancelled`       |

The dashboard parser only reads these fields. Anything in the body is human documentation. Files whose basename starts with `_` are templates and must be ignored explicitly. Every other `.md` file in a tracked directory must either validate or make the command fail with a path-specific diagnostic.

Validation invariants:

- Frontmatter is a discriminated union keyed by `type`; each type accepts only its own status enum.
- `id` format must match `type`, IDs must be globally unique, and spec/task milestone references must exist.
- `created` and `updated` are normalized to `YYYY-MM-DD` strings immediately after YAML parsing.
- `related` and `tags` are arrays of strings; all `related` IDs must exist unless explicitly marked external.
- `impl_progress`, when present, is an integer in `0..100`.
- The filename ID and frontmatter ID must agree according to the naming convention.

---

## Milestones (the roadmap)

| Milestone | Specs | Definition of "shipped" |
|---|---|---|
| **M1 — Vocabulary** | 0001..0005 | CLI shows document progress; a dedicated vocabulary validator inventories hand-authored YAML; round-trip parse ≥ 50 valid documents and reports invalid documents without data loss |
| **M2 — Generation** | 0006..0012 | `stratum generate "techno raw 139 phrygian arrakis"` produces a `.stratum/` bundle (MIDI files + audio stems) without touching Live |
| **M3 — Live bridge** | 0013..0020 | `stratum push` against a running Live 12 sends clips + device params via OSC; FileAdapter parses a sample `.als` and reports state |

---

# Day 0 — Sprint 0: Tracking System + Monorepo Skeleton

The 16 tasks produce a runnable monorepo with a working dashboard and CI. **No musical code yet.**

---

### Task 0.1: Root `package.json` with pnpm workspace config

**Objective:** Establish monorepo root with workspace declaration, scripts, and dev tooling deps.

**Files:**
- Create: `/Users/hugo/Proyectos/stratum/package.json`
- Create: `/Users/hugo/Proyectos/stratum/pnpm-workspace.yaml`
- Create: `/Users/hugo/Proyectos/stratum/.gitignore`
- Create: `/Users/hugo/Proyectos/stratum/.editorconfig`
- Create: `/Users/hugo/Proyectos/stratum/.nvmrc`
- Create: `/Users/hugo/Proyectos/stratum/.npmrc`
- Create: `/Users/hugo/Proyectos/stratum/biome.json`

**Step 1:** Create `pnpm-workspace.yaml`:

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

**Step 2:** Create `.nvmrc`:

```
22.23.1
```

**Step 3:** Create `.npmrc`:

```
strict-peer-dependencies=true
auto-install-peers=false
engine-strict=true
```

**Step 4:** Create `.editorconfig`:

```
root = true

[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true

[*.md]
trim_trailing_whitespace = false
```

**Step 5:** Create `.gitignore`:

```
# Dependencies
node_modules/
.pnpm-store/

# Build output
dist/
*.tsbuildinfo

# Logs
*.log
npm-debug.log*
pnpm-debug.log*

# OS
.DS_Store
.AppleDouble
.LSOverride
Icon?

# Editor
.vscode/
.idea/
*.swp

# Test
coverage/
.nyc_output/

# Env
.env
.env.local
.env.*.local

# Stratum runtime artifacts
.stratum/
snapshots/
out/
```

**Step 6:** Create root `package.json`:

```json
{
  "name": "stratum",
  "version": "0.0.0",
  "private": true,
  "description": "Hexagonal bridge between Ableton Live 12 and a generative music vocabulary",
  "type": "module",
  "engines": {
    "node": ">=22.23.1",
    "pnpm": ">=8.15.0"
  },
  "packageManager": "pnpm@8.15.0",
  "scripts": {
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "test:watch": "pnpm -r test:watch",
    "lint": "biome lint .",
    "format:check": "biome format .",
    "typecheck": "pnpm -r typecheck",
    "prestatus": "pnpm --filter @stratum/dashboard build",
    "status": "pnpm --filter @stratum/dashboard start",
    "new:spec": "bash scripts/new-spec.sh",
    "new:adr": "bash scripts/new-adr.sh",
    "new:milestone": "bash scripts/new-milestone.sh",
    "new:task": "bash scripts/new-task.sh"
  },
  "devDependencies": {
    "@biomejs/biome": "1.9.4",
    "typescript": "5.6.3",
    "vitest": "2.1.4",
    "@types/node": "22.9.0"
  }
}
```

**Step 7:** Create `biome.json`:

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "organizeImports": { "enabled": true },
  "formatter": { "enabled": true, "indentStyle": "space", "indentWidth": 2 },
  "linter": { "enabled": true, "rules": { "recommended": true } },
  "files": { "ignore": ["dist", "coverage", "node_modules"] }
}
```

**Step 8:** Verify `pnpm` is happy:

```bash
cd /Users/hugo/Proyectos/stratum && pnpm install
```

Expected: creates `node_modules/` and `pnpm-lock.yaml` with no errors.

**Step 9:** Commit:

```bash
cd /Users/hugo/Proyectos/stratum && git add . && git commit -m "chore: scaffold pnpm monorepo root"
```

---

### Task 0.2: TypeScript base config

**Objective:** Single `tsconfig.base.json` every package extends. Strict mode, ESM, Node 22 lib.

**Files:**
- Create: `/Users/hugo/Proyectos/stratum/tsconfig.base.json`

**Step 1:** Write `tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2023"],
    "types": ["node"],

    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "noPropertyAccessFromIndexSignature": true,
    "exactOptionalPropertyTypes": true,

    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,

    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "exclude": ["node_modules", "dist", "tests"]
}
```

**Step 2:** Verify with placeholder (next task creates first package; validation there).

**Step 3:** Commit:

```bash
git add tsconfig.base.json && git commit -m "chore: add strict typescript base config"
```

---

### Task 0.3: Continuous integration workflow

**Objective:** Guarantee that Day 0 cannot be tagged without a passing CI on a clean checkout.

**Files:**
- Create: `/Users/hugo/Proyectos/stratum/.github/workflows/ci.yml`

**Step 1:** Write `.github/workflows/ci.yml`:

```yaml
name: ci
on:
  push:
    branches: [main]
  pull_request:
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 8.15.0
      - uses: actions/setup-node@v4
        with:
          node-version: 22.23.1
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test -- --coverage
      - run: pnpm build
      - run: pnpm prestatus
      - run: node packages/dashboard/dist/cli.js
```

**Step 2:** Commit:

```bash
git add .github && git commit -m "ci: install, lint, typecheck, test, build, smoke on push and PR"
```

---

### Task 0.4: README + AGENTS.md

**Objective:** Document what Stratum is and the rules every AI agent must follow.

**Files:**
- Create: `/Users/hugo/Proyectos/stratum/README.md`
- Create: `/Users/hugo/Proyectos/stratum/AGENTS.md`

**Step 1:** Write `README.md`:

```markdown
# Stratum

Hexagonal bridge between Ableton Live 12 and a generative music vocabulary.

## What

Describe musical intent in Spanish; Stratum produces MIDI + audio stems and pushes them into specific racks/channels of a running Live set.

Example:
```
stratum generate "percusión techno raw 139 BPM, lead Arrakis en frigio"
stratum push --target drums --rack "BD-909" --channel 3
```

## How (architecture)

Three strata, hexagonal boundaries:

1. **vocabulary** — YAML-defined scales, genres, moods (Strategy pattern)
2. **generation** — Builder + Director → MIDI tracks + audio stems
3. **live-bridge** — pure domain + ports + adapters (OSC, MCP, M4L, .als file)

See `docs/architecture.md`.

## Status

```bash
pnpm status    # dashboard of specs, ADRs, milestones, tasks
```

## Development

```bash
pnpm install
pnpm test       # all packages
pnpm typecheck
pnpm status     # see project dashboard
```

## Specs / ADRs

All design lives in `specs/`, `adr/`, `milestones/`, `tasks/`. Standardized frontmatter; see `specs/_template.md`.
```

**Step 2:** Write `AGENTS.md`:

```markdown
# AGENTS.md — Conventions for AI coding agents working on Stratum

## Project at a glance

- TypeScript 5.6+, Node 22.23.1, pnpm 8.15 workspaces
- Live 12 Suite (OSC port 11000 default)
- Hexagonal architecture (Clean) — see `docs/architecture.md`
- Spec-driven development — see `specs/_template.md`
- TDD enforced — see test-driven-development skill

## Hard rules

1. **Code in English (ASCII).** Spanish is for game narrative, user-facing copy, and personal communication only. NEVER use Spanish, Chinese, Portuguese, or other languages in code, comments, type names, or variable names. ASCII only.
2. **No production code without a failing test first.** This is non-negotiable. See test-driven-development skill.
3. **Spec before code.** A feature without a spec is technical debt. Create the spec first (or refactor existing spec). Code implementing a non-existent spec is rejected.
4. **Domain core stays pure.** `packages/live-bridge/src/domain/` and the musical model inside `packages/vocabulary/src/` must not import runtime dependencies, adapter implementations, Node I/O, `fs`, or `process`. YAML loading is an explicit loader boundary: the loader may use I/O, but it must return pure model objects and live outside the domain directories. Terminal rendering belongs in the CLI/dashboard. Type-only imports are allowed when they do not create runtime coupling.
5. **Adapters implement ports.** Every adapter (`packages/*/src/adapters/*`) must `implements` an interface from `ports/`. If it doesn't fit an existing port, add the port first.
6. **Frequent commits.** Commit every task with conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`.
7. **No scope creep.** A task is what the spec says. If you spot adjacent work, write a new spec, do NOT do it silently.

## File conventions

- **Paths**: kebab-case for directories, kebab-case for files. (`rhythm-builder.ts`, not `RhythmBuilder.ts`)
- **Classes/Types**: PascalCase. (`MusicalIdea`, `PhrygianScale`)
- **Functions/variables**: camelCase. (`parseIntent`, `keyRoot`)
- **Constants**: UPPER_SNAKE_CASE. (`DEFAULT_TEMPO_BPM`)
- **One type per file when possible.** A class with helpers can share a file, but keep it tight.

## Test conventions

- Vitest, one `*.test.ts` per source file, mirroring `src/` in `tests/`.
- Test names: `test_<unit>_<behavior>` or describe/it blocks.
- ONE assertion per test when feasible (split "and" cases).
- Watch the test fail before implementing. Always.

## Spec / ADR conventions

- Specs live in `specs/NNNN-slug.md`, ADRs in `adr/NNNN-slug.md`, milestones in `milestones/MN-slug.md`, tasks in `tasks/YYYY-MM-DD-spec-NN.md`.
- Always `ls` the directory first to find the next free number.
- Use the frontmatter schema in `specs/_template.md`. The dashboard parser depends on the field names; do not rename them.
- Mark `status` transitions explicitly (draft → approved → in_progress → stable). Do not skip steps.
- Update `updated:` and `impl_progress` whenever you change the file.

## What NOT to do

- Don't add dependencies without checking if a stdlib / sibling-package solution exists.
- Don't add ad-hoc `console.log` calls in libraries. CLI entrypoints may write intentional user output to stdout and diagnostics to stderr through a small output boundary.
- Don't commit `.env`, `node_modules`, `dist`, `.stratum/` (already in `.gitignore`).
- Don't write a README in Spanish. English only.
```

**Step 3:** Commit:

```bash
git add README.md AGENTS.md && git commit -m "docs: add README and AGENTS conventions"
```

---

### Task 0.5: Dashboard package — `package.json` + `tsconfig.json`

**Objective:** Create the `@stratum/dashboard` workspace package skeleton.

**Files:**
- Create: `/Users/hugo/Proyectos/stratum/packages/dashboard/package.json`
- Create: `/Users/hugo/Proyectos/stratum/packages/dashboard/tsconfig.json`
- Create: `/Users/hugo/Proyectos/stratum/packages/dashboard/tsconfig.build.json`
- Create: `/Users/hugo/Proyectos/stratum/packages/dashboard/vitest.config.ts`
- Create: `/Users/hugo/Proyectos/stratum/packages/dashboard/tests/.gitkeep`

**Step 1:** Create `packages/dashboard/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "noEmit": true,
    "rootDir": "."
  },
  "include": ["src/**/*", "tests/**/*", "vitest.config.ts"]
}
```

**Step 2:** Create `packages/dashboard/tsconfig.build.json` so package output contains only production sources:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "noEmit": false,
    "rootDir": "src",
    "outDir": "dist"
  },
  "include": ["src/**/*"],
  "exclude": ["tests/**/*", "vitest.config.ts"]
}
```

**Step 3:** Create `packages/dashboard/package.json`:

```json
{
  "name": "@stratum/dashboard",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    }
  },
  "bin": {
    "stratum-status": "dist/cli.js"
  },
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "lint": "biome lint src tests vitest.config.ts",
    "start": "node dist/cli.js"
  },
  "dependencies": {
    "chalk": "5.3.0",
    "gray-matter": "4.0.3",
    "zod": "3.23.8"
  },
  "devDependencies": {
    "@types/node": "22.9.0",
    "typescript": "5.6.3",
    "vitest": "2.1.4"
  }
}
```

**Step 4:** Create `packages/dashboard/vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    globals: false,
  },
});
```

**Step 5:** Create empty `tests/.gitkeep`:

```bash
touch /Users/hugo/Proyectos/stratum/packages/dashboard/tests/.gitkeep
```

**Step 5:** Run `pnpm install` to wire workspace:

```bash
cd /Users/hugo/Proyectos/stratum && pnpm install
```

Expected: `@stratum/dashboard` linked, dependencies installed.

**Step 6:** Commit:

```bash
git add packages/dashboard && git commit -m "feat(dashboard): scaffold package"
```

---

### Task 0.6: Dashboard — first failing test for frontmatter parser

**Objective:** TDD red: write the spec for the frontmatter parser, watch it fail.

**Files:**
- Create: `/Users/hugo/Proyectos/stratum/packages/dashboard/tests/parser.test.ts`
- Create: `/Users/hugo/Proyectos/stratum/packages/dashboard/tests/fixtures/specs/0001-sample.md`
- Create: `/Users/hugo/Proyectos/stratum/packages/dashboard/tests/invalid-fixtures/spec-missing-id.md`

**Step 1:** Create a fixture spec file at `tests/fixtures/specs/0001-sample.md`:

```markdown
---
id: spec-0001
type: spec
title: "Sample spec"
status: draft
version: 0.1.0
owner: hugo
created: 2026-07-18
updated: 2026-07-18
milestone: M1
related: [adr-0001]
impl_progress: 0
tags: [vocabulary, music]
---

# Sample spec

This is body text the parser must NOT touch.
```

Also create `tests/invalid-fixtures/spec-missing-id.md` with the same frontmatter but without the `id` field.

**Step 2:** Create the test file `tests/parser.test.ts` using ESM-safe paths:

```typescript
import { describe, it, expect } from 'vitest';
import { parseFrontmatter } from '../src/parser.js';

const validSpecPath = new URL('./fixtures/specs/0001-sample.md', import.meta.url);
const missingIdPath = new URL('./invalid-fixtures/spec-missing-id.md', import.meta.url);

describe('parseFrontmatter', () => {
  it('returns typed record with all required fields for a spec', async () => {
    const result = await parseFrontmatter(validSpecPath);

    expect(result.frontmatter.id).toBe('spec-0001');
    expect(result.frontmatter.type).toBe('spec');
    expect(result.frontmatter.title).toBe('Sample spec');
    expect(result.frontmatter.status).toBe('draft');
    expect(result.frontmatter.milestone).toBe('M1');
    expect(result.body).toContain('# Sample spec');
  });

  it('throws on missing required field id', async () => {
    await expect(parseFrontmatter(missingIdPath)).rejects.toThrow(/id/);
  });
});
```

**Step 3:** Run the test to verify it fails:

```bash
cd /Users/hugo/Proyectos/stratum/packages/dashboard && pnpm test
```

Expected: FAIL with "Cannot find module '../src/parser.js'" or similar.

**Step 4:** No commit yet (TDD red).

---

### Task 0.7: Dashboard — `parser.ts` minimal implementation (green)

**Objective:** Implement `parseFrontmatter` so the test passes.

**Files:**
- Create: `/Users/hugo/Proyectos/stratum/packages/dashboard/src/parser.ts`
- Create: `/Users/hugo/Proyectos/stratum/packages/dashboard/src/types.ts`
- Create: `/Users/hugo/Proyectos/stratum/packages/dashboard/src/index.ts`

**Step 1:** Create `src/types.ts`:

```typescript
import { z } from 'zod';

const dateString = z.preprocess(
  value => value instanceof Date ? value.toISOString().slice(0, 10) : value,
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
);
const progress = z.number().int().min(0).max(100).optional();
const common = {
  title: z.string().min(1),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  owner: z.string().min(1),
  created: dateString,
  updated: dateString,
  related: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
};

export const frontmatterSchema = z.discriminatedUnion('type', [
  z.object({
    ...common,
    id: z.string().regex(/^spec-\d{4}$/),
    type: z.literal('spec'),
    status: z.enum(['draft', 'approved', 'in_progress', 'stable', 'deprecated']),
    milestone: z.string().regex(/^M\d+$/),
    impl_progress: progress,
  }).strict(),
  z.object({
    ...common,
    id: z.string().regex(/^adr-\d{4}$/),
    type: z.literal('adr'),
    status: z.enum(['proposed', 'accepted', 'superseded', 'rejected']),
  }).strict(),
  z.object({
    ...common,
    id: z.string().regex(/^M\d+$/),
    type: z.literal('milestone'),
    status: z.enum(['planned', 'active', 'shipped', 'cancelled']),
  }).strict(),
  z.object({
    ...common,
    id: z.string().regex(/^task-\d{4}-\d{2}-\d{2}-.+$/),
    type: z.literal('task'),
    status: z.enum(['todo', 'doing', 'done', 'blocked', 'cancelled']),
    milestone: z.string().regex(/^M\d+$/),
    impl_progress: progress,
  }).strict(),
]);

export type Frontmatter = z.infer<typeof frontmatterSchema>;
export type DocType = Frontmatter['type'];

export interface ParsedDoc {
  filepath: string;
  frontmatter: Frontmatter;
  body: string;
}
```

**Step 2:** Create `src/parser.ts`:

```typescript
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { frontmatterSchema, type ParsedDoc } from './types.js';

export async function parseFrontmatter(input: string | URL): Promise<ParsedDoc> {
  const filepath = input instanceof URL ? fileURLToPath(input) : input;
  const raw = await readFile(filepath, 'utf-8');

  // Reject gray-matter language engines. Tracking documents are YAML only.
  if (!raw.startsWith('---\n') && !raw.startsWith('---\r\n')) {
    throw new Error(`Expected standard YAML frontmatter in ${filepath}`);
  }
  const parsed = matter(raw);
  const result = frontmatterSchema.safeParse(parsed.data);
  if (!result.success) {
    throw new Error(`Invalid frontmatter in ${filepath}: ${result.error.message}`);
  }
  return {
    filepath,
    frontmatter: result.data,
    body: parsed.content,
  };
}
```

**Step 3:** Create `src/index.ts`:

```typescript
export { parseFrontmatter } from './parser.js';
export type { ParsedDoc, Frontmatter, DocType } from './types.js';
```

**Step 4:** Run tests:

```bash
cd /Users/hugo/Proyectos/stratum/packages/dashboard && pnpm test
```

Expected: PASS — 2 tests green.

**Step 5:** Commit:

```bash
git add packages/dashboard && git commit -m "feat(dashboard): parseFrontmatter with gray-matter"
```

---

### Task 0.8: Dashboard — `parseAll` discovers every spec/ADR/milestone/task

**Objective:** Walk the four top-level dirs and parse all `.md` files; add a test for the "happy path" with multiple fixtures.

**Files:**
- Create: `/Users/hugo/Proyectos/stratum/packages/dashboard/tests/fixtures/adr/0001-sample.md`
- Create: `/Users/hugo/Proyectos/stratum/packages/dashboard/tests/fixtures/milestones/M1-sample.md`
- Create: `/Users/hugo/Proyectos/stratum/packages/dashboard/tests/fixtures/tasks/2026-07-18-spec-0001.md`
- Create: `/Users/hugo/Proyectos/stratum/packages/dashboard/tests/fixtures/specs/_template.md`
- Modify: `/Users/hugo/Proyectos/stratum/packages/dashboard/tests/parser.test.ts`
- Modify: `/Users/hugo/Proyectos/stratum/packages/dashboard/src/parser.ts`
- Modify: `/Users/hugo/Proyectos/stratum/packages/dashboard/src/index.ts`

**Step 1:** Add fixtures:

`tests/fixtures/adr/0001-sample.md`:
```markdown
---
id: adr-0001
type: adr
title: "Hexagonal bridge"
status: accepted
version: 1.0.0
owner: hugo
created: 2026-07-18
updated: 2026-07-18
related: []
tags: [architecture]
---

# ADR 0001: Hexagonal bridge

We adopt hexagonal architecture for the live-bridge package.
```

`tests/fixtures/milestones/M1-sample.md`:
```markdown
---
id: M1
type: milestone
title: "Vocabulary"
status: planned
version: 0.1.0
owner: hugo
created: 2026-07-18
updated: 2026-07-18
related: [spec-0001]
tags: [m1]
---

# M1: Vocabulary
```

`tests/fixtures/tasks/2026-07-18-spec-0001.md`:
```markdown
---
id: task-2026-07-18-spec-0001
type: task
title: "Day 0 scaffold"
status: doing
version: 0.1.0
owner: hugo
created: 2026-07-18
updated: 2026-07-18
milestone: M1
related: [spec-0001]
tags: []
---

# Tasks for Day 0
```

**Step 2:** Append test to `tests/parser.test.ts`:

```typescript
import { parseAll } from '../src/parser.js';

describe('parseAll', () => {
  it('discovers and parses all .md files under a root', async () => {
    const root = new URL('./fixtures/', import.meta.url);
    const docs = await parseAll(root);
    expect(docs.length).toBe(4);
    const types = docs.map(d => d.frontmatter.type).sort();
    expect(types).toEqual(['adr', 'milestone', 'spec', 'task']);
  });

  it('ignores explicitly named templates', async () => {
    const root = new URL('./fixtures/', import.meta.url);
    const docs = await parseAll(root);
    expect(docs.some(doc => doc.filepath.endsWith('_template.md'))).toBe(false);
  });
});
```

**Step 3:** Run, watch FAIL:

```bash
cd /Users/hugo/Proyectos/stratum/packages/dashboard && pnpm test
```

Expected: FAIL — `parseAll` is not exported.

**Step 4:** Implement `parseAll` in `src/parser.ts` (add at bottom). Extend the existing path import to include `basename` and `join`:

```typescript
import { readdir } from 'node:fs/promises';
import { basename, join } from 'node:path';

const TRACKED_DIRS = ['specs', 'adr', 'milestones', 'tasks'] as const;

function filenameMatchesDocument(doc: ParsedDoc): boolean {
  const stem = basename(doc.filepath, '.md');
  const { id, type } = doc.frontmatter;
  if (type === 'spec') return stem.startsWith(`${id.slice('spec-'.length)}-`);
  if (type === 'adr') return stem.startsWith(`${id.slice('adr-'.length)}-`);
  if (type === 'milestone') return stem.startsWith(`${id}-`);
  return stem === id.slice('task-'.length);
}

export async function parseAll(input: string | URL): Promise<ParsedDoc[]> {
  const rootDir = input instanceof URL ? fileURLToPath(input) : input;
  const docs: ParsedDoc[] = [];
  const errors: Error[] = [];

  for (const dir of TRACKED_DIRS) {
    const files = await readdir(join(rootDir, dir), { withFileTypes: true });
    for (const f of files) {
      if (!f.isFile() || !f.name.endsWith('.md') || f.name.startsWith('_')) continue;
      const fullPath = join(rootDir, dir, f.name);
      try {
        docs.push(await parseFrontmatter(fullPath));
      } catch (error) {
        errors.push(error instanceof Error ? error : new Error(String(error)));
      }
    }
  }

  const byId = new Map<string, ParsedDoc>();
  for (const doc of docs) {
    const { id } = doc.frontmatter;
    if (byId.has(id)) errors.push(new Error(`Duplicate document id '${id}'`));
    else byId.set(id, doc);
    if (!filenameMatchesDocument(doc)) {
      errors.push(new Error(`Filename does not match id '${id}': ${doc.filepath}`));
    }
  }

  for (const doc of docs) {
    const fm = doc.frontmatter;
    if ((fm.type === 'spec' || fm.type === 'task') && byId.get(fm.milestone)?.frontmatter.type !== 'milestone') {
      errors.push(new Error(`Unknown milestone '${fm.milestone}' in ${doc.filepath}`));
    }
    for (const relatedId of fm.related) {
      if (!byId.has(relatedId)) errors.push(new Error(`Unknown related id '${relatedId}' in ${doc.filepath}`));
    }
  }

  if (errors.length > 0) throw new AggregateError(errors, 'Workspace document validation failed');
  return docs;
}
```

**Step 5:** Update `src/index.ts`:

```typescript
export { parseFrontmatter, parseAll } from './parser.js';
export type { ParsedDoc, Frontmatter, DocType } from './types.js';
```

**Step 6:** Run tests, verify PASS:

```bash
cd /Users/hugo/Proyectos/stratum/packages/dashboard && pnpm test
```

Expected: PASS — 4 tests green.

**Step 7:** Commit:

```bash
git add packages/dashboard && git commit -m "feat(dashboard): parseAll discovers spec/adr/milestone/task docs"
```

---

### Task 0.9: Dashboard — `aggregator.ts` groups docs by milestone/status

**Objective:** Take parsed docs and produce structured aggregates for the renderer.

**Files:**
- Create: `/Users/hugo/Proyectos/stratum/packages/dashboard/tests/aggregator.test.ts`
- Create: `/Users/hugo/Proyectos/stratum/packages/dashboard/src/aggregator.ts`
- Modify: `/Users/hugo/Proyectos/stratum/packages/dashboard/src/index.ts`

**Step 1:** Write failing test `tests/aggregator.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { aggregate } from '../src/aggregator.js';
import type { ParsedDoc, Frontmatter } from '../src/types.js';

const fixtures: ParsedDoc[] = [
  {
    filepath: 'specs/0001-vocab.md',
    frontmatter: {
      id: 'spec-0001', type: 'spec', title: 'Vocab', status: 'draft',
      version: '0.1.0', owner: 'hugo', created: '2026-07-18', updated: '2026-07-18',
      milestone: 'M1', related: [], impl_progress: 0, tags: [],
    } satisfies Frontmatter,
    body: '',
  },
  {
    filepath: 'milestones/M1-vocab.md',
    frontmatter: {
      id: 'M1', type: 'milestone', title: 'Vocab', status: 'planned',
      version: '0.1.0', owner: 'hugo', created: '2026-07-18', updated: '2026-07-18',
      related: [], tags: [],
    } satisfies Frontmatter,
    body: '',
  },
];

describe('aggregate', () => {
  it('groups specs by milestone', () => {
    const result = aggregate(fixtures);
    expect(result.milestones['M1']).toBeDefined();
    expect(result.milestones['M1'].specs.length).toBe(1);
    expect(result.milestones['M1'].milestone.frontmatter.title).toBe('Vocab');
  });

  it('separates adrs from specs/tasks/milestones', () => {
    const result = aggregate(fixtures);
    expect(result.adrs.length).toBe(0);
    expect(result.milestones['M1'].specs.length).toBe(1);
  });

  it('is invariant to input order', () => {
    expect(aggregate([...fixtures].reverse())).toEqual(aggregate(fixtures));
  });
});
```

**Step 2:** Run, watch FAIL:

```bash
pnpm test
```

Expected: FAIL — `aggregate` not exported.

**Step 3:** Implement `src/aggregator.ts`:

```typescript
import type { ParsedDoc, Frontmatter } from './types.js';

export interface MilestoneGroup {
  milestone: ParsedDoc;
  specs: ParsedDoc[];
  tasks: ParsedDoc[];
}

export interface Aggregated {
  milestones: Record<string, MilestoneGroup>;
  adrs: ParsedDoc[];
  orphans: ParsedDoc[]; // specs/tasks without a milestone
}

export function aggregate(docs: ParsedDoc[]): Aggregated {
  const milestones: Record<string, MilestoneGroup> = {};
  const adrs: ParsedDoc[] = [];
  const orphans: ParsedDoc[] = [];

  // First pass indexes containers so association never depends on readdir order.
  for (const doc of docs) {
    const fm = doc.frontmatter;
    if (fm.type === 'milestone') {
      if (milestones[fm.id]) throw new Error(`Duplicate milestone '${fm.id}'`);
      milestones[fm.id] = { milestone: doc, specs: [], tasks: [] };
    } else if (fm.type === 'adr') {
      adrs.push(doc);
    }
  }

  // Second pass associates children after all milestones are known.
  for (const doc of docs) {
    const fm = doc.frontmatter;
    if (fm.type !== 'spec' && fm.type !== 'task') continue;
    const group = milestones[fm.milestone];
    if (!group) {
      orphans.push(doc);
    } else if (fm.type === 'spec') {
      group.specs.push(doc);
    } else {
      group.tasks.push(doc);
    }
  }

  for (const group of Object.values(milestones)) {
    group.specs.sort((a, b) => a.frontmatter.id.localeCompare(b.frontmatter.id));
    group.tasks.sort((a, b) => a.frontmatter.id.localeCompare(b.frontmatter.id));
  }
  adrs.sort((a, b) => a.frontmatter.id.localeCompare(b.frontmatter.id));
  orphans.sort((a, b) => a.frontmatter.id.localeCompare(b.frontmatter.id));

  return { milestones, adrs, orphans };
}

export function calculateMilestoneProgress(group: MilestoneGroup): number {
  // Specs are the unit of milestone delivery; task status is displayed separately.
  const items = group.specs;
  if (items.length === 0) return 0;
  const sum = items.reduce((acc, doc) => acc + (doc.frontmatter.impl_progress ?? 0), 0);
  return Math.round(sum / items.length);
}
```

**Step 4:** Update `src/index.ts`:

```typescript
export { parseFrontmatter, parseAll } from './parser.js';
export { aggregate, calculateMilestoneProgress } from './aggregator.js';
export type { Aggregated, MilestoneGroup } from './aggregator.js';
export type { ParsedDoc, Frontmatter, DocType } from './types.js';
```

**Step 5:** Run tests, verify PASS:

```bash
pnpm test
```

Expected: PASS — 6 tests green total.

**Step 6:** Commit:

```bash
git add packages/dashboard && git commit -m "feat(dashboard): aggregator groups docs by milestone"
```

---

### Task 0.10: Dashboard — `renderer.ts` outputs the ASCII dashboard

**Objective:** Render the dashboard to stdout using chalk.

**Files:**
- Create: `/Users/hugo/Proyectos/stratum/packages/dashboard/tests/renderer.test.ts`
- Create: `/Users/hugo/Proyectos/stratum/packages/dashboard/src/renderer.ts`
- Modify: `/Users/hugo/Proyectos/stratum/packages/dashboard/src/index.ts`

**Step 1:** Write failing test `tests/renderer.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { renderDashboard } from '../src/renderer.js';
import { aggregate } from '../src/aggregator.js';
import type { ParsedDoc, Frontmatter } from '../src/types.js';

const docs: ParsedDoc[] = [
  {
    filepath: 'specs/0001-vocab.md',
    frontmatter: {
      id: 'spec-0001', type: 'spec', title: 'Vocab', status: 'draft',
      version: '0.1.0', owner: 'hugo', created: '2026-07-18', updated: '2026-07-18',
      milestone: 'M1', related: [], impl_progress: 0, tags: [],
    } satisfies Frontmatter,
    body: '',
  },
  {
    filepath: 'milestones/M1-vocab.md',
    frontmatter: {
      id: 'M1', type: 'milestone', title: 'Vocab', status: 'planned',
      version: '0.1.0', owner: 'hugo', created: '2026-07-18', updated: '2026-07-18',
      related: [], tags: [],
    } satisfies Frontmatter,
    body: '',
  },
];

describe('renderDashboard', () => {
  it('contains the milestone id and title', () => {
    const agg = aggregate(docs);
    const out = renderDashboard(agg);
    expect(out).toContain('M1');
    expect(out).toContain('Vocab');
    expect(out).toContain('spec-0001');
  });
});
```

**Step 2:** Run, watch FAIL:

```bash
pnpm test
```

Expected: FAIL — `renderDashboard` not exported.

**Step 3:** Implement `src/renderer.ts`:

```typescript
import chalk from 'chalk';
import type { Aggregated, MilestoneGroup } from './aggregator.js';
import { calculateMilestoneProgress } from './aggregator.js';

const BAR_WIDTH = 10;

function progressBar(pct: number): string {
  const safePct = Math.min(100, Math.max(0, pct));
  const filled = Math.round((safePct / 100) * BAR_WIDTH);
  const empty = BAR_WIDTH - filled;
  return chalk.green('▓'.repeat(filled)) + chalk.gray('░'.repeat(empty));
}

function statusIcon(status: string): string {
  switch (status) {
    case 'draft': case 'planned': case 'todo': case 'proposed':
      return chalk.gray('○');
    case 'approved': case 'doing': case 'in_progress': case 'active':
      return chalk.yellow('◐');
    case 'stable': case 'shipped': case 'done': case 'accepted':
      return chalk.green('✓');
    case 'deprecated': case 'superseded': case 'cancelled': case 'rejected':
      return chalk.red('✗');
    case 'blocked':
      return chalk.red('✗');
    default:
      return ' ';
  }
}

export function renderDashboard(agg: Aggregated): string {
  const lines: string[] = [];
  const date = new Date().toISOString().slice(0, 10);

  lines.push('');
  lines.push(chalk.bold.cyan('═══════════════════════════════════════════════════════════════'));
  lines.push(chalk.bold.cyan(`  STRATUM  ·  Dashboard  ·  ${date}`));
  lines.push(chalk.bold.cyan('═══════════════════════════════════════════════════════════════'));
  lines.push('');

  const milestones = Object.values(agg.milestones).sort((a, b) =>
    a.milestone.frontmatter.id.localeCompare(b.milestone.frontmatter.id),
  );

  for (const group of milestones) {
    const fm = group.milestone.frontmatter;
    const pct = calculateMilestoneProgress(group);
    lines.push(
      `${chalk.bold(fm.id)} — ${fm.title.padEnd(28)} [${progressBar(pct)}]  ${String(pct).padStart(3)}%   ${chalk.cyan(fm.status)}`,
    );
    for (const spec of group.specs.sort((a, b) => a.frontmatter.id.localeCompare(b.frontmatter.id))) {
      lines.push(
        `    ${statusIcon(spec.frontmatter.status)} ${spec.frontmatter.id}  ${spec.frontmatter.title.padEnd(40)}   ${chalk.cyan(spec.frontmatter.status)}`,
      );
    }
    for (const task of group.tasks.sort((a, b) => a.frontmatter.created.localeCompare(b.frontmatter.created))) {
      lines.push(
        `    ${statusIcon(task.frontmatter.status)} ${chalk.gray(task.frontmatter.id)}  ${chalk.gray(task.frontmatter.title)}`,
      );
    }
    lines.push('');
  }

  if (agg.adrs.length > 0) {
    lines.push(chalk.bold('  ADR (decisiones arquitectónicas)'));
    for (const adr of agg.adrs.sort((a, b) => a.frontmatter.id.localeCompare(b.frontmatter.id))) {
      lines.push(
        `    ${statusIcon(adr.frontmatter.status)} ${adr.frontmatter.id}  ${adr.frontmatter.title.padEnd(40)}   ${chalk.cyan(adr.frontmatter.status)}`,
      );
    }
    lines.push('');
  }

  if (agg.orphans.length > 0) {
    lines.push(chalk.yellow(`  ⚠ ${agg.orphans.length} orphan(s) (specs/tasks without milestone):`));
    for (const o of agg.orphans) {
      lines.push(`    ${o.frontmatter.id}  ${o.frontmatter.title}`);
    }
  }

  lines.push(chalk.bold.cyan('═══════════════════════════════════════════════════════════════'));
  return lines.join('\n');
}
```

**Step 4:** Update `src/index.ts`:

```typescript
export { parseFrontmatter, parseAll } from './parser.js';
export { aggregate, calculateMilestoneProgress } from './aggregator.js';
export { renderDashboard } from './renderer.js';
export type { Aggregated, MilestoneGroup } from './aggregator.js';
export type { ParsedDoc, Frontmatter, DocType } from './types.js';
```

**Step 5:** Run tests, verify PASS:

```bash
pnpm test
```

Expected: PASS — 7 tests green.

**Step 6:** Commit:

```bash
git add packages/dashboard && git commit -m "feat(dashboard): terminal renderer with chalk"
```

---

### Task 0.11: Dashboard — `cli.ts` walks the workspace root

**Objective:** Provide a binary entry point that walks from the workspace root, not a test fixtures dir.

**Files:**
- Create: `/Users/hugo/Proyectos/stratum/packages/dashboard/src/cli.ts`
- Modify: `/Users/hugo/Proyectos/stratum/packages/dashboard/package.json` (already has bin)

**Step 1:** Create `src/cli.ts`:

```typescript
#!/usr/bin/env node
import { access } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { parseAll } from './parser.js';
import { aggregate } from './aggregator.js';
import { renderDashboard } from './renderer.js';

const REQUIRED_PATHS = ['pnpm-workspace.yaml', 'specs', 'adr', 'milestones', 'tasks'] as const;

async function isWorkspaceRoot(directory: string): Promise<boolean> {
  try {
    await Promise.all(REQUIRED_PATHS.map(path => access(join(directory, path))));
    return true;
  } catch {
    return false;
  }
}

async function findWorkspaceRoot(start: string): Promise<string> {
  let cursor = resolve(start);
  while (true) {
    if (await isWorkspaceRoot(cursor)) return cursor;
    const parent = dirname(cursor);
    if (parent === cursor) throw new Error('Could not locate the Stratum workspace root');
    cursor = parent;
  }
}

async function main(): Promise<void> {
  const root = await findWorkspaceRoot(process.cwd());
  const docs = await parseAll(root);
  process.stdout.write(`${renderDashboard(aggregate(docs))}\n`);
}

main().catch(err => {
  if (err instanceof AggregateError) {
    for (const cause of err.errors) process.stderr.write(`${String(cause)}\n`);
  } else {
    process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
  }
  process.exitCode = 1;
});
```

**Step 2:** Build the package:

```bash
cd /Users/hugo/Proyectos/stratum/packages/dashboard && pnpm build
```

Expected: `dist/cli.js` and `dist/index.js` exist, `dist/src/` and `dist/tests/` do not exist, and `node dist/cli.js` exits 0 when run from the workspace root. Integration tests (from a nested directory, from outside the workspace, with an invalid document) are split into Task 0.11b to keep this task bite-sized.

**Step 3:** Commit:

```bash
git add packages/dashboard && git commit -m "feat(dashboard): cli entry walks workspace"
```

---

### Task 0.11b: Dashboard — CLI integration tests via `node:child_process`

**Objective:** Verify the `cli.ts` binary behaves correctly when invoked as a real subprocess from various working directories and with various workspace contents.

**Files:**
- Create: `/Users/hugo/Proyectos/stratum/packages/dashboard/tests/cli.test.ts`
- Create: `/Users/hugo/Proyectos/stratum/packages/dashboard/tests/fixtures/workspace/{specs,adr,milestones,tasks}/.gitkeep`
- Create: `/Users/hugo/Proyectos/stratum/packages/dashboard/tests/fixtures/workspace/specs/0001-fixture.md`
- Create: `/Users/hugo/Proyectos/stratum/packages/dashboard/tests/fixtures/workspace/specs/0001-broken.md`

**Step 1:** Write the failing test `tests/cli.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const CLI_PATH = resolve(dirname(fileURLToPath(import.meta.url)), '../dist/cli.js');
const FIXTURE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), 'fixtures/workspace');
const NESTED = join(FIXTURE_ROOT, 'deeply/nested/cwd');

function setupWorkspace(): void {
  for (const d of ['specs', 'adr', 'milestones', 'tasks']) {
    mkdirSync(join(FIXTURE_ROOT, d), { recursive: true });
  }
  writeFileSync(
    join(FIXTURE_ROOT, 'pnpm-workspace.yaml'),
    "packages:\n  - 'apps/*'\n  - 'packages/*'\n",
  );
  writeFileSync(join(FIXTURE_ROOT, 'specs/0001-fixture.md'), `---
id: spec-0001
type: spec
title: "Fixture"
status: draft
version: 0.1.0
owner: hugo
created: 2026-07-18
updated: 2026-07-18
milestone: M1
related: []
tags: []
---

# Fixture spec body
`);
  mkdirSync(NESTED, { recursive: true });
}

describe('cli (integration)', () => {
  it('renders dashboard when invoked from the workspace root', () => {
    setupWorkspace();
    const result = spawnSync('node', [CLI_PATH], { cwd: FIXTURE_ROOT, encoding: 'utf-8' });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('STRATUM');
    expect(result.stdout).toContain('spec-0001');
  });

  it('finds the workspace root when invoked from a nested cwd', () => {
    const result = spawnSync('node', [CLI_PATH], { cwd: NESTED, encoding: 'utf-8' });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('STRATUM');
  });

  it('exits non-zero with a diagnostic when invoked outside any workspace', () => {
    const result = spawnSync('node', [CLI_PATH], { cwd: '/tmp', encoding: 'utf-8' });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Could not locate the Stratum workspace root');
  });

  it('reports every invalid document via AggregateError and exits non-zero', () => {
    // Write a spec with an invalid status to trigger zod failure
    writeFileSync(join(FIXTURE_ROOT, 'specs/0001-broken.md'), `---
id: spec-9999
type: spec
title: "Broken"
status: not_a_real_status
version: 0.1.0
owner: hugo
created: 2026-07-18
updated: 2026-07-18
milestone: M1
related: []
tags: []
---

# Broken body
`);
    const result = spawnSync('node', [CLI_PATH], { cwd: FIXTURE_ROOT, encoding: 'utf-8' });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('0001-broken.md');
    rmSync(join(FIXTURE_ROOT, 'specs/0001-broken.md'));
  });
});
```

**Step 2:** Run, watch FAIL:

```bash
cd /Users/hugo/Proyectos/stratum/packages/dashboard && pnpm test
```

Expected: FAIL — `tests/cli.test.ts` cannot find the binary at `dist/cli.js` or fixtures are missing.

**Step 3:** Build the package so `dist/cli.js` exists:

```bash
pnpm build
```

**Step 4:** Run tests, verify PASS:

```bash
pnpm test
```

Expected: PASS — all four integration tests green, total dashboard suite ≥ 11 tests green.

**Step 5:** Commit:

```bash
git add packages/dashboard && git commit -m "test(dashboard): cli integration tests for workspace discovery and error reporting"
```

---

### Task 0.12: Spec template + first real spec/ADR/milestone/task files

**Objective:** Author the canonical template and the FIRST set of real docs so the dashboard has something to render.

**Files:**
- Create: `/Users/hugo/Proyectos/stratum/specs/_template.md`
- Create: `/Users/hugo/Proyectos/stratum/adr/_template.md`
- Create: `/Users/hugo/Proyectos/stratum/milestones/_template.md`
- Create: `/Users/hugo/Proyectos/stratum/tasks/_template.md`
- Create: `/Users/hugo/Proyectos/stratum/specs/0001-vocabulary-schema.md`
- Create: `/Users/hugo/Proyectos/stratum/adr/0001-hexagonal-bridge.md`
- Create: `/Users/hugo/Proyectos/stratum/adr/0002-typescript-node22.md`
- Create: `/Users/hugo/Proyectos/stratum/adr/0003-pnpm-monorepo-vitest.md`
- Create: `/Users/hugo/Proyectos/stratum/milestones/M1-vocabulary.md`
- Create: `/Users/hugo/Proyectos/stratum/milestones/M2-generation.md`
- Create: `/Users/hugo/Proyectos/stratum/milestones/M3-live-bridge.md`
- Create: `/Users/hugo/Proyectos/stratum/tasks/2026-07-18-day0-scaffold.md`

**Step 1:** Create `specs/_template.md`:

```markdown
---
id: spec-NNNN
type: spec
title: "<short imperative title>"
status: draft
version: 0.1.0
owner: hugo
created: YYYY-MM-DD
updated: YYYY-MM-DD
milestone: MX
related: []
impl_progress: 0
tags: []
---

# <Title>

## Vision
<one paragraph: what and why>

## Behavior
<concrete description; user-visible behavior; data structures; formulas>

## Edge cases
<list known edge cases and how to handle them>

## Dependencies
<specs this depends on; ADRs that apply>

## Acceptance criteria
<checklist for "done">
- [ ]
- [ ]

## Metadata
- Status: draft
- Author: hugo
- Created: YYYY-MM-DD
```

**Step 2:** Create `adr/_template.md` (Nygard format):

```markdown
---
id: adr-NNNN
type: adr
title: "<decision title>"
status: proposed
version: 0.1.0
owner: hugo
created: YYYY-MM-DD
updated: YYYY-MM-DD
related: []
tags: []
---

# ADR-NNNN: <title>

## Status
proposed · YYYY-MM-DD

## Context
<the forces at play; technical, political, social, project-local>

## Decision
<the decision made; "We will ...">

## Consequences
<positive, negative, and neutral consequences>

## Alternatives considered
<what we rejected and why>
```

**Step 3:** Create `milestones/_template.md`:

```markdown
---
id: MX
type: milestone
title: "<milestone name>"
status: planned
version: 0.1.0
owner: hugo
created: YYYY-MM-DD
updated: YYYY-MM-DD
related: []
tags: []
---

# Milestone MX — <name>

## Goal
<one paragraph>

## Specs in scope
- spec-NNNN

## Definition of done
<checklist>
- [ ]

## Status
planned
```

**Step 4:** Create `tasks/_template.md`:

```markdown
---
id: task-YYYY-MM-DD-spec-NNNN
type: task
title: "<short title>"
status: todo
version: 0.1.0
owner: hugo
created: YYYY-MM-DD
updated: YYYY-MM-DD
milestone: MX
related: [spec-NNNN]
tags: []
---

# Tasks for spec-NNNN — YYYY-MM-DD

## Today
- [ ] T1 ...
- [ ] T2 ...

## Done
- (none yet)

## Blocked / questions
- (none)
```

**Step 5:** Create real `specs/0001-vocabulary-schema.md`:

```markdown
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
Define a YAML-based vocabulary of musical signatures that Stratum consumes. A signature is a tuple `{scale, genre, mood}` whose combinations are validated for coherence (e.g., a frigian + techno-raw + arrakis combination is valid; a lydian + dub-techno + isolation combination needs explicit opt-in).

## Behavior

### Scale
A scale is defined by:
- `name`: kebab-case identifier (`phrygian`)
- `root_pitch_class`: integer 0-11 using MIDI convention (`C=0`, `C#=1`, ..., `B=11`). A scale does not fix its root; combining `phrygian` with `root_pitch_class=4` produces E phrygian.
- `intervals`: semitone offsets from root, ascending
- `character`: short evocative tag (`dark`, `tense`, `exotic`)

### Genre
- `name`: kebab-case (`techno-raw`)
- `bpm_range`: [min, max]
- `rhythm_signature`: drum pattern abstraction (kick/hat/perc placement)
- `kick_dominance`: 0-1 (how much sub is taken by kick)
- `harmonic_density`: notes-per-bar (sparse to busy)

### Mood
- `name`: kebab-case (`arrakis`)
- `fx_chain`: ordered list of effect hints (reverb_ms, delay_ms, filter_cutoff_hz, ...)
- `ornamentation`: pattern of grace notes / glissandi
- `register`: bass / mid / high / full

### Combination validity
- A `SignatureFactory.fromYaml(scale, genre, mood)` returns a `MusicalSignature`.
- Validity rules encoded per genre (e.g., `techno-raw` accepts `phrygian` automatically but requires explicit override for `lydian`).

## Edge cases
- Unknown scale/genre/mood → throw with a list of valid options
- Conflicting BPM (genre says 120-130, intent says 139) → clamp + warn, never fail silently
- Empty mood → fall back to genre defaults

## Dependencies
- adr-0001 (hexagonal bridge)
- adr-0002 (TS/Node22)

## Acceptance criteria
- [ ] `SignatureFactory.fromYaml('phrygian', 'techno-raw', 'arrakis')` returns a valid signature
- [ ] Unknown combo throws with helpful message
- [ ] YAML files for at least 3 scales, 2 genres, 2 moods committed
- [ ] Unit tests cover all happy paths and edge cases

## Metadata
- Status: draft
- Author: hugo
- Created: 2026-07-18
```

**Step 6:** Create the three ADRs (copy structure from template):

`adr/0001-hexagonal-bridge.md`:
```markdown
---
id: adr-0001
type: adr
title: "Hexagonal architecture for live-bridge"
status: accepted
version: 1.0.0
owner: hugo
created: 2026-07-18
updated: 2026-07-18
related: []
tags: [architecture]
---

# ADR 0001: Hexagonal Architecture for live-bridge

## Status
accepted · 2026-07-18

## Context
The live-bridge package must integrate with Ableton Live via multiple mechanisms (OSC, MCP, Max for Live, offline `.als` parsing). Each mechanism has its own I/O model and failure modes. We need a way to keep musical-domain logic independent of any specific transport.

## Decision
We adopt hexagonal architecture (Alistair Cockburn): a pure domain core (`packages/live-bridge/src/domain/`) defines types like `MusicalIdea`, `LiveState`, `Command`. Ports (`src/ports/`) are TypeScript interfaces. Adapters (`src/adapters/{osc,mcp,m4l,file}/`) implement ports. The domain depends on no adapter.

## Consequences
Positive:
- Domain testable without Live
- New transports added by writing one adapter, no domain change
- Mocking ports in tests is trivial

Negative:
- More files for small features
- Indirection cost (need to know which port a method comes from)

## Alternatives considered
- **Direct integration** (no port): rejected; Live 12 OSC and MCP have very different shapes; would entangle domain with both.
- **Plugin system with dynamic loading**: rejected as YAGNI; static imports are fine for now.
```

`adr/0002-typescript-node22.md`: similar structure, decision: TypeScript 5.6 + Node 22.23.1 + ESM only, no CJS.

`adr/0003-pnpm-monorepo-vitest.md`: decision: pnpm workspaces, Vitest as test runner.

**Step 7:** Create the three milestones:

`milestones/M1-vocabulary.md`: status `active`, contains specs 0001..0005 (placeholder for now), definition of done = dashboard can read M1.

`milestones/M2-generation.md`: status `planned`, contains specs 0006..0012.

`milestones/M3-live-bridge.md`: status `planned`, contains specs 0013..0020.

**Step 8:** Create the first task `tasks/2026-07-18-day0-scaffold.md`:

```markdown
---
id: task-2026-07-18-day0-scaffold
type: task
title: "Day 0 scaffold: monorepo + dashboard"
status: doing
version: 0.1.0
owner: hugo
created: 2026-07-18
updated: 2026-07-18
milestone: M1
related: [spec-0001]
tags: []
---

# Tasks for Day 0 — 2026-07-18

## Today
- [x] T0.1 root package.json
- [x] T0.2 tsconfig.base
- [x] T0.3 CI workflow
- [x] T0.4 README + AGENTS.md
- [x] T0.5 dashboard package skeleton
- [x] T0.6 parser test (red)
- [x] T0.7 parser implementation (green)
- [x] T0.8 parseAll discovery
- [x] T0.9 aggregator
- [x] T0.10 renderer
- [x] T0.11 cli entry
- [ ] T0.11b cli integration tests via child_process
- [ ] T0.12 first real spec/ADR/milestone/task files
- [ ] T0.13 dashboard renders the real workspace
- [ ] T0.14 author scaffold scripts (new-spec, new-adr, ...)
- [ ] T0.15 final commit + status check

## Done
- (filling in as we go)

## Blocked / questions
- (none)
```

**Step 9:** Commit:

```bash
cd /Users/hugo/Proyectos/stratum && git add specs adr milestones tasks && git commit -m "docs: templates + first spec, ADRs, milestones, task"
```

---

### Task 0.13: Run the dashboard — verify it reads real workspace

**Objective:** Build the dashboard package and confirm the rendered output includes M1, M2, M3, all three ADRs, spec-0001, and the task.

**Files:**
- (no file changes; verification step)

**Step 1:** Rebuild dashboard:

```bash
cd /Users/hugo/Proyectos/stratum/packages/dashboard && pnpm build
```

**Step 2:** Run from workspace root:

```bash
cd /Users/hugo/Proyectos/stratum && node packages/dashboard/dist/cli.js
```

Expected output (approximate, ASCII colors will differ):
```
═══════════════════════════════════════════════════════════════
  STRATUM  ·  Dashboard  ·  2026-07-18
═══════════════════════════════════════════════════════════════

M1 — Vocabulary                    [░░░░░░░░░░]    0%   active
    ○ spec-0001  Vocabulary musical scales/genres/moods        draft
    ◐ task-2026-07-18-day0-scaffold  Day 0 scaffold             doing

M2 — Generation                    [░░░░░░░░░░]    0%   planned

M3 — Live-bridge                   [░░░░░░░░░░]    0%   planned

  ADR (decisiones arquitectónicas)
    ✓ adr-0001  Hexagonal architecture for live-bridge         accepted
    ✓ adr-0002  TypeScript + Node 22                            accepted
    ✓ adr-0003  pnpm monorepo + Vitest                          accepted

═══════════════════════════════════════════════════════════════
```

**Step 3:** If the output is correct, no commit needed (this is verification of T0.12's commit). If you had to fix anything, commit a fix.

---

### Task 0.14: Author scaffold scripts (`new-spec.sh`, `new-adr.sh`, `new-milestone.sh`, `new-task.sh`)

**Objective:** Provide shell scripts that auto-number the next doc and copy the template with substituted fields.

**Files:**
- Create: `/Users/hugo/Proyectos/stratum/scripts/new-spec.sh`
- Create: `/Users/hugo/Proyectos/stratum/scripts/new-adr.sh`
- Create: `/Users/hugo/Proyectos/stratum/scripts/new-milestone.sh`
- Create: `/Users/hugo/Proyectos/stratum/scripts/new-task.sh`

**Step 1:** Create `scripts/new-spec.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

NEXT=$(printf "%04d" "$(($(ls specs/ | grep -E '^[0-9]' | grep -v _template | sed 's/-.*//' | sort -n | tail -1 | sed 's/^0*//' || echo 0) + 1))")

SLUG="${1:-untitled}"
TITLE="${2:-Untitled spec}"
DATE=$(date +%Y-%m-%d)
FILE="specs/${NEXT}-${SLUG}.md"

cp specs/_template.md "$FILE"
sed -i '' "s/spec-NNNN/spec-${NEXT}/g; s/YYYY-MM-DD/${DATE}/g; s|<title>|\"${TITLE}\"|; s|<Title>|${TITLE}|; s|<short imperative title>|${TITLE}|" "$FILE"

echo "Created $FILE"
echo "Status: draft — remember to update milestone, related, impl_progress."
```

**Step 2:** Repeat pattern for the other three scripts (`new-adr.sh`, `new-milestone.sh`, `new-task.sh`), adapting:
- `new-adr.sh`: prefix `adr-NNNN`, dir `adr/`
- `new-milestone.sh`: prefix `MN`, dir `milestones/`, format `M1`/`M2`/...
- `new-task.sh`: id is `task-YYYY-MM-DD-spec-NN`, requires spec ref argument

**Step 3:** Make scripts executable:

```bash
chmod +x /Users/hugo/Proyectos/stratum/scripts/*.sh
```

**Step 4:** Smoke-test:

```bash
cd /Users/hugo/Proyectos/stratum && bash scripts/new-spec.sh smoke-test "Smoke test"
```

Expected: `Created specs/0002-smoke-test.md`. Verify file exists, then delete:

```bash
rm /Users/hugo/Proyectos/stratum/specs/0002-smoke-test.md
```

**Step 5:** Commit:

```bash
git add scripts && git commit -m "chore: scaffold scripts for spec/adr/milestone/task creation"
```

---

### Task 0.15: Final Day 0 commit + dashboard sanity check

**Objective:** Confirm `pnpm status` works end-to-end; commit any stragglers; tag Day 0.

**Files:**
- (verification; no new files unless fixes)

**Step 1:** Install root deps to wire `pnpm status`:

```bash
cd /Users/hugo/Proyectos/stratum && pnpm install
```

**Step 2:** Run dashboard via root script:

```bash
cd /Users/hugo/Proyectos/stratum && pnpm status
```

Expected: Same output as T0.13 step 2.

**Step 3:** Run all tests across the monorepo:

```bash
cd /Users/hugo/Proyectos/stratum && pnpm test
```

Expected: 7 tests green in dashboard package.

**Step 4:** Update the task file to mark T0.13–T0.15 as done and set `status: done`:

```yaml
status: done
impl_progress: 100
```

Run the dashboard again to confirm.

**Step 5:** Tag Day 0:

```bash
cd /Users/hugo/Proyectos/stratum && git add . && git commit -m "chore(day0): close out Day 0 — dashboard live, all tasks done"
git tag day0
```

---

# Sprint 1 — Milestone M1: Vocabulary (specs 0001..0005)

After Day 0, M1 builds the actual vocabulary layer. Skeleton only here; full detail in subsequent plans once Day 0 lands.

| Spec | Title | Status target |
|---|---|---|
| spec-0001 | Vocabulary schema | in_progress |
| spec-0002 | Phrygian + Dorian + Harmonic minor scales (3 seed YAMLs) | draft |
| spec-0003 | Techno-raw + Dub-techno genres (2 seed YAMLs) | draft |
| spec-0004 | Arrakis + Isolation moods (2 seed YAMLs) | draft |
| spec-0005 | Signature factory + combination validation | draft |

**M1 ship criterion**: `pnpm status` reflects M1 progress; user can hand-author a YAML and the dashboard reflects it; `SignatureFactory.fromYaml(...)` round-trips for all combinations.

---

# Sprint 2 — Milestone M2: Generation (specs 0006..0012)

| Spec | Title |
|---|---|
| spec-0006 | Rhythm builder (kick/hat/perc placement from genre) |
| spec-0007 | Harmony builder (progression in scale) |
| spec-0008 | Ornament builder (mood-specific ornamentation) |
| spec-0009 | Director (orchestrates builders for an intent) |
| spec-0010 | MIDI serialization (notes → `.mid` files via `midi-writer-js` or `easymidi`) |
| spec-0011 | Audio stem renderer (drone, pad, fx) |
| spec-0012 | End-to-end: `stratum generate "<intent>"` → `.stratum/` bundle |

**Mandatory pre-M2 spikes** (must complete and merge before spec-0010):

| Spike ID | Title | Required ADR | Deliverable |
|---|---|---|---|
| spec-0010-a | MIDI library selection: `midi-writer-js` vs `easymidi` | adr-0010-midi-library.md | Locked library choice + reason the rejected option loses, captured before any generator code |
| spec-0011-a | Audio stem renderer feasibility: render (FFmpeg / SoX / node) vs model (HeartMuLa / Suno) | adr-0011-audio-renderer.md | Locked renderer choice OR explicit decision to ship a deterministic placeholder first and gate real audio on a second spike |

**M2 ship criterion**: Without touching Live, `stratum generate "techno raw 139 phrygian arrakis"` produces a `.stratum/` directory containing a `bundle.json` manifest plus `drums.mid`, `bass.mid`, `lead.mid`, `drone.wav`, `pad.wav`. The bundle must declare: bundle schema version, `intent` (scale/genre/mood + BPM), `seed`, MIDI PPQ, length in bars, key signature, tempo, sample rate, bit depth, per-track role, and SHA-256 of every binary artifact. Generation must be deterministic given the same seed.

---

# Sprint 3 — Milestone M3: Live bridge (specs 0013..0020)

| Spec | Title |
|---|---|
| spec-0013 | Domain core (`MusicalIdea`, `LiveState`, `Command`) |
| spec-0014 | Ports (`LivePushPort`, `LiveQueryPort`, `LiveObserverPort`) |
| spec-0015 | OSC adapter (transport only; concrete commands in 0017) |
| spec-0016 | File adapter (`.als` parser, offline) |
| spec-0017 | Command implementations (`LoadClip`, `SetDeviceParam`, `SetTempo`) |
| spec-0018 | Facade (`AbletonClient`) + Memento (snapshot) |
| spec-0019 | MCP adapter |
| spec-0020 | End-to-end: `stratum generate ... && stratum push` against Live 12 |

**Mandatory pre-M3 spikes** (must complete and merge before spec-0015 / spec-0016):

| Spike ID | Title | Required ADR | Deliverable |
|---|---|---|---|
| spec-0015-a | Live OSC transport: built-in surface vs AbletonOSC vs Max for Live device; port, namespace, CI testability | adr-0015-transport.md | Locked transport + message namespace + how CI exercises it |
| spec-0016-a | `.als` parser constraints: size, depth, DTDs, entities; chosen lib or hand-rolled; bounded resource policy | adr-0016-als-parser.md | Locked parser + explicit bounds (max bytes, max depth) |

**M3 ship criterion**: With Live 12 running on `localhost:11000` (OSC enabled), `stratum push --target drums` loads a generated clip into a specific rack/channel/device; `stratum snapshot` saves/restores set state. Every command returns a `CommandResult` with ack/timeout/retry policy, and the facade enforces loopback-only endpoints unless `--allow-remote` is explicitly passed. The FileAdapter parses a sample `.als` with bounded size and depth limits, and snapshots are versioned snapshots stored under `.stratum/snapshots/<bundle-id>/<state-revision>/` to prevent silent overwrites.

---

# Risks & Open Questions

| Risk | Mitigation |
|---|---|
| Hexagonal overhead slows Day 0 | Day 0 doesn't touch the live-bridge package at all; hexagonal pays off from M3 onwards |
| Dashboard parser schema drifts | `_template.md` is the source of truth; PRs that change fields must update both |
| Live 12 OSC API surface is large; we may over-engineer | M3 spec-0015 lists only the OSC messages we actually use; rest is YAGNI |
| pnpm workspaces add indirection | One package (`@stratum/dashboard`) on Day 0 keeps it small; more packages only when needed |
| Gray-matter + strict TS friction | Type the parsed data manually in `types.ts`; do not rely on `unknown` |

**Open questions to resolve before M3**:
1. Does user want OSC (default Live behavior) or MCP (newer, bidirectional)? The answer must be captured in `spec-0015` and an ADR before any adapter code is written.
2. Where do generated `.stratum/` bundles live by default (`~/Music/stratum/`? `$PROJECT/.stratum/`?)? Default must be committed to `bundle.json` and documented in `docs/getting-started.md`.
3. Audio stems: real-time render (FFmpeg / SoX / Python) or model-based (HeartMuLa / Suno)? The selected renderer must be evaluated against licensing, determinism, latency, and binary distribution before spec-0011 is implemented; if the answer is unclear, ship a deterministic placeholder renderer first and gate real audio on a spike.

**Mandatory pre-M2 spike** — `spec-0010-a` (write before spec-0010):
- Pick `midi-writer-js` vs `easymidi`. Decide based on: license, ESM support, maintenance, ability to write PPQ/header bytes, and ability to disable running status when we need to.
- Document the decision in `adr-0010-midi-library.md` including why the rejected option loses.

**Mandatory pre-M3 spikes** — `spec-0015-a` and `spec-0016-a` (write before adapters):
- `spec-0015-a`: identify the exact Live component that exposes OSC (Live built-in OSC surface vs AbletonOSC vs Max for Live device), the port, the message namespace we will use, and what is actually testable in CI. Capture in `adr-0015-transport.md`.
- `spec-0016-a`: enumerate .als parser constraints (size, depth, DTDs, entities), chosen library or hand-rolled parser, and bounded resource policy. Capture in `adr-0016-als-parser.md`.

---

# Execution Handoff

Plan complete and saved.

**Path**: `/Users/hugo/Proyectos/stratum/.hermes/plans/2026-07-18_135825-stratum-day0-and-roadmap.md`

**Summary**: 16 Day-0 tasks (Tasks 0.1–0.11 + 0.11b + 0.12–0.15) build the tracking system plus CI first, then 3 sprints (M1/M2/M3) deliver the musical core. Every task follows strict TDD (red → green → commit), has exact file paths and copy-pasteable code, and ends with a commit.

**Ready to execute using subagent-driven-development** — each Day-0 task dispatches a fresh subagent (implementer → spec reviewer → code quality reviewer). For sprints M1+ I'll write per-sprint plans that decompose each spec into bite-sized tasks the same way.

¿Quieres que arranque Task 0.1 ahora? (Primer commit: monorepo root.)
