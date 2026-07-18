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
The live-bridge package must integrate with Ableton Live via multiple mechanisms (OSC, MCP, Max for Live, offline .als parsing). Each mechanism has its own I/O model and failure modes.

## Decision
We adopt hexagonal architecture: a pure domain core (packages/live-bridge/src/domain/) defines types like MusicalIdea, LiveState, Command. Ports (src/ports/) are TypeScript interfaces. Adapters (src/adapters/{osc,mcp,m4l,file}/) implement ports. The domain depends on no adapter.

## Consequences
Positive:
- Domain testable without Live
- New transports added by writing one adapter, no domain change
- Mocking ports in tests is trivial

Negative:
- More files for small features
- Indirection cost

## Alternatives considered
- Direct integration (no port): rejected; OSC and MCP have very different shapes
- Plugin system with dynamic loading: rejected as YAGNI