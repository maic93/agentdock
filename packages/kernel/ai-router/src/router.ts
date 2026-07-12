import type { Provider } from "@agentdock/provider-abstraction";
import type { Capability, RoutingDiagnostics } from "@agentdock/shared-types";

/** What the AI Router needs to select a provider: which capability must be satisfied. */
export interface RoutingRequest {
  readonly capability: Capability;
}

/** The outcome of a diagnosable routing decision — a provider if one was eligible, and always a full diagnostics record. */
export interface RoutingSelection {
  readonly provider?: Provider;
  readonly diagnostics: RoutingDiagnostics;
}

/**
 * Selects a {@link Provider} able to satisfy a {@link RoutingRequest}. The
 * Executor depends on this interface, never on a concrete provider list
 * directly or a concrete routing strategy — so routing logic (today: a
 * deterministic score over priority/latency/cost, see ScoringRouter; the
 * original "first healthy capable provider" strategy is still available as
 * CapabilityMatchingRouter) can evolve without the Executor changing.
 *
 * `selectProviderWithDiagnostics` was added in milestone 007, additively:
 * `selectProvider` — every existing caller's method — is unchanged in
 * behavior, and every `Router` implementation now derives it from the new
 * method rather than maintaining two separate selection algorithms.
 */
export interface Router {
  selectProvider(request: RoutingRequest): Promise<Provider>;
  /** Like `selectProvider`, but never throws — an unsatisfiable request comes back as a `RoutingSelection` with no `provider` and diagnostics explaining why, rather than a rejected promise. */
  selectProviderWithDiagnostics(request: RoutingRequest): Promise<RoutingSelection>;
}

/** Thrown when no healthy provider can satisfy the requested capability. */
export class NoProviderAvailableError extends Error {
  constructor(public readonly capability: Capability) {
    super(`No healthy provider is available for capability "${capability}".`);
    this.name = "NoProviderAvailableError";
  }
}
