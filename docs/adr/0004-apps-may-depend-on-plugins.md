# 0004. Apps may depend on plugins directly, as a composition-root exception

**Status:** Accepted
**Date:** 2026-07-05
**Deciders:** @agentdock/core-team

## Context

This milestone's explicit scope excludes building a real Plugin System
(dynamic discovery/loading of plugins by capability, described as future
work in 001-system-architecture.md, Section 17). At the same time, the
milestone's actual goal is to prove AgentDock can execute a real user
request using a real AI model — which requires _something_ to construct a
concrete `OllamaProvider` and hand it to the Router.

The approved dependency rules (002-repository-foundation.md, Section 4)
never allowed `apps -> plugins` — apps could depend on kernel, foundation,
shared, and provider-abstraction, but not on any concrete plugin.
Respecting that as written would make this milestone impossible without
first building the Plugin System, which is explicitly out of scope.

## Decision

`apps/api` is permitted to import `@agentdock/plugin-provider-ollama`
directly, and only there — in `apps/api/src/composition.ts`, the
application's composition root. This is now a fourth allowed edge on
`scope:app` in `eslint.config.js`'s `depConstraints`, alongside kernel,
foundation, and shared.

The dependency rules for `kernel/*` and `foundation/*` are unchanged: they
still never see a concrete plugin, only the `Provider` interface from
`provider-abstraction`. Every consumer downstream of `composition.ts` (the
Router, the Executor, every route handler) only ever holds a `Provider`
reference — nothing about the kernel's boundary-respecting design changed,
only the one file responsible for constructing the initial object graph.

## Alternatives considered

- **Build a minimal Plugin System now, just enough to load one provider.**
  Rejected: the prompt for this milestone explicitly excludes Plugins as
  out of scope, and a "minimal" dynamic loader built only to satisfy one
  hardcoded provider would be exactly the kind of speculative abstraction
  the project's quality rules warn against — it would have no second
  plugin to prove it generalizes.
- **Put the OllamaProvider construction inside `kernel/ai-router` or
  `kernel/workflow-engine` instead of `apps/api`.** Rejected: this would
  violate the dependency rule that matters most (kernel packages never
  import concrete plugins), trading a narrow, well-justified exception for
  a much more damaging one.
- **Leave the dependency rule as strictly `apps -> {kernel, foundation,
shared, provider-abstraction}` and simply don't wire a real provider for
  this milestone.** Rejected: this would fail the milestone's stated
  success criterion ("a developer can clone the repository, start Ollama,
  call POST /execute, and receive a real AI response").

## Consequences

Positive: the milestone's real goal — proving the pipeline works against
an actual model — is achievable without pretending a Plugin System exists
before it does. The exception is narrow, single-purpose, and documented,
not a quiet general loosening of the dependency rules.

Negative: `apps/api` now has a direct build-time dependency on a specific
plugin package, which is exactly the coupling the Plugin System is meant to
eventually remove. This is accepted as temporary technical debt, not a
permanent design.

## Revisit when

A real Plugin System is built (dynamic discovery of providers/tools by
capability, per 001-system-architecture.md, Section 17). At that point,
`composition.ts` should be changed to discover providers through the
Plugin System instead of importing one by name, the `type:plugin` entry
should be removed from `scope:app`'s allowed dependencies, and this ADR
should be marked superseded.
