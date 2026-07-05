import type { Provider } from "@agentdock/provider-abstraction";
import type { Capability } from "@agentdock/shared-types";

/** What the AI Router needs to select a provider: which capability must be satisfied. */
export interface RoutingRequest {
  readonly capability: Capability;
}

/**
 * Selects a {@link Provider} able to satisfy a {@link RoutingRequest}. The
 * Executor depends on this interface, never on a concrete provider list
 * directly or a concrete routing strategy — so routing logic (today:
 * "first healthy capable provider"; later: cost/latency-aware, per the
 * approved AI routing philosophy) can evolve without the Executor changing.
 */
export interface Router {
  selectProvider(request: RoutingRequest): Promise<Provider>;
}

/** Thrown when no healthy provider can satisfy the requested capability. */
export class NoProviderAvailableError extends Error {
  constructor(public readonly capability: Capability) {
    super(`No healthy provider is available for capability "${capability}".`);
    this.name = "NoProviderAvailableError";
  }
}
