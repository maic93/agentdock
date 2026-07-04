# @agentdock/kernel-planner

**Purpose:** Convert a user-submitted goal into a task graph (a DAG of
tasks with declared capability requirements and dependencies). This is
intent classification and decomposition only — the Planner never executes
anything.

**Public API (once implemented):** `planGoal(goal, context) -> TaskGraph`.

**May depend on:** `@agentdock/shared-types`,
`@agentdock/foundation-knowledge-base` (read-only), `@agentdock/provider-abstraction`
(to query model capabilities for planning purposes only).

**Must never depend on:** `@agentdock/kernel-workflow-engine`,
`@agentdock/kernel-ai-router`, any concrete provider or tool plugin, any
`apps/*` package.

**Must remain internal:** decomposition heuristics/prompt strategies —
only the `TaskGraph` output shape is a public contract.

**Status:** Not implemented. This README documents the approved design
(see `docs/architecture/002-repository-foundation.md`, Section 3) so the
package's boundaries are established before any code is written.
