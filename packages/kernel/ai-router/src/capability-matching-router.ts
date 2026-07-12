import type { Provider } from "@agentdock/provider-abstraction";
import type { ProviderRegistry } from "@agentdock/kernel-provider-registry";
import type { ProviderScore, RoutingDiagnostics } from "@agentdock/shared-types";
import {
  NoProviderAvailableError,
  type Router,
  type RoutingRequest,
  type RoutingSelection,
} from "./router.js";

/**
 * Selects the first healthy provider whose capabilities include the
 * requested one, discovered dynamically through a {@link ProviderRegistry}
 * rather than a fixed list handed to the constructor — a provider
 * registered or unregistered at runtime is reflected immediately. Kept
 * (not removed) alongside {@link ScoringRouter} — see
 * docs/adr/0006-provider-registry.md for why both exist rather than one
 * replacing the other outright.
 */
export class CapabilityMatchingRouter implements Router {
  constructor(private readonly registry: ProviderRegistry) {}

  async selectProvider(request: RoutingRequest): Promise<Provider> {
    const { provider } = await this.selectProviderWithDiagnostics(request);
    if (!provider) {
      throw new NoProviderAvailableError(request.capability);
    }
    return provider;
  }

  async selectProviderWithDiagnostics(request: RoutingRequest): Promise<RoutingSelection> {
    const startedAt = Date.now();
    const candidates = this.registry.listProvidersByCapability(request.capability);

    const scores: ProviderScore[] = [];
    let selected: Provider | undefined;

    for (const provider of candidates) {
      const health = await provider.checkHealth();
      if (health.healthy && !selected) {
        selected = provider;
        scores.push({
          providerId: provider.id,
          eligible: true,
          score: 1,
          breakdown: { healthy: 1 },
        });
      } else if (health.healthy) {
        // Healthy, but a candidate already won — not scored competitively
        // by this simple strategy (see ScoringRouter for that), just
        // recorded as eligible-but-not-selected.
        scores.push({ providerId: provider.id, eligible: true, score: 0, breakdown: {} });
      } else {
        scores.push({
          providerId: provider.id,
          eligible: false,
          score: 0,
          breakdown: {},
          rejectionReason: health.message ?? "Provider is unhealthy.",
        });
      }
    }

    const diagnostics: RoutingDiagnostics = {
      capability: request.capability,
      ...(selected ? { selectedProviderId: selected.id } : {}),
      scores,
      reason: selected
        ? "First healthy provider supporting the requested capability."
        : `No healthy provider supports capability "${request.capability}".`,
      selectionDurationMs: Date.now() - startedAt,
    };

    return selected ? { provider: selected, diagnostics } : { diagnostics };
  }
}
