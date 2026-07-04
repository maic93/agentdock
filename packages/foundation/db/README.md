# @agentdock/foundation-db

**Purpose:** Persistence abstraction for control-plane data (plans, tasks,
attempts, artifact metadata) — see the three-way control/content/context
data-plane split in `docs/architecture/001-system-architecture.md`,
Section 14. Recommended backing store: PostgreSQL (see that document,
Section 20, for reasoning).

**Public API (implemented):** the `ExecutionStore` interface
(`create`/`get`/`update`/`list`/`delete`, all `Promise`-returning even
though the current implementation resolves synchronously — see
[ADR 0003](../../../docs/adr/0003-vitest-and-cross-package-type-resolution.md)
for why that matters) and its first implementation,
`InMemoryExecutionStore`, backed by a `Map`.

**May depend on:** `@agentdock/shared-types`, `@agentdock/foundation-config`.

**Must never depend on:** `packages/kernel/*`, `apps/*`, `plugins/*`.

**Must remain internal:** schema definitions, migration internals — only
the repository service interfaces are public.

**Status:** Implemented for Executions specifically (in-memory only — this
is the "PostgreSQL later" store referenced above; the "later" hasn't
arrived yet). Other control-plane entities (plans beyond Execution,
artifact metadata) are not yet modeled here.
