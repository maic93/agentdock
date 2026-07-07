# @agentdock/shared-types

**Purpose:** Cross-cutting TypeScript types and schemas with no home in a
specific layer (e.g. `TaskGraph`, `TaskStatus`, event payload shapes)
shared between multiple packages.

**Public API:** everything exported from here is public by definition.

**May depend on:** nothing else in the workspace.

**Must never depend on:** any other `@agentdock/*` package — this is the
most foundational package in the dependency graph; if it needed to depend
on something else, that thing wouldn't belong under `shared/`.

**Status:** Implemented. This package contains both the `Execution` domain
model (the central abstraction of the first functional milestone — see
[docs/architecture/003-execution-domain.md](../../../docs/architecture/003-execution-domain.md))
and the `Job` domain model (the orchestration layer above it, added in
milestone 006 — see
[docs/architecture/005-job-domain.md](../../../docs/architecture/005-job-domain.md)).
Exports include `Execution`, `ExecutionId`, `Goal`, `Intent`/`IntentCategory`,
`Capability`, `ExecutionGraph`/`ExecutionNode`, `ExecutionStatus`,
`ExecutionResult`, `ExecutionError`, `ExecutionMetadata`; and `Job`,
`JobId`, `JobStatus`, `JobResult`, `JobSummary`, `JobPriority`, plus the
`JobGoal`/`JobMetadata`/`JobError` aliases that deliberately reuse the
Execution-domain types they mean exactly the same thing as (see ADR 0005
for which Job concepts are aliases versus genuinely new types, and why).
