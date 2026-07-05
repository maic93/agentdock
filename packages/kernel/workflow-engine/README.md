# @agentdock/kernel-workflow-engine

**Purpose:** Execute a task graph produced by the Planner — ordering,
parallelism, retries, and state persistence. A state machine, not a
planner: it decides _when and how_ to run what was planned, never _what_
to do.

**Public API (implemented):** `Executor.execute(execution: Execution):
Promise<Execution>` — requires an Execution in the `Routing` status (throws
`InvalidExecutionStateError` otherwise), runs each node in
`execution.graph` against a provider selected by the Router, and returns
the Execution in `Completed` (with an `ExecutionResult` carrying the
provider id, model, and duration) or `Failed` (with a categorized
`ExecutionError` — `ROUTING_ERROR`, `PROVIDER_ERROR`, or
`EXECUTION_FAILED`).

**May depend on:** `@agentdock/shared-types`, `@agentdock/kernel-ai-router`,
`@agentdock/provider-abstraction`, `@agentdock/kernel-tool-registry`,
`@agentdock/kernel-event-bus`, `@agentdock/foundation-artifact-manager`,
`@agentdock/foundation-db`.

**Must never depend on:** `apps/*`, `plugins/*` directly (must resolve
providers through `kernel-ai-router`), `kernel-planner` internals (only its
public `Execution`/`ExecutionGraph` output types).

**Must remain internal:** retry/backoff internals (not implemented yet —
today a provider failure fails the whole Execution; retry policy is future
work), execution state machine implementation details.

**Status:** Implemented for single-node graphs, which is all the Planner
produces today. The per-node loop is structured to handle a real multi-node
DAG without changes, but that path is untested since nothing produces a
multi-node graph yet — see
[docs/architecture/004-execution-pipeline.md](../../../docs/architecture/004-execution-pipeline.md#known-limitations-of-this-milestone).
