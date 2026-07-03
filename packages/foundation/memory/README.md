# @agentdock/foundation-memory

**Purpose:** Short-lived, per-session/per-interaction contextual continuity
— "what was said," as distinct from `foundation-knowledge-base`'s "what is
known" (see `docs/architecture/001-system-architecture.md`, Section 12, for
why these are kept as separate modules).

**Public API (once implemented):** a `MemoryStore` service interface — no
raw persistence access exposed outward.

**May depend on:** `@agentdock/shared-types`, `@agentdock/foundation-db`,
`@agentdock/foundation-config`.

**Must never depend on:** `packages/kernel/*` (foundation never depends
upward on the kernel), `apps/*`, `plugins/*`.

**Status:** Not implemented.
