# plugins/

First-party **reference plugins only**. This directory exists to prove the
plugin system works and to give contributors copyable, real implementations
to learn from — it is deliberately kept small.

## What belongs here

A minimal set of first-party provider and tool plugins (currently reserved:
`provider-ollama`, `provider-openai`, `provider-anthropic`,
`tool-web-search`, `tool-filesystem`), each built strictly against the
public `@agentdock/shared-sdk` and `@agentdock/provider-abstraction`
contracts — no special internal access not available to a third-party
plugin author.

## What never belongs here

The bulk of the plugin ecosystem. Community and most third-party plugins
belong in **their own repositories**, discovered at runtime via the plugin
registry, not committed here. This directory must not become "just one more
provider" accumulation — see the risk called out explicitly in
`docs/architecture/002-repository-foundation.md`, Section 12. PRs adding new
plugins here beyond the reserved reference set should expect extra scrutiny
and likely a redirect to a separate repository.

## Status

`provider-ollama` is implemented (see
[docs/architecture/004-execution-pipeline.md](../docs/architecture/004-execution-pipeline.md)).
The remaining reference plugins (`provider-openai`, `provider-anthropic`,
`tool-web-search`, `tool-filesystem`) are not implemented yet — they depend
on `@agentdock/shared-sdk`, which doesn't exist yet either. Each of their
subdirectories currently contains only a README stating this.
