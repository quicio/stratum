---
id: adr-0002
type: adr
title: "TypeScript + Node 22.23.1 + ESM only"
status: accepted
version: 1.0.0
owner: hugo
created: 2026-07-18
updated: 2026-07-18
related: []
tags: [typescript, runtime]
---

# ADR 0002: TypeScript + Node 22.23.1 + ESM only

## Status
accepted · 2026-07-18

## Context
We need a TypeScript toolchain that supports strict mode, ESM, and modern Node features for the dashboard and CLI binaries.

## Decision
TypeScript 5.6.3 with strict + NodeNext module resolution. Node 22.23.1. ESM only, no CJS. type:module in every package.json.

## Consequences
Positive:
- Strict TS catches bugs early
- Native ESM is the future; no legacy baggage
- Node 22 is current LTS

Negative:
- Some legacy npm packages assume CJS
- NodeNext resolution has stricter path rules

## Alternatives considered
- Bun: rejected; not yet production-ready for our needs
- Deno: rejected; outside team familiarity
- TypeScript 4.x: rejected; missing exactOptionalPropertyTypes