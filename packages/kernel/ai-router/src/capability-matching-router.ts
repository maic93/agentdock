import type { Provider } from "@agentdock/provider-abstraction";
import { NoProviderAvailableError, type Router, type RoutingRequest } from "./router.js";

/**
 * Selects the first healthy provider whose capabilities include the
 * requested one. With one provider (Ollama) registered, this always
 * evaluates that single candidate — but the selection is expressed as a
 * filter-then-health-check over a list, not an `if (providerId ===
 * "ollama")` special case, so registering a second provider later changes
 * nothing about how selection works, only what's in the list.
 */
export class CapabilityMatchingRouter implements Router {
  constructor(private readonly providers: readonly Provider[]) {}

  async selectProvider(request: RoutingRequest): Promise<Provider> {
    const capableProviders = this.providers.filter((provider) =>
      provider.capabilities.includes(request.capability),
    );

    for (const provider of capableProviders) {
      const health = await provider.checkHealth();
      if (health.healthy) {
        return provider;
      }
    }

    throw new NoProviderAvailableError(request.capability);
  }
}
