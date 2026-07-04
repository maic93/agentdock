# @agentdock/shared-types

**Purpose:** Cross-cutting TypeScript types and schemas with no home in a
specific layer (e.g. `TaskGraph`, `TaskStatus`, event payload shapes)
shared between multiple packages.

**Public API:** everything exported from here is public by definition.

**May depend on:** nothing else in the workspace.

**Must never depend on:** any other `@agentdock/*` package — this is the
most foundational package in the dependency graph; if it needed to depend
on something else, that thing wouldn't belong under `shared/`.

**Status:** Not implemented.
