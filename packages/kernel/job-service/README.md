# @agentdock/kernel-job-service

**Purpose:** Orchestrates the Job domain on top of the existing Execution
infrastructure. A `Job` represents the user's requested outcome; an
`Execution` (see `@agentdock/shared-types`) represents a single unit of
work created to achieve it. This package is what creates that Execution,
hands it to the existing Planner and Executor completely unchanged, and
reflects each stage back onto the Job. See
[docs/architecture/005-job-domain.md](../../../docs/architecture/005-job-domain.md).

**Public API (implemented):** `JobService.createJob(goalText: string):
Promise<Job>` — creates a Job, creates and plans an Execution owned by it,
executes it, and returns the Job in its final `Completed` or `Failed`
state. Throws only for an invalid goal itself; every downstream failure
(planning, routing, provider) is reflected as a Failed Job, never a thrown
exception.

**May depend on:** `@agentdock/shared-types`, `@agentdock/kernel-planner`,
`@agentdock/kernel-workflow-engine`, `@agentdock/foundation-db` (this last
one closes a gap between the approved design and the enforced dependency
rule — see [ADR 0005](../../../docs/adr/0005-job-domain-and-kernel-foundation-boundary.md)).

**Must never depend on:** `apps/*`, `plugins/*` directly.

**Status:** Implemented (single Execution per Job — see the milestone's
known limitations in docs/architecture/005-job-domain.md for what
multi-execution planning will require later).
