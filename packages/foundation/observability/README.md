# @agentdock/foundation-observability

**Purpose:** Structured logging and metrics, split out from the kernel per
single-responsibility (the kernel emits events/log calls; this package
decides how they're formatted, shipped, and exposed as metrics).

**Public API (once implemented):** a `Logger` interface and a metrics
recording interface, both provider-agnostic (the actual backend — e.g.
stdout JSON logs locally, an OTLP exporter in production — is swappable
behind these interfaces).

**May depend on:** `@agentdock/shared-types`, `@agentdock/foundation-config`.

**Must never depend on:** `packages/kernel/*`, `apps/*`, `plugins/*`.

**Status:** Not implemented.
