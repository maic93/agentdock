# @agentdock/kernel-model-registry

**Purpose:** Catalog of available models with capability metadata.
Deliberately kept thin and dependency-free — nearly everything in the
kernel depends on this package, so it must not depend on much itself.

**Public API (once implemented):** `registerModel(...)`, `queryModels(...)`.

**May depend on:** `@agentdock/shared-types` only.

**Must never depend on:** anything else under `packages/kernel` or
`packages/foundation`.

**Status:** Not implemented.
