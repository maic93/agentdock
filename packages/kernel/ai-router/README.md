# @agentdock/kernel-ai-router

**Purpose:** Select a concrete provider for a required capability, reading
only structured `ProviderMetadata` — never a provider's id or name. See
the AI routing philosophy in `docs/architecture/001-system-architecture.md`,
Section 15, and the scoring design in
`docs/architecture/006-provider-routing.md`.

**Public API (implemented):** `Router` (the interface the Executor depends
on: `selectProvider`, and the diagnosable `selectProviderWithDiagnostics`),
`RoutingRequest`, `RoutingSelection`, `NoProviderAvailableError`, and two
strategies:

- `ScoringRouter` — the default as of milestone 007. Scores every capable,
  healthy candidate on `priority`/`latencyTier`/`costTier`; deterministic,
  ties broken by priority then provider id.
- `CapabilityMatchingRouter` — the original "first healthy capable
  provider" strategy, kept alongside `ScoringRouter` rather than removed
  (see [ADR 0006](../../../docs/adr/0006-provider-registry.md)).

Both discover providers dynamically through a
`@agentdock/kernel-provider-registry` `ProviderRegistry` passed to their
constructor, rather than a fixed array — a provider registered at runtime
is visible on the next routing decision with no Router reconstruction.

**May depend on:** `@agentdock/kernel-provider-registry`,
`@agentdock/provider-abstraction`, `@agentdock/shared-types`.

**Must never depend on:** any concrete provider plugin package
(`type:plugin`), `apps/*`.

**Must remain internal:** routing heuristics/weightings.

**Status:** Implemented, including diagnostics. Scoring weights are an
unweighted sum, untested against more than one real provider — see
Known Limitations in docs/architecture/006-provider-routing.md.
