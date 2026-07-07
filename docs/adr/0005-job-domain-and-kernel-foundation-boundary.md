# 0005. The Job domain: package placement and a kernel/foundation boundary fix

**Status:** Accepted
**Date:** 2026-07-06
**Deciders:** @agentdock/core-team

## Context

This milestone introduces the Job domain: `Job` as the user's requested
outcome, sitting above `Execution` (a single unit of work created to
satisfy it). This required deciding where new code should live, and
surfaced a real gap between the approved repository foundation design and
what was actually enforced.

## Decision 1: Job domain types live in `packages/shared/types`

`JobId`, `Job`, `JobStatus`, `JobResult`, `JobSummary`, `JobPriority`,
and the `JobGoal`/`JobMetadata`/`JobError` aliases all live in
`packages/shared/types`, alongside the existing Execution domain types.
This is the same placement decision made for Execution in milestone 003,
for the same reason: these are cross-cutting types with no single
behavioral owner, needed by the Job Service, the Job Repository, and the
API layer alike.

**Alternative considered:** a dedicated `packages/shared/job-types`
package. Rejected — the repository foundation's package-boundary rules
(002-repository-foundation.md) were designed around a fixed set of
`shared` sub-packages (`types`, `sdk`, `testing-utils`, `ui-kit`); splitting
`types` into two just as it started being used would fragment a working
pattern for no benefit, and Job's relationship to Execution is close enough
that they belong in the same conceptual bucket.

## Decision 2: JobService is a new kernel package (`packages/kernel/job-service`)

The original repository foundation blueprint (002-repository-foundation.md)
enumerated a fixed set of kernel packages — planner, workflow-engine,
ai-router, prompt-builder, model-registry, tool-registry, event-bus — none
of which is "orchestrates Jobs." `JobService` is a new addition to that set.

**Alternative considered:** folding Job orchestration into `apps/api`
directly, since that's where the old `/execute` handler used to do this
kind of coordination. Rejected — Job orchestration is domain/orchestration
logic (exactly what the "kernel" layer is for, per
001-system-architecture.md), not an HTTP concern; putting it in `apps/api`
would mean a future non-HTTP caller (a CLI, a scheduler) couldn't reuse it
without depending on the API app, which the approved dependency rules
correctly forbid.

## Decision 3: `scope:kernel` may depend on `scope:foundation` — closing a latent gap, not loosening the rules

`JobService` needs `JobRepository` and `ExecutionStore` (both in
`packages/foundation/db`) to fulfil its stated responsibility of persisting
the Job it orchestrates. The enforced `eslint.config.js` `depConstraints`
never allowed `scope:kernel -> scope:foundation` — but
002-repository-foundation.md, Section 3, already specified that
`kernel-workflow-engine`'s allowed dependencies include
`foundation-artifact-manager` and `foundation-db`. The enforced rule had
simply never been updated to match the approved design; this had gone
unnoticed until now because the Executor (built in milestone 005) never
actually needed to touch a repository — `apps/api`'s route handler did
that persisting instead.

**Decision:** `scope:kernel`'s allowed dependencies now include
`scope:foundation`, matching what was already approved. This is a
correction, not a new architectural loosening — closing a gap between
documentation and enforcement, the same category of fix as ADR 0003's
`.mjs` plugin-recognition gap.

## Decision 4: `InMemoryJobRepository` was not unified with `InMemoryExecutionStore` behind a shared generic

The two implementations are structurally near-identical (a `Map`-backed
`create`/`get`/`update`/`list`/`delete`, throwing the same two exception
shapes). This is real, acknowledged duplication.

**Decision:** duplicate it anyway, rather than refactor
`InMemoryExecutionStore` to use a shared generic base. This milestone's own
instructions state that "everything built in Prompts 001–005 is considered
stable unless there is a critical defect," and structural duplication
between two ~20-line files is not a critical defect. Introducing a shared
generic would require modifying `InMemoryExecutionStore`, which is
explicitly the kind of change this milestone was told not to make without
strong justification.

**This is a genuine, acknowledged trade-off**, not a claim that the
duplication is actually fine. If a third repository of this shape is ever
needed, that's the point to extract a shared `InMemoryRepository<TId,
TEntity>` base — retroactively covering all three call sites in one
motivated refactor, with its own ADR.

## Consequences

Positive: Job orchestration lives where the architecture says orchestration
logic belongs, reusing the Planner and Executor completely unchanged.
The kernel/foundation dependency gap is now consistent with what was always
approved, rather than silently more restrictive than intended.

Negative: two structurally similar in-memory repository implementations
exist side by side. This is deliberate, tracked debt (see Decision 4), not
an oversight.

## Revisit when

A third in-memory repository is needed (Decision 4), or when
`InMemoryExecutionStore`/`InMemoryJobRepository` are replaced by real
PostgreSQL-backed implementations — at which point a shared base makes
even more sense to introduce once, for all real implementations at once.
