# 003. The Execution Domain

**Status:** Implemented (first vertical slice)
**Depends on:** 001-system-architecture.md, 002-repository-foundation.md

This document explains the first functional milestone of AgentDock: the
`Execution` domain model, its lifecycle, and why it is the central
abstraction every future module builds on.

## Why Execution is the core abstraction

AgentDock's mission (see 001-system-architecture.md) is to take a goal, not
a prompt, and turn it into a delivered result without the user choosing a
model, tool, or provider. Everything the approved architecture describes —
the Planner, the AI Router, the Workflow Engine, providers, plugins,
scheduling — is a stage that acts on _something_. That something is the
`Execution`: it represents a single user-requested goal from the moment
it's created until it reaches a terminal outcome.

Modeling this as one aggregate, rather than letting each module invent its
own notion of "the thing I'm working on," is what lets those modules
compose. The Planner doesn't need to know how the Scheduler triggers a
recurring goal; it just receives an `Execution` in the `Created` status and
hands back one in `Routing` (or `Failed`). The future Workflow Engine won't
need to know how the Planner built the graph; it just reads
`execution.graph`. This is the same principle behind the repository's
dependency-boundary rules (002-repository-foundation.md, Section 4) applied
to the domain model itself: modules depend on a shared, stable contract
instead of on each other's internals.

## Where the code lives, and why

- **`packages/shared/types`** — the `Execution` aggregate itself, and every
  value object it's built from (`Goal`, `Intent`, `Capability`,
  `ExecutionGraph`, `ExecutionNode`, `ExecutionStatus`, `ExecutionResult`,
  `ExecutionError`, `ExecutionMetadata`). This matches the package's already
  -approved purpose: cross-cutting types with no single behavioral owner,
  needed by the Planner, the future Workflow Engine, and the Execution
  Store alike.
- **`packages/kernel/planner`** — the first real implementation of the
  Planner's approved responsibility ("convert a goal into a task graph").
  Concretely: the Intent Analyzer, the Capability Resolver, and the graph-
  building logic that together drive an Execution from `Created` through
  `Routing`.
- **`packages/foundation/db`** — the `ExecutionStore` interface and its
  first (in-memory) implementation, matching the package's approved
  purpose as the persistence abstraction for control-plane data. The
  interface is written as async from the start (`Promise`-returning) even
  though nothing in the in-memory implementation actually awaits anything —
  because the real backing store will be PostgreSQL, and defining the
  interface as async now means that swap is not a breaking change later.

No new package was introduced for this milestone. The Execution domain fits
entirely within packages whose responsibilities were already defined in the
approved repository foundation.

## The lifecycle

```
Created → Analyzing → Planning → Routing → Executing → Completed
                                                       ↘ Failed
```

Failure can occur from any non-terminal stage — an Intent Analyzer can fail
just as easily as a running task can — so every non-terminal status can
also transition directly to `Failed`. `Completed` and `Failed` are both
terminal: neither allows any further transition.

This is implemented as a single source of truth
(`packages/shared/types/src/execution-status.ts`): an enum for the statuses
themselves, and one lookup table of legal transitions that every status
change is checked against. No code elsewhere in the codebase compares
against a string literal like `"planning"` — everything goes through
`ExecutionStatus.Planning` and the `assertTransition`/`canTransition`
functions. This is also why `Execution` is implemented as an immutable
value object with named transition methods (`startAnalyzing`,
`completeAnalysis`, `completePlanning`, `completeRouting`, `complete`,
`fail`) rather than a public `status` setter: the only way to change an
Execution's status is through a method that has already asserted the
transition is legal, so an illegal transition is a compile-time-reachable
but always-throws code path, never a silent state corruption.

`fail` deliberately returns a _new_ Execution rather than throwing an
exception up through the caller. A failed goal is a normal, expected outcome
of planning or execution — the lifecycle diagram shows `Failed` as a
first-class sibling of `Completed`, not an exceptional case — so callers
read `execution.status` and `execution.error` the same way they'd read
`execution.result`, rather than wrapping every call in a `try`/`catch`.

## What this milestone actually implements

This vertical slice takes a goal exactly as far as the Planner's approved
responsibility goes, and no further:

1. **Intent Analyzer** (`KeywordIntentAnalyzer`) — classifies a `Goal` into
   an `Intent`. Today it recognizes conversational keywords ("hello", "hi",
   "thanks", ...) and reports `"conversation"` with a confidence score and
   its reasoning; anything else is reported as `"unknown"` with zero
   confidence, rather than guessing. A `CompositeIntentAnalyzer` exists so a
   second analyzer can be added later (e.g. one backed by an LLM call, once
   providers exist) without changing anything that depends on the
   `IntentAnalyzer` interface.
2. **Capability Resolver** (`StaticCapabilityResolver`) — maps an `Intent`
   to the `Capability` list required to satisfy it. Today: `"conversation"`
   → `["text-generation"]`, `"unknown"` → `[]`.
3. **Planner** — drives an `Execution` through `Analyzing` and `Planning`,
   building an `ExecutionGraph` with one node per required capability
   (chained by dependency, so a resolver that returns more than one
   capability later produces a valid multi-node DAG with no change to this
   loop) and handing back an `Execution` left in the `Routing` status. If
   planning can't proceed — most concretely, if the resolved capability list
   is empty — the Execution is instead returned in the `Failed` status with
   an `UNPLANNABLE_GOAL` error.
4. **ExecutionStore** (`InMemoryExecutionStore`) — `create`, `get`,
   `update`, `list`, `delete`, backed by a `Map`. This is the "PostgreSQL
   later" store referenced in 002-repository-foundation.md, Section 3 — the
   "later" hasn't arrived yet.

Nothing in this milestone implements the AI Router, the Workflow Engine, or
any provider — an Execution reaching `Routing` status is exactly where this
slice's responsibility ends. The lifecycle methods for `completeRouting`
and `complete` exist and are tested because the _domain model_ must support
the full lifecycle now (so the Workflow Engine and AI Router have a stable
contract to build against), even though no module yet drives an Execution
through those later stages in a real deployment.

## How future modules extend this

- **The AI Router** will read an `Execution` in the `Routing` status, assign
  a `provider` (and optionally `estimatedCostUsd`/`estimatedDurationMs`) to
  each `ExecutionNode` in `execution.graph`, and call
  `execution.completeRouting()`.
- **The Workflow Engine** will read an `Execution` in the `Executing`
  status, run each `ExecutionNode` respecting `dependencies`, and call
  `execution.complete(result)` or `execution.fail(error)` depending on the
  outcome.
- **Plugins and providers** will be the things a routed `ExecutionNode`'s
  `provider` field ultimately names — they don't touch `Execution` directly,
  the Workflow Engine does on their behalf.
- **Scheduling** will call `Planner.plan(Execution.create(goal))` on a timer
  instead of in response to a live request — nothing about the Execution
  model itself needs to change for that.
- **A second Intent Analyzer or Capability Resolver** is additive: implement
  the existing interface, add it to a `CompositeIntentAnalyzer`, and nothing
  that already depends on the interfaces needs to change.

None of this is speculative code sitting unused in this milestone — it's a
description of how the already-implemented, already-tested lifecycle
methods and interfaces get exercised next, once the modules that call them
exist.
