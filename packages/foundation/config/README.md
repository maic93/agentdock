# @agentdock/foundation-config

**Purpose:** Layered configuration resolution (defaults → file → env →
runtime override). This is the _only_ package that should read
`process.env` directly — everything else reads typed config through this
package's interface.

**Public API (once implemented):** a typed `getConfig<T>(key)` accessor
with layered resolution and validation.

**May depend on:** `@agentdock/shared-types` only.

**Must never depend on:** anything else under `packages/foundation` or
`packages/kernel` (nearly everything depends on config, so config itself
must stay minimal and dependency-free, same principle as
`kernel-model-registry` and `kernel-event-bus`).

**Status:** Not implemented.
