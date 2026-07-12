# @agentdock/kernel-provider-registry

**Purpose:** Holds the set of providers AgentDock currently knows about
and answers questions about them — by id, by capability, by health —
without ever knowing which concrete provider it's holding. See
[docs/architecture/006-provider-routing.md](../../../docs/architecture/006-provider-routing.md)
and [ADR 0006](../../../docs/adr/0006-provider-registry.md).

**Public API (implemented):** `ProviderRegistry` —
`register`/`unregister`/`getProvider`/`listProviders`/
`listProvidersByCapability`/`getMetadata`/`getHealth`/`isAvailable`.
Providers can be registered and unregistered at runtime ("dynamic
discovery"), not only at startup.

**May depend on:** `@agentdock/provider-abstraction`, `@agentdock/shared-types`.

**Must never depend on:** any concrete plugin (`type:plugin`) — verified
directly: a deliberate attempt to import `OllamaProvider` here during
implementation was confirmed to fail lint via the dependency-boundary
rule, then reverted. `apps/*`.

**Status:** Implemented.
