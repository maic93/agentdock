# @agentdock/foundation-scheduler

**Purpose:** Cron-like and event-triggered recurring job execution — turns
a goal or workflow template into a recurring trigger that re-invokes the
Planner/Workflow Engine at trigger time, rather than persisting one static
plan forever.

**Public API (once implemented):** a `Scheduler` service interface
(register/cancel a recurring trigger).

**May depend on:** `@agentdock/shared-types`, `@agentdock/foundation-db`,
`@agentdock/foundation-config`. May *invoke* `kernel-workflow-engine` at
trigger time (this is the one intentional exception where a foundation
package calls into the kernel's public API — documented explicitly here
because it looks like a boundary violation of the "foundation never depends
on kernel" rule at first glance; it is not, because the dependency is a
runtime invocation of a public entry point at trigger time, not a build-time
import of kernel internals).

**Must never depend on:** `apps/*`, `plugins/*`, or any `kernel/*` package's
*internal* (non-exported) modules.

**Status:** Not implemented.
