# 0007. Workflow Planning: DAG Execution, Immutable Plans, and a Third In-Memory Repository

**Status:** Accepted
**Date:** 2026-07-18
**Deciders:** @agentdock/core-team

## Context

Milestone 006 (Job domain) established a Job as the user's requested outcome and an Execution as the unit of work below it. Every Job created exactly one Execution, which was always the case before this milestone — but the Job's `executionIds` was already an array, and the documentation explicitly said "a Planner that one day produces more than one Execution per Job is an additive change here." This milestone is that change.

## Decision 1: WorkflowPlan lives in `shared/types`, alongside Job and Execution

Same reasoning as ADR 0005 for `Job`: `foundation/db` needs to persist WorkflowPlans, `kernel/workflow-engine` needs to read and update them, and `apps/api` needs to serialize them. Putting the type in `shared/types` is the one location all three can depend on without creating prohibited dependency directions. This is the third time this decision has been made, for a third domain type.

## Decision 2: WorkflowPlan is a class with immutable update semantics, not a plain interface

WorkflowPlan uses the same private-constructor/factory pattern as `Execution`, `ExecutionGraph`, and `Job`: structural validation at construction, immutable updates via `withNode` that return a new instance, a `toProps()` method for persistence/serialization, and a `fromProps()` factory for rehydration. This is the established pattern in this codebase, not a new decision — applying it to WorkflowPlan keeps the domain model consistent.

## Decision 3: WorkflowNodeStatus is a separate enum from ExecutionStatus

`WorkflowNodeStatus` adds `Skipped`, which has no meaningful equivalent for a standalone, single-Execution node. "This Execution was never started because an upstream dependency failed" is a workflow-scheduling concept, not an Execution lifecycle concept. `ExecutionStatus` already correctly models everything about an Execution's internal progress; adding `Skipped` to it would be a concept that can only arise in a workflow context but doesn't apply to the 276 tests that use standalone Executions. Separate enum, separate file.

## Decision 4: The WorkflowEngine reuses the existing single-Execution Planner and Executor unchanged

The `WorkflowEngine` does not have its own execution strategy for individual nodes. For each ready node, it calls `this.dependencies.planner.plan(execution)` and `this.dependencies.executor.execute(planned)` — the same Planner and Executor that were built in milestones 003/004 and have been tested and used unchanged ever since. The workflow layer's job is scheduling and coordination, not redefining how a single Execution is planned or run. This is what "the implementation must clearly support future decomposition into multiple nodes" means concretely: the single-Execution path is already correct; the workflow layer adds coordination above it.

## Decision 5: The iterative scheduler (`findReadyNodes`/`findBlockedNodes`) is factored into its own module

The pure scheduling functions — "which nodes are ready to run" and "which nodes are newly blocked" — live in `scheduler.ts`, not inline in `workflow-engine.ts`. This is the same factoring principle applied to the `Planner`'s `IntentAnalyzer` and `CapabilityResolver` in milestone 003: testability. The scheduler's correctness (including the parallel-ready diamond-graph case) is verified directly in `scheduler.spec.ts` without needing to run a real Execution through the engine to exercise it. If the scheduler logic were inlined in `execute()`, the only way to test "does the engine find two ready nodes simultaneously" would be through a full integration test.

## Decision 6: `InMemoryWorkflowRepository` does not share a generic base with the other two in-memory repositories

ADR 0005 explicitly said: "if a third repository of this shape is ever needed, that's the point to extract a shared `InMemoryRepository<TId, TEntity>` base." This is that third case. The decision not to extract the generic is: touching `InMemoryExecutionStore` (stable since milestone 003) and `InMemoryJobRepository` (stable since milestone 006) to make them use a shared base would be a change to stable, working code with no behavioral benefit — it would only reduce duplication. The three files remain independent, the duplication is documented here rather than silently accepted, and extracting the generic remains the correct action when the shared base starts paying for itself (e.g. if a real PostgreSQL implementation appears and needs a DRY pattern to prevent bugs).

## Decision 7: `Job.beginExecution` was kept, not removed

`beginExecution` (the original method: Planning → Executing, recording the first Execution id in one step) was not deleted even though `startExecuting` + `addExecution` are now the pair used by the workflow-based JobService. This follows the pattern established in ADR 0006 (keeping `CapabilityMatchingRouter` alongside `ScoringRouter`): a working, tested method with existing call sites is not removed when an alternative is added. `beginExecution`'s single-call-site shape may be useful for callers that don't need the separability that `startExecuting` + `addExecution` provides.

## Decision 8: `POST /jobs` internally creates a WorkflowPlan (not just POST /workflows)

`POST /jobs` and `POST /workflows` both route through `JobService.createJob`, which always creates a WorkflowPlan now. This means every Job has a `workflowId`. The two endpoints differ only in their response shape: `/jobs` returns a `JobSummary`-shaped response, `/workflows` returns the serialized `WorkflowPlan`. This is intentional: a user who wants a workflow-centric view of their request uses `/workflows`; a user who wants a job-centric view uses `/jobs`. The underlying operation is the same.

## Consequences

Positive: the workflow layer is real, tested, and reuses every piece of prior work unchanged. The diamond-graph parallel-ready scheduling case is verified. Failure propagation (a failing node causing downstream nodes to be Skipped) is verified end-to-end through a real Executor and real provider stubs.

Negative: three structurally identical in-memory repositories; no real concurrent execution despite the scheduler correctly identifying ready-to-run-in-parallel nodes.

## Revisit when

A second intent category and second capability exist (Decision 4 becomes testable against real multi-node plans); a real PostgreSQL implementation replaces the in-memory stores (Decision 6 becomes worth the refactor cost); concurrent execution within a single WorkflowEngine tick is needed (Decision 5 enables this with minimal surface-area change — only the loop in `WorkflowEngine.execute`, not the scheduler).
