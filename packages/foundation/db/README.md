# @agentdock/foundation-db

**Purpose:** Persistence abstraction for control-plane data (plans, tasks,
attempts, artifact metadata) — see the three-way control/content/context
data-plane split in `docs/architecture/001-system-architecture.md`,
Section 14. Recommended backing store: PostgreSQL (see that document,
Section 20, for reasoning).

**Public API (once implemented):** typed repository interfaces per entity
— no raw SQL/query builder exposed outward to consumers.

**May depend on:** `@agentdock/shared-types`, `@agentdock/foundation-config`.

**Must never depend on:** `packages/kernel/*`, `apps/*`, `plugins/*`.

**Must remain internal:** schema definitions, migration internals — only
the repository service interfaces are public.

**Status:** Not implemented.
