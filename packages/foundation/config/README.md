# @agentdock/foundation-config

**Purpose:** Layered configuration resolution. This is the _only_ package
that reads `process.env` directly — everything else reads typed config
through this package's interface.

**Public API (implemented):** `AppConfig` (`ollamaBaseUrl`, `ollamaModel`,
`requestTimeoutMs`, `port`), `loadConfig(env?)`, and `ConfigurationError`.
`loadConfig` validates every field and throws immediately on anything
missing or malformed — AgentDock fails fast on bad configuration rather
than failing later, confusingly, on the first request.

**May depend on:** `@agentdock/shared-types` only.

**Must never depend on:** anything else under `packages/foundation` or
`packages/kernel`.

**Status:** Implemented for the fields this milestone's pipeline needs
(`OLLAMA_BASE_URL`, `OLLAMA_MODEL`, `REQUEST_TIMEOUT_MS`, `PORT`). More
configuration will be added here as future foundation packages need it —
not sooner.
