# @agentdock/shared-types

**Purpose:** Cross-cutting TypeScript types and schemas with no home in a
specific layer (e.g. `TaskGraph`, `TaskStatus`, event payload shapes)
shared between multiple packages.

**Public API:** everything exported from here is public by definition.

**May depend on:** nothing else in the workspace.

**Must never depend on:** any other `@agentdock/*` package — this is the
most foundational package in the dependency graph; if it needed to depend
on something else, that thing wouldn't belong under `shared/`.

**Status:** Implemented. This package now contains the `Execution` domain
model — the central abstraction of AgentDock, as of the first functional
milestone. See
[docs/architecture/003-execution-domain.md](../../../docs/architecture/003-execution-domain.md)
for the full rationale. Exports: `Execution`, `ExecutionId`, `Goal`,
`Intent`/`IntentCategory`, `Capability`, `ExecutionGraph`/`ExecutionNode`,
`ExecutionStatus` (with the lifecycle transition rules), `ExecutionResult`,
`ExecutionError`, `ExecutionMetadata`, and their associated domain errors.
