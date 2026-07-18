# Stratum Multi-Agent Workflow

This document is the source of truth for how Hugo (human), Hermes (orchestrator), and OpenCode (implementer) collaborate on Stratum. Every agent and every human reads it before starting work.

## Roles

| Role | Does | Does NOT do |
|---|---|---|
| **Hugo** | Define specs, approve ADRs, mark sprints shipped, decide irreversible things (libraries, transports, public/private). | Write code, review commits line by line. |
| **Hermes** | Decompose specs into bite-sized tasks, dispatch each task to OpenCode with full context, run two-stage review (spec compliance then code quality), maintain the dashboard, write plans, manage git hygiene. | Implement features, pick libraries without an approved spike, push to `main`. |
| **OpenCode** | Implement tasks that fit in 2-5 minutes of focused work. Run the project's tests, fix what they break, commit with conventional messages, report back a one-screen summary. | Make architectural decisions, deviate from the task brief, refactor unrelated code. |

## Branch layout

| Branch | Owner | Purpose |
|---|---|---|
| `main` | Hugo approves merges | Source of truth. Direct pushes forbidden. |
| `hugo/<desc>` | Hugo | Hugo's own overrides or exploratory branches. |
| `hermes/<desc>` | Hermes | Plans, dashboard evolution, review follow-ups, spec second drafts. |
| `opencode/<spec-NNNN>` | OpenCode | One branch per spec. Cleaned up after merge. |

Rule: **no agent pushes to `main`**. Merges happen via PR (or, during MVP, by Hugo after reviewing the diff).

Rule: **no agent edits the working tree of another agent's branch**. If you find a bug there, file feedback; do not fix it yourself.

## The four non-negotiable rules

These exist because every violation has cost us time. They are not aspirational.

### Rule 1: Commit first, reorganize later

**Before any git reorganization** (`reset`, `rebase`, `cherry-pick`, reordering, force-push), **every valuable change must already be in a commit.** WIP commits are acceptable. Stashing is acceptable. A dirty working tree is not acceptable.

Rationale: working-tree changes are fragile. They live only on one machine, in one agent's context, and they vanish on the wrong `git reset`. We lost a substantial agent review diff in this project exactly this way.

Anti-pattern: "I will reorganize the commits once I see how they look." That reorganization operates on real history; the original working tree is gone the moment you `reset`.

### Rule 2: Reviewer does not edit the disk

When reviewing an agent's work:

- ✅ Read files, run tests, compare to spec, write findings.
- ❌ **Do not edit files in that agent's branch.**

If something must change, send feedback. The agent that wrote it makes the change with the right context, then reports again.

Rationale: when a reviewer edits the original agent's branch, the original agent loses track of what changed and why. The diff becomes incoherent. The next reviewer sees two authors' intent mixed.

Exception: trivial formatting that does not change semantics (whitespace from a formatter, import sort). Anything else goes through feedback.

### Rule 3: One branch per agent

Each agent (Hugo, Hermes, OpenCode) keeps work on their own named branches. No cross-pollution. If two agents need to collaborate on the same spec, they serialize: OpenCode implements on `opencode/spec-NNNN`, Hermes reviews from `hermes/review-spec-NNNN` (read-only), feedback goes back, OpenCode iterates.

### Rule 4: Push only clean branches

Before `git push`, the working tree must be empty AND all intended changes must be in commits on the tracked branch. There is a pre-push hook in `.githooks/pre-push` that refuses to push a dirty tree. To bypass in an emergency, use `git push --no-verify` and document why in the commit message.

## Cadence

| Event | Decided by | Executed by |
|---|---|---|
| New spec | Hugo writes or approves a Hermes draft | Hermes formalizes with frontmatter |
| Spike (lib, transport, parser) | Hugo approves the go/no-go | Hermes runs the spike, Hugo approves the ADR |
| Task inside a spec | Hermes decomposes the spec into bite-sized tasks | OpenCode does each task, Hermes reviews |
| Sprint = one milestone | Hermes proposes "shipped?" with evidence | Hugo approves |
| Refactor of merged spec | Hugo approves the new spec | Hermes deprecates the old |

## Handoff templates

These are short on purpose. If you find yourself writing more than the template allows, the upstream document (spec, ADR, plan) is too vague; fix that first.

### Hugo → Hermes

```
Implement spec-NNNN.
```

One sentence to add context is fine ("emphasize M2 determinism"); more than that and the spec needs work.

### Hermes → OpenCode

```
Task from specs/NNNN-...md and the matching plan section.

Files (exact paths):
- src/foo/bar.ts (create)
- tests/foo/bar.test.ts (create)

Behavior:
[paste the spec's "Behavior" section verbatim]

Test command: pnpm --filter <pkg> test

Commit: feat(spec-NNNN): <imperative summary>

If anything is unclear, ask BEFORE writing code. If you must
deviate from the brief, commit a wip: commit and stop; do not
silently expand scope.
```

### OpenCode → Hermes

```
Files: N changed (M created, K modified)
Tests: P passed, 0 failed
Lint: clean
Commit: <sha> <msg>
Notes: <only if something is unusual>
```

### Hermes → Hugo

Hermes is silent by default. Hermes speaks to Hugo only when:

1. A spike needs an irreversible decision (library, transport, parser).
2. A sprint has reached its ship criterion and needs `shipped` approval.
3. A reviewer's feedback and OpenCode are in a loop that needs escalation.
4. Something broke irreversibly (lost work, broken state).

## What to do when something goes wrong

| Symptom | First action |
|---|---|
| Working tree has uncommitted changes you want to keep | `git add -A && git commit -m "wip: <agent> saving before reorganization"` |
| Working tree has uncommitted changes you do NOT want to keep | `git checkout -- <paths>` or `git stash` |
| A branch has too many commits to review | Ask the agent to `git reset --soft` to before the work and recommit as a small number of clean commits — but only AFTER the work is committed (Rule 1) |
| An agent's branch is gone | Check `git reflog` first; if it survives there, recreate the branch |
| Two agents both edited the same file | One of them reverts; the other recommits; never auto-merge human edits |

## Pre-push hook

`.githooks/pre-push` is installed via `pnpm setup` (see Task 0.1 of the Day-0 plan) and refuses to push when the working tree has uncommitted changes. To install manually: `git config core.hooksPath .githooks`.