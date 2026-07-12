import type { Provider, ProviderMetadata } from "@agentdock/provider-abstraction";
import type { ProviderRegistry } from "@agentdock/kernel-provider-registry";
import type { ProviderScore, RoutingDiagnostics } from "@agentdock/shared-types";
import {
  NoProviderAvailableError,
  type Router,
  type RoutingRequest,
  type RoutingSelection,
} from "./router.js";

const LATENCY_SCORES: Readonly<Record<ProviderMetadata["latencyTier"], number>> = {
  fast: 3,
  medium: 2,
  slow: 1,
};

const COST_SCORES: Readonly<Record<ProviderMetadata["costTier"], number>> = {
  free: 3,
  low: 2,
  medium: 1,
  high: 0,
};

/**
 * The default provider-selection strategy: scores every candidate provider
 * on priority, latency tier, and cost tier — reading only
 * {@link ProviderMetadata}, never a provider's id or display name, per
 * this milestone's requirement that "the router must never inspect
 * provider names." Capability support and health are eligibility gates,
 * not scored components — an unhealthy or incapable provider cannot win
 * regardless of how favorably its other metadata would score, the same
 * behavior {@link CapabilityMatchingRouter} already had.
 *
 * Deterministic by construction: the score is a pure function of
 * unchanging metadata plus a health check performed once per candidate,
 * and ties are broken first by `priority` (descending), then by
 * `providerId` (ascending, lexicographic) — see
 * docs/architecture/006-provider-routing.md for the full reasoning.
 */
export class ScoringRouter implements Router {
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

    const scored: Array<{ provider: Provider; score: ProviderScore }> = [];
    const rejected: ProviderScore[] = [];

    for (const provider of candidates) {
      const health = await provider.checkHealth();
      if (!health.healthy) {
        rejected.push({
          providerId: provider.id,
          eligible: false,
          score: 0,
          breakdown: {},
          rejectionReason: health.message ?? "Provider is unhealthy.",
        });
        continue;
      }
      scored.push({ provider, score: scoreProvider(provider) });
    }

    scored.sort((a, b) => compareScores(a, b));

    const winner = scored[0];
    const scores = [...scored.map((entry) => entry.score), ...rejected];

    const diagnostics: RoutingDiagnostics = {
      capability: request.capability,
      ...(winner ? { selectedProviderId: winner.provider.id } : {}),
      scores,
      reason: winner
        ? `Highest-scoring eligible provider (score ${winner.score.score}).`
        : `No healthy, capable provider is available for capability "${request.capability}".`,
      selectionDurationMs: Date.now() - startedAt,
    };

    return { ...(winner ? { provider: winner.provider } : {}), diagnostics };
  }
}

function scoreProvider(provider: Provider): ProviderScore {
  const metadata = provider.metadata;
  const breakdown = {
    priority: metadata.priority,
    latency: LATENCY_SCORES[metadata.latencyTier],
    cost: COST_SCORES[metadata.costTier],
  };
  const score = breakdown.priority + breakdown.latency + breakdown.cost;
  return { providerId: provider.id, eligible: true, score, breakdown };
}

function compareScores(
  a: { provider: Provider; score: ProviderScore },
  b: { provider: Provider; score: ProviderScore },
): number {
  if (a.score.score !== b.score.score) {
    return b.score.score - a.score.score;
  }
  if (a.provider.metadata.priority !== b.provider.metadata.priority) {
    return b.provider.metadata.priority - a.provider.metadata.priority;
  }
  return a.provider.id < b.provider.id ? -1 : a.provider.id > b.provider.id ? 1 : 0;
}
