# @agentdock/kernel-workflow-engine

**Purpose:** Execute a task graph produced by the Planner — ordering,
parallelism, retries, and state persistence. A state machine, not a planner:
it decides *when and how* to run what was planned, never *what* to do.

**Public API (once implemented):** `executePlan(taskGraph) -> ExecutionHandle`.

**May depend on:** `@agentdock/shared-types`, `@agentdock/kernel-ai-router`,
`@agentdock/kernel-tool-registry`, `@agentdock/kernel-event-bus`,
`@agentdock/foundation-artifact-manager`, `@agentdock/foundation-db`.

**Must never depend on:** `apps/*`, `plugins/*` directly (must resolve
providers/tools through `ai-router`/`tool-registry`), `kernel-planner`
internals (only its public `TaskGraph` type).

**Must remain internal:** retry/backoff internals, execution state machine
implementation details.

**Status:** Not implemented.
