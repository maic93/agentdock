# @agentdock/foundation-db

**Purpose:** Persistence abstraction for control-plane data (plans, tasks,
attempts, artifact metadata) — see the three-way control/content/context
data-plane split in `docs/architecture/001-system-architecture.md`,
Section 14. Recommended backing store: PostgreSQL (see that document,
Section 20, for reasoning).

**Public API (implemented):**

- `ExecutionStore` (`create`/`get`/`update`/`list`/`delete`, all
  `Promise`-returning even though the current implementation resolves
  synchronously — see
  [ADR 0003](../../../docs/adr/0003-vitest-and-cross-package-type-resolution.md)
  for why that matters) and its implementation, `InMemoryExecutionStore`.
- `JobRepository` (the same shape as `ExecutionStore`) and its
  implementation, `InMemoryJobRepository` — added in milestone 006. See
  [ADR 0005](../../../docs/adr/0005-job-domain-and-kernel-foundation-boundary.md)
  for why this implementation deliberately duplicates
  `InMemoryExecutionStore`'s structure rather than sharing a generic base.

**May depend on:** `@agentdock/shared-types`, `@agentdock/foundation-config`.

**Must never depend on:** `packages/kernel/*`, `apps/*`, `plugins/*`.

**Who may import it:** `apps/*` directly, and now also `packages/kernel/job-service`
— see ADR 0005 for why `scope:kernel -> scope:foundation` is an allowed
dependency direction (it always was, per the original approved design;
the enforced rule had simply never caught up).

**Must remain internal:** schema definitions, migration internals — only
the repository service interfaces are public.

**Status:** Implemented for Executions and Jobs (in-memory only — this is
the "PostgreSQL later" store referenced above; the "later" hasn't arrived
yet). Other control-plane entities (artifact metadata) are not yet modeled
here.
