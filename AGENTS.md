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