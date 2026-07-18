---
id: M3
type: milestone
title: "Live bridge"
status: planned
version: 0.1.0
owner: hugo
created: 2026-07-18
updated: 2026-07-18
related: []
tags: [m3, bridge, live]
---

# Milestone M3 — Live bridge

## Goal

Push generated `.stratum/` bundles into specific racks, channels, and devices of a running Ableton Live 12 set, and observe set state bidirectionally.

This milestone closes the loop between Stratum and Live: the composer describes intent in Spanish, Stratum resolves it, generates a bundle, and now also delivers that bundle to the right place in a Live set.

---

## Scope

### Included

* Domain core (`MusicalIdea`, `LiveState`, `Command`) — pure, no Live dependency
* Ports

  * `LivePushPort` — push clips and device params
  * `LiveQueryPort` — read set state
  * `LiveObserverPort` — observe set changes
* Adapters

  * OSC adapter (Live built-in OSC, default port 11000)
  * File adapter (`.als` parser, offline)
  * MCP adapter (deferred to spec-0019; spike required first)
* Commands

  * `LoadClip` — push a generated clip to a target rack/channel
  * `SetDeviceParam` — change a device parameter
  * `SetTempo` — change project tempo
* Facade (`AbletonClient`) wrapping the ports
* Memento: snapshot/restore of set state
* `stratum push`, `stratum snapshot` CLI commands

### Explicitly out of scope

* Live device parameter discovery beyond what is needed for the push path
* Live arrangement / session view automation
* Real-time audio streaming from Live to Stratum
* Multi-set management (one Live set per Stratum session)

---

## Pre-M3 Mandatory Spikes

These must complete and merge before any M3 adapter code is written.

| Spike ID | Title | Required ADR | Deliverable |
|---|---|---|---|
| spec-0015-a | Live OSC transport: built-in surface vs AbletonOSC vs Max for Live device; port, namespace, CI testability | adr-0015-transport.md | Locked transport + message namespace + how CI exercises it |
| spec-0016-a | `.als` parser constraints: size, depth, DTDs, entities; chosen lib or hand-rolled; bounded resource policy | adr-0016-als-parser.md | Locked parser + explicit bounds (max bytes, max depth) |

---

## Definition of Done

### Adapter

* OSC adapter connects to Live 12 over loopback.
* File adapter parses a sample `.als` with bounded size and depth limits.
* MCP adapter passes the same contract tests as the OSC adapter (when implemented).

### Commands

* Every command returns a `CommandResult` with ack/timeout/retry policy.
* The facade enforces loopback-only endpoints unless `--allow-remote` is explicitly passed.

### State

* Snapshots stored under `.stratum/snapshots/<bundle-id>/<state-revision>/` to prevent silent overwrites.
* `stratum snapshot` and `stratum restore` round-trip a snapshot.

### Testing

Unit and integration tests cover:

* Domain core: pure, no Live dependency, no I/O.
* Port contracts: mocked ports verified against domain invariants.
* OSC adapter: connect to a Live 12 instance (manual smoke + CI smoke against a fake OSC responder).
* File adapter: parse sample `.als` files within bounded resources; reject oversized input.
* Command result policy: ack, timeout, retry, error surfaced to caller.

---

## Exit Criteria

With Live 12 running on `localhost:11000` (OSC enabled), `stratum push --target drums` loads a generated clip into a specific rack/channel/device; `stratum snapshot` saves and restores set state without data loss. The system refuses to push to non-loopback endpoints by default and refuses to parse `.als` files beyond declared bounds.