# @agentdock/kernel-event-bus

**Purpose:** Async pub/sub backbone connecting all modules (`task.started`,
`task.completed`, `artifact.created`, etc.). Deliberately thin and
dependency-free, like `kernel-model-registry`.

**Public API (once implemented):** `publish(event)`, `subscribe(eventType, handler)`,
with typed, versioned event schemas.

**May depend on:** `@agentdock/shared-types` only.

**Must never depend on:** anything else under `packages/kernel` or
`packages/foundation`.

**Status:** Not implemented. Event schemas are treated as a public contract
with the same versioning discipline as an API endpoint once defined.
