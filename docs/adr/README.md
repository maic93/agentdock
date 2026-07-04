# Architecture Decision Records

An ADR is a short, numbered, **immutable** record of a significant decision
and the reasoning behind it — not a living document. If a decision changes
later, a new ADR supersedes the old one; the old one is kept for history
with its status updated to `Superseded by ADR-00XX`.

## When to write one

Write an ADR for any decision that:
- Changes a dependency-boundary rule.
- Adds, removes, or replaces a core piece of tooling (e.g., the monorepo
  tool, the versioning tool).
- Changes a public package API in a way that isn't just a version bump.
- Establishes a governance or process change.

Smaller decisions (a specific library choice within a single package,
internal implementation details) don't need one.

## Process

1. Copy [0000-template.md](./0000-template.md) to a new file:
   `NNNN-short-title.md`, using the next sequential number.
2. Fill it out with status `Proposed`.
3. Open a PR. Significant ADRs should be preceded by an RFC
   ([docs/rfcs/](../rfcs/0000-template.md)) for broader discussion first —
   the ADR is the durable record of what was decided, the RFC is where the
   discussion happened.
4. Once merged with core-team approval, update the status to `Accepted`.

## Index

| ADR | Title | Status |
|---|---|---|
| [0001](./0001-record-architecture-decisions.md) | Record architecture decisions as ADRs | Accepted |
