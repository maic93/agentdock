# @agentdock/kernel-planner

**Purpose:** Convert a user-submitted goal into a task graph (a DAG of
tasks with declared capability requirements and dependencies). This is
intent classification and decomposition only — the Planner never executes
anything.

**Public API (implemented):** `Planner.plan(execution: Execution): Execution`
— drives an Execution through `Analyzing` and `Planning`, returning it in
the `Routing` status (or `Failed`, with an `UNPLANNABLE_GOAL` error, if no
capability satisfies the resolved intent). Also exports `IntentAnalyzer` /
`KeywordIntentAnalyzer` / `CompositeIntentAnalyzer` and
`CapabilityResolver` / `StaticCapabilityResolver` as the extension points
the Planner is built from — see
[docs/architecture/003-execution-domain.md](../../../docs/architecture/003-execution-domain.md).

**May depend on:** `@agentdock/shared-types`,
`@agentdock/foundation-knowledge-base` (read-only), `@agentdock/provider-abstraction`
(to query model capabilities for planning purposes only).

**Must never depend on:** `@agentdock/kernel-workflow-engine`,
`@agentdock/kernel-ai-router`, any concrete provider or tool plugin, any
`apps/*` package.

**Must remain internal:** decomposition heuristics/prompt strategies —
only the `TaskGraph`/`ExecutionGraph` output shape is a public contract.

**Status:** Implemented (first vertical slice: keyword-based intent
analysis for the "conversation" intent, static capability resolution to
`text-generation`, and single/multi-node graph construction).
