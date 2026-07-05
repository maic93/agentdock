# @agentdock/plugin-provider-ollama

The first-party, and first, concrete `Provider` implementation: a client
for a locally (or remotely) running [Ollama](https://ollama.com) instance.

**Capabilities:** `text-generation`, via Ollama's `/api/generate` endpoint.

**Configuration:** `OllamaProviderConfig` (`baseUrl`, `model`, `timeoutMs`)
— passed in explicitly by the caller (see `apps/api`'s composition root),
never read from `process.env` internally. Only `@agentdock/foundation-config`
reads environment variables directly, per the repository's layered
configuration design.

**Testing:** every test injects a fake `fetch` implementation matching
Ollama's real, documented response shapes — no real network access, and no
real Ollama instance, is needed to run this package's test suite.

See `plugins/README.md` for what this directory is for and its
boundaries, and
[docs/architecture/004-execution-pipeline.md](../../docs/architecture/004-execution-pipeline.md)
for how this fits into the full pipeline.
