# 005. The Job Domain

**Status:** Implemented (single Execution per Job)
**Depends on:** 001-system-architecture.md, 002-repository-foundation.md, 003-execution-domain.md, 004-execution-pipeline.md

This document explains the third functional milestone: introducing `Job`
as an orchestration layer above `Execution`, and what changes — and, just
as importantly, what doesn't — as a result.

## Why a Job domain, above Execution

Milestones 003 and 004 built a pipeline that does exactly one thing well:
take a goal, plan it, run it against a provider, return a result — as a
single `Execution`. That's sufficient for "Hello," but AgentDock's actual
mission (001-system-architecture.md) is goals like "build a SaaS," "create
a Next.js application," or "research AI agents" — outcomes that will
eventually require _several_ Executions (planning code generation
separately from search separately from image generation, say), not one.

`Job` is the concept that survives that expansion; `Execution` is the
concept that doesn't need to. A `Job` represents what the user asked for
and stays alive for as long as satisfying it takes, however many
Executions that turns out to require. An `Execution` represents one unit
of work with one plan, one provider call, one result — a concept that's
complete in itself and shouldn't need to change shape just because the
thing orchestrating it above has to.

This milestone does not implement multi-Execution planning — that's
explicitly out of scope. What it does is put `Job` in place as the durable
orchestration layer, with `Execution` ownership modeled correctly, so that
multi-Execution planning is a Planner/JobService change later, not another
domain-model migration.

## Domain relationships

```
Job
 │  "the user's requested outcome"
 │  owns 1..N Execution ids (today: always 0 or 1)
 ▼
Execution
 │  "one unit of work created to achieve the Job's outcome"
 │  has 0..1 ExecutionGraph (present once Planning completes)
 ▼
ExecutionGraph
 │  "the plan for one Execution": a validated, acyclic set of nodes
 ▼
ExecutionNode
    "one step in the plan": one capability, against one provider
```

**Why these are four separate concepts, not one:**

- **Job vs. Execution** — a Job's lifecycle (Created → Planning →
  Executing → Completed/Failed) describes progress toward an _outcome_.
  An Execution's lifecycle (Created → Analyzing → Planning → Routing →
  Executing → Completed/Failed) describes progress through the mechanics
  of _one attempt_ at part of that outcome. Collapsing them would mean a
  Job that needs three Executions has no way to represent "the first two
  succeeded, the third is still running" — there'd be only one status
  field trying to describe three different units of work at once.
- **Execution vs. ExecutionGraph** — an Execution is the thing with a
  lifecycle and a store entry; an ExecutionGraph is the immutable plan it
  carries once Planning succeeds. Separating them is what let
  `ExecutionGraph.create` enforce structural invariants (no cycles, no
  dangling dependencies) independently of anything about _when_ or _how_
  the graph gets executed.
- **ExecutionGraph vs. ExecutionNode** — a graph is a validated collection;
  a node is one unit within it. A node needs its own identity, status, and
  optional provider/cost/duration fields regardless of how many other nodes
  exist alongside it — exactly the design already in place since milestone
  003, unchanged by this one.

## Execution ownership

Every Execution now optionally carries a `jobId` (see
`Execution.createForJob` in packages/shared/types), and every Job carries
the `executionIds` it created (see `Job.beginExecution`). This is
deliberately a **one-way-additive, backward-compatible** change:

- `Execution.create(goal, clock?)` — the original factory from milestone
  003 — is completely untouched. An Execution created this way has no
  `jobId`, and that remains entirely valid; nothing about Execution's
  existing behavior changed.
- `Execution.createForJob(jobId, goal, clock?)` is new, additive, and is
  the only way an Execution gets a `jobId`.
- `Job.executionIds` is an array, not a single optional field, specifically
  so that a future Planner producing more than one Execution per Job is an
  additive change to _how the array gets populated_, not a breaking change
  to the Job's shape.

## Sequence: `POST /jobs` end to end

```
Client                API              JobService         Planner        Executor        Provider
  │  POST /jobs          │                   │                │              │               │
  │  {"goal":"Hello"}    │                   │                │              │               │
  │─────────────────────>│                   │                │              │               │
  │                      │  createJob(goal)  │                │              │               │
  │                      │──────────────────>│                │              │               │
  │                      │                   │ Job.create()   │              │               │
  │                      │                   │ [Created]      │              │               │
  │                      │                   │ jobRepo.create │              │               │
  │                      │                   │ startPlanning()│              │               │
  │                      │                   │ [Planning]     │              │               │
  │                      │                   │ jobRepo.update │              │               │
  │                      │                   │                │              │               │
  │                      │                   │ Execution      │              │               │
  │                      │                   │  .createForJob │              │               │
  │                      │                   │ executionStore │              │               │
  │                      │                   │   .create      │              │               │
  │                      │                   │───────────────>│              │               │
  │                      │                   │  plan(execution)              │               │
  │                      │                   │                │ [Analyzing]  │               │
  │                      │                   │                │ [Planning]   │               │
  │                      │                   │                │ [Routing]    │               │
  │                      │                   │<───────────────│              │               │
  │                      │                   │ executionStore.update          │               │
  │                      │                   │                │              │               │
  │                      │                   │ job.beginExecution(executionId)│               │
  │                      │                   │ [Executing]    │              │               │
  │                      │                   │ jobRepo.update │              │               │
  │                      │                   │                │              │               │
  │                      │                   │  execute(planned)             │               │
  │                      │                   │───────────────────────────────>│              │
  │                      │                   │                │              │ [Executing]   │
  │                      │                   │                │              │ selectProvider│
  │                      │                   │                │              │──────────────>│
  │                      │                   │                │              │  provider.execute()
  │                      │                   │                │              │───────────────>│
  │                      │                   │                │              │<───────────────│
  │                      │                   │                │              │ [Completed]   │
  │                      │                   │<───────────────────────────────│              │
  │                      │                   │ executionStore.update          │               │
  │                      │                   │                │              │               │
  │                      │                   │ job.complete(jobResult)       │               │
  │                      │                   │ [Completed]    │              │               │
  │                      │                   │ jobRepo.update │              │               │
  │                      │<──────────────────│                │              │               │
  │                      │  summarizeJob(job) │                │              │               │
  │<─────────────────────│                   │                │              │               │
  │  200 {jobId, status,                     │                │              │               │
  │       executionId,                       │                │              │               │
  │       response}                          │                │              │               │
```

Every `[Status]` transition shown is persisted (`jobRepo.update` /
`executionStore.update`) before the next stage begins — a concurrent `GET
/jobs/:id` mid-request sees real, current progress, not a stale snapshot.

## API changes

| Endpoint                   | Status                             | Notes                                                                                                                                                             |
| -------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /jobs`               | **New**                            | `{"goal": "..."}` → `{jobId, status, executionId, response}` (a `JobSummary`). Failure responses add `error: {category, message}` alongside `status: "failed"`.   |
| `GET /jobs/:id`            | **New**                            | Returns the full serialized Job (goal, status, priority, executionIds, result, error, metadata). 404 if unknown.                                                  |
| `GET /jobs/:id/executions` | **New**                            | Returns `{executions: [...]}` — every Execution the Job owns (today: 0 or 1), each serialized identically to `GET /executions/:id`.                               |
| `POST /execute`            | **Deprecated, unchanged behavior** | Same request/response shape as milestone 004. Now delegates to `JobService` internally — see below — and responses carry a `Deprecation: true` header (RFC 8594). |
| `GET /executions/:id`      | Unchanged                          | Response now also includes `jobId` (present for any Execution created via `POST /jobs` or the now-Job-backed `POST /execute`).                                    |
| `GET /health`              | Unchanged                          |                                                                                                                                                                   |

**`POST /execute`'s backward compatibility is structural, not just
behavioral.** The handler now calls `JobService.createJob` and reshapes the
resulting `Job` back into the exact old response shape — including
`durationMs`, which intentionally isn't part of `JobResult` (see
`packages/shared/types/src/job-result.ts`) and is fetched from the
underlying Execution instead, specifically to keep that one legacy field
out of the Job-level type it doesn't conceptually belong in long-term.

## Future expansion: many Executions, many providers, many Artifacts

```
One Job
  │
  ├── Execution 1 ──> ExecutionGraph ──> [Node: search]      ──> Provider A
  ├── Execution 2 ──> ExecutionGraph ──> [Node: code-gen]    ──> Provider B
  └── Execution 3 ──> ExecutionGraph ──> [Node: image-gen]   ──> Provider C
         │                │                    │
         └────────────────┴────────────────────┴──> Artifacts ──> Job Result
```

What this milestone already has in place for that future, without
implementing it:

- `Job.executionIds` is already an array (Decision in
  `docs/adr/0005-job-domain-and-kernel-foundation-boundary.md`).
- `Job.beginExecution` already appends rather than replaces.
- `JobResult` is already its own type, not an alias for `ExecutionResult`
  — specifically because synthesizing a result from several Executions'
  outputs (and eventually their Artifacts) is a fundamentally different
  operation than projecting one Execution's result, and giving it a
  distinct type now means that synthesis logic has a clear home
  (`jobResultFromExecutionResult`, or its future multi-Execution
  successor) instead of overloading `ExecutionResult`.

What multi-Execution planning will actually require, not yet built:

- A Planner (or a new orchestration step) that decides _how many_
  Executions a goal needs and in what order/dependency relationship —
  today's Planner and JobService only ever produce exactly one.
- An Artifact concept (files, images, structured data an Execution
  produces) — referenced in the mission-level pipeline diagram
  (001-system-architecture.md) but not modeled anywhere yet; `ExecutionResult.summary`
  is the entire output model today.
- A real result-synthesis strategy in `JobService`/`JobResult` for
  combining more than one Execution's contribution — today's
  `jobResultFromExecutionResult` only ever has one input.

## Known limitations of this milestone

- **One Execution per Job, always.** `JobService.createJob` creates
  exactly one Execution; there is no branching or multi-step planning yet.
- **No Artifact model.** The word appears in this document's diagrams as
  the acknowledged future shape, not as implemented code.
- **`InMemoryJobRepository` duplicates `InMemoryExecutionStore`'s
  structure** rather than sharing a generic base — a deliberate, disclosed
  trade-off (see ADR 0005, Decision 4) in favor of not touching existing,
  stable code.
- **`POST /jobs` and `POST /execute` share identical failure semantics**
  (the same error categories, the same status codes) since both go through
  the same `JobService` — but their success response shapes deliberately
  differ (`JobSummary` vs. the older, wider shape), which is intentional,
  not an inconsistency to fix.
