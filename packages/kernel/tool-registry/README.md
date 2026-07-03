# @agentdock/kernel-tool-registry

**Purpose:** Catalog and resolve available tools for task execution.

**Public API (once implemented):** `resolveTool(capability) -> ToolHandle`;
tool metadata schema.

**May depend on:** `@agentdock/shared-types`, `@agentdock/shared-sdk` (to
validate plugin manifests).

**Must never depend on:** concrete tool plugins by static import, `apps/*`.

**Must remain internal:** plugin discovery/loading mechanics.

**Status:** Not implemented.
