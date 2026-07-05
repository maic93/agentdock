# @agentdock/provider-abstraction

**Purpose:** The single, minimal, stable interface every model/search/tool
provider implements (`ModelProvider`, `SearchProvider`, `ToolProvider`).
This is intentionally the most public, most stable, and least-dependent
package in the repository — hundreds of external plugins will depend on it,
so breaking changes here are the most expensive kind this project can make.

**Public API (implemented):** the `Provider` interface (`id`,
`capabilities`, `checkHealth`, `listModels`, `execute`), `ProviderId`,
`ProviderHealth`, `ProviderExecuteRequest`/`ProviderExecuteResult`, and the
shared error vocabulary (`ProviderError`, `ProviderTimeoutError`,
`ProviderUnavailableError`) every concrete provider throws.

**May depend on:** `@agentdock/shared-types` only.

**Must never depend on:** everything else — no exceptions.

**Who may import it:** `packages/kernel/*`, all `plugins/*`, all external
community plugins.

**Status:** Implemented. See
[docs/architecture/004-execution-pipeline.md](../../../docs/architecture/004-execution-pipeline.md).
The first (and only) concrete implementation is `plugins/provider-ollama`.
