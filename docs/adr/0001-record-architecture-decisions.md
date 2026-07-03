# 0001. Record architecture decisions as ADRs

**Status:** Accepted
**Date:** 2026-07-03
**Deciders:** @agentdock/core-team

## Context

AgentDock is designed for a large, long-lived contributor base (target:
1000+ contributors) with significant expected turnover in who is actively
maintaining any given area over the project's lifetime. Significant
decisions — the choice of Nx over Turborepo, pnpm over Yarn, Changesets over
a single repo-wide version, Dependabot over Renovate — have real reasoning
behind them that is not obvious from the resulting code alone. Without a
durable record, this reasoning is lost as soon as the people who made the
decision move on, and the same debates get relitigated repeatedly.

## Decision

Every significant architectural or tooling decision is recorded as an ADR
in `docs/adr/`, following the process in
[docs/adr/README.md](./README.md). ADRs are immutable once accepted; a
changed decision produces a new ADR that supersedes the old one rather than
editing history away.

## Alternatives considered

- **No formal record, rely on PR descriptions and commit history.** Rejected
  — PR history is not discoverable or skimmable as a coherent narrative; it
  requires archaeology rather than reading.
  a design doc**
- **A single evolving `ARCHITECTURE.md` file, edited in place.** Rejected —
  this loses the *history* of why something changed, which is often as
  valuable as the current state, and produces large unreviewable diffs on a
  single sprawling file.

## Consequences

Positive: decisions are discoverable, arguments don't need to be
reconstructed from scratch, and new maintainers can understand *why*
quickly. Negative: this adds process overhead — writing an ADR takes real
effort, and there's a risk of either skipping it under time pressure or,
conversely, over-applying it to decisions too small to warrant one. The
"When to write one" guidance in `docs/adr/README.md` exists specifically to
manage that second risk.

## Revisit when

Not applicable — this is a process decision about how other decisions are
recorded, not a technical choice with an external condition that would
invalidate it.
