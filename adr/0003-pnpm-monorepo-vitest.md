---
id: adr-0003
type: adr
title: "pnpm workspaces + Vitest"
status: accepted
version: 1.0.0
owner: hugo
created: 2026-07-18
updated: 2026-07-18
related: []
tags: [tooling]
---

# ADR 0003: pnpm workspaces + Vitest

## Status
accepted · 2026-07-18

## Context
We need a workspace structure and test runner that scale to multiple packages.

## Decision
pnpm 8.15 with workspaces. Vitest 2.1 as the test runner. Biome for lint+format.

## Consequences
Positive:
- pnpm workspace is fast and strict
- Vitest has native ESM and TypeScript support
- Biome unifies lint and format in one tool

Negative:
- Biome rule coverage smaller than ESLint+Prettier

## Alternatives considered
- npm workspaces: rejected; less strict dependency resolution
- Yarn: rejected; no clear advantage
- Jest: rejected; no native ESM