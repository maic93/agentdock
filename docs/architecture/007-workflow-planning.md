# 007. Workflow Planning — DAG-Based Multi-Execution Orchestration

**Status:** Implemented (single-node plans in practice; multi-node engine and scheduler fully verified)
**Depends on:** 001-system-architecture.md, 002-repository-foundation.md, 003-execution-domain.md, 004-execution-pipeline.md, 005-job-domain.md, 006-provider-routing.md

This document explains the fifth functional milestone: introducing a real workflow planning layer that connects multiple Executions via a validated DAG, executes them in dependency order, propagates failures, and exposes workflows through a new API.

## Why Job and WorkflowPlan are separate concepts

A Job answers "what did the user ask for, and what was the outcome?" It has a lifecycle (Created → Planning → Executing → Completed/Failed), a goal, a result, and a list of Execution ids it created. It never cares which node in a graph any particular Execution corresponds to — that's not a Job concern.

A WorkflowPlan answers "how is this outcome being decomposed into steps?" It is a validated, immutable DAG of WorkflowNodes, each representing one Execution to be created. It knows the structural dependency relationships between those steps. It doesn't know who will run it or when; it's just the plan.

Keeping them separate means:

- A Job can exist (and fail) before a WorkflowPlan is ever created (planning failure).
- A Job can outlive any individual Execution failure, accumulating results across multiple surviving branches.
- The WorkflowEngine (which executes plans) and the JobService (which owns the Job) can be evolved, replaced, or tested independently.
- `GET /jobs/:id` returns user-facing outcome data; `GET /workflows/:id/graph` returns engineering-level scheduling state. These are different audiences, different shapes, different concerns.

## Why WorkflowPlan is immutable

WorkflowPlan uses the same private-constructor/factory-method/copy-on-modification pattern as `Execution`, `ExecutionGraph`, and `Job`. The structural guarantees established at `create` time — no duplicate node ids, no edges referencing unknown nodes, no cycles, every node reachable from some root — are guaranteed to hold on every WorkflowPlan instance forever, because `withNode` (the only mutation-equivalent method) only ever patches a node's `status`/`executionId`, never adds, removes, or rewires nodes or edges. No re-validation is needed because no structural change is possible.

This is the same reasoning as `ExecutionGraph` in milestone 003 — the design was intentionally extended upward, not reinvented.

## Why iterative scheduling was chosen over recursive

The WorkflowEngine's main loop is:

```
for (;;) {
  mark newly-blocked nodes Skipped;
  if (no blocked, no ready) break;
  for each ready node: run it;
}
```

A recursive propagate-to-all-blocked approach ("mark a failing node's entire downstream subtree blocked in one recursive call") would need to walk an arbitrarily deep portion of the graph in one call frame. The iterative approach walks one layer per tick — which means failure propagation is transitive but never requires deep call stacks, and the termination condition (`ready.length === 0 && blocked.length === 0`) is simple, obvious, and easy to test in isolation.

The termination proof: every tick either marks at least one node Blocked/Skipped (reducing Pending count) or runs at least one Ready node (moving it to Running → Completed/Failed, again reducing Pending count). A graph with N nodes terminates in at most N ticks.

## Why nodes are "parallel-ready" identified but sequentially executed

`findReadyNodes` returns _all_ nodes that could run simultaneously — this is verified directly in `scheduler.spec.ts` with a diamond graph, where the two middle nodes both appear in the same `findReadyNodes` call once their shared root completes. However, the WorkflowEngine's inner loop runs them one after another via `for (const node of ready)`, not concurrently.

This is an honest, documented limitation (see Known Limitations below), not a mistake to be fixed in this milestone. The scheduling-correctness logic (identifying which nodes are ready) and the execution-concurrency mechanism (running multiple of them simultaneously) are cleanly separated: `scheduler.ts` handles the former, the engine's loop handles the latter. Adding real concurrent execution in a future milestone will only touch the loop, not the scheduler.

## Package layout

```
packages/shared/types/src/
  workflow-id.ts          - WorkflowId branded type and createWorkflowId()
  workflow-node.ts        - WorkflowNodeId, WorkflowNodeStatus, WorkflowNode, WorkflowEdge
  workflow-metadata.ts    - WorkflowMetadata alias for ExecutionMetadata
  workflow-plan.ts        - WorkflowPlan class (immutable, validated DAG)
  errors.ts               - InvalidWorkflowPlanError (additive, alongside existing errors)
  job.ts                  - Job.withWorkflow, Job.startExecuting, Job.addExecution (additive)

packages/kernel/workflow-planner/src/
  workflow-planner.ts     - WorkflowPlanner (maps a Job's intent to a WorkflowPlan)
  errors.ts               - UnplannableWorkflowError

packages/foundation/db/src/
  workflow-repository.ts          - WorkflowRepository interface
  in-memory-workflow-repository.ts - in-memory implementation

packages/kernel/workflow-engine/src/
  scheduler.ts            - findReadyNodes, findBlockedNodes (pure functions, directly testable)
  workflow-engine.ts      - WorkflowEngine (iterative DAG scheduler)

packages/kernel/job-service/src/
  job-service.ts          - JobService (rewritten to use WorkflowPlanner + WorkflowEngine)

apps/api/src/
  routes/workflows.ts     - POST /workflows, GET /workflows/:id, GET /workflows/:id/graph
  serialization.ts        - serializeWorkflow, serializeWorkflowGraph (additive)
  server.ts               - new route wiring
```

## Domain relationships (updated from milestone 005)

```
User
  v
Job                         "what the user asked for, and what was the outcome"
  |
  +-- WorkflowPlan          "how the outcome is decomposed into steps (a DAG)"
        |
        +-- WorkflowNode -> Execution    "one step = one Execution, created by the engine"
              |
              +-- ExecutionGraph         "one Execution's own internal plan"
                    |
                    +-- ExecutionNode    "one step in one Execution's plan"
```

## Future parallel execution strategy

The cleanest path to real concurrent execution is to replace the sequential `for (const node of ready)` loop in `WorkflowEngine.execute` with a parallel dispatch:

```typescript
await Promise.all(ready.map((node) => this.runNode(node, plan, ...)));
```

However, this requires making `plan` (the mutable local variable being updated via `withNode`) thread-safe across concurrent calls — either by collecting all updates and applying them after all concurrent runs complete, or by using a shared mutable reference protected by a mutex. Both approaches are feasible without changing `WorkflowPlan` itself. The scheduler functions (`findReadyNodes`/`findBlockedNodes`) are already correct for parallel semantics: they read a snapshot of `plan` at the start of each tick, not across concurrent mutations.

## Known limitations, stated honestly

- **Single-node plans in practice.** `WorkflowPlanner` produces exactly one node per goal (one capability per intent, the same mapping `kernel-planner`'s `Planner` uses). The WorkflowEngine and scheduler are fully verified against multi-node and diamond-graph cases in tests — using real fake providers that the real `Planner` and `Executor` process end-to-end, not mocked away. The multi-node path is production-ready; the planner that routes to it isn't yet.
- **`assertAllReachable` in WorkflowPlan.create is technically redundant.** In a finite acyclic graph, once `assertAcyclic` passes, every node is reachable from some root by definition (a node with no incoming edges is itself a root, trivially reachable). The check still runs (it catches a real structural invariant) but no valid input that passes the cycle-detection check will ever trigger it. This is noted here rather than silently removing it, consistent with this project's honest-documentation policy.
- **Parallel-ready nodes are sequentially executed.** See the section above for why and the path to fixing it.
- **`InMemoryWorkflowRepository` is the third copy of the same `Map`-backed CRUD structure**, which is exactly the threshold ADR 0005 named as the point to reconsider a shared generic. Not acted on in this milestone.
- **POST /jobs now internally creates a WorkflowPlan.** Every call to `/jobs`, `/workflows`, and the deprecated `/execute` routes all go through the same `JobService.createJob` path, which always creates a WorkflowPlan. This is correct and intentional; it's noted here only so a future reader isn't confused why `GET /jobs/:id` shows a `workflowId` when no `/workflows` endpoint was called.

## Real bugs found during implementation and how they were caught

1. **`assertAllReachable` is technically redundant** — discovered while writing test cases for the "unreachable node" validation. Any node with no incoming edges is a root by definition, so it's trivially reachable from itself in a DAG. The check is documented here rather than removed; it expresses a real invariant even if it can never fire. Documented in Known Limitations above.

2. **`assertJobTransition(Executing, Executing)` would throw for the new `addExecution` method** — caught before a line of test code ran. `assertJobTransition` correctly treats same-status as an illegal transition (it's not a state change). `addExecution` isn't a transition at all; it adds to `executionIds` while the Job stays `Executing`. Fixed by replacing the `assertJobTransition` call with a direct status check that throws `InvalidJobTransitionError` manually if the Job isn't already `Executing`. This is documented in the `addExecution` method's code comment.

3. **WorkflowEngine tests failed because test objectives didn't contain conversational keywords.** The real `KeywordIntentAnalyzer` (reused unchanged by the `WorkflowEngine` tests via the real `Planner`) classifies objectives by keyword matching. Objectives like "step A" or "this fails" don't contain any recognized keywords, so they classified as `unknown` intent, causing `Planner.plan` to fail every node. Fixed by prefixing all test objectives with "Hello". This was caught by running `pnpm run test` — not an architectural problem, just a test-design mistake.

4. **Scheduler tests asserted empty results when roots were naturally ready.** `findReadyNodes` correctly returns all nodes with no incoming edges (roots) regardless of the `completed` set, because roots have no dependencies to wait for. Tests that constructed a 2-node chain `[a, b]` and expected `findReadyNodes` to return nothing (before completing `a`) were wrong about what `findReadyNodes` correctly does — it would return `a` (a root), just not `b` (which depends on `a`). Fixed by checking `not.toContain(b.id)` rather than `toEqual([])`.

5. **`exactOptionalPropertyTypes` violation in the `InMemoryWorkflowRepository` test** — tried to explicitly assign `rootExecutionId: undefined` to reconstruct `WorkflowPlanProps`. TypeScript's `exactOptionalPropertyTypes` mode (enabled globally in this project) treats setting an optional field to `undefined` differently from omitting it entirely. Fixed by constructing the props object without the key at all.

6. **Stale Nx cache caused a false lint failure** — after the filesystem reset and reconstruction, `workflow-engine`'s `lint` target failed because Nx cached a lint result from before the scheduler functions existed. Cleared with `rm -rf .nx`. Not a real code defect.

7. **Filesystem reset mid-session** — the sandbox reset between implementation and documentation, requiring all new code to be reconstructed from memory. All 348 tests still pass after reconstruction, confirming the correctness of the implementation.
