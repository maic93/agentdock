# @agentdock/provider-abstraction

**Purpose:** The single, minimal, stable interface every model/search/tool
provider implements (`ModelProvider`, `SearchProvider`, `ToolProvider`).
This is intentionally the most public, most stable, and least-dependent
package in the repository — hundreds of external plugins will depend on it,
so breaking changes here are the most expensive kind this project can make.

**Public API (once implemented):** the provider interfaces themselves, plus
a conformance test kit that plugin authors run against their implementation
before publishing.

**May depend on:** `@agentdock/shared-types` only.

**Must never depend on:** everything else — no exceptions. If this package
ever needs something from `packages/kernel` or `packages/foundation`, that
is a signal the abstraction boundary is wrong, not that an exception should
be made.

**Who may import it:** `packages/kernel/*`, all `plugins/*`, all external
community plugins.

**Status:** Not implemented. This is likely one of the first packages that
should be built, given how much depends on it — but it is not implemented
yet in this repository foundation phase.
