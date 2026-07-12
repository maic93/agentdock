import type { Capability } from "@agentdock/shared-types";
import type { ProviderId } from "./provider-id.js";

/** Where a provider actually runs — used by routing to prefer local providers when a policy asks for that (see docs/architecture/006-provider-routing.md). */
export type ProviderType = "local" | "cloud";

/** A coarse cost classification, used as a scoring input rather than a real-time price. */
export type CostTier = "free" | "low" | "medium" | "high";

/** A coarse latency classification, used as a scoring input rather than a measured benchmark. */
export type LatencyTier = "fast" | "medium" | "slow";

/**
 * Structured, machine-readable facts about a {@link Provider} — what it
 * supports, how it's classified for routing purposes, and how it should be
 * weighed against other providers. This is what the AI Router's scoring
 * strategy reads instead of ever inspecting a provider's id or name
 * directly (see docs/architecture/006-provider-routing.md for why that
 * distinction matters).
 *
 * `capabilities` here is the same data as `Provider.capabilities` — not a
 * second, independently-maintained list. A concrete provider constructs
 * its metadata from the same array it exposes at the top level, so there
 * is exactly one place that decides what a provider can do.
 */
export interface ProviderMetadata {
  readonly id: ProviderId;
  readonly displayName: string;
  readonly providerType: ProviderType;
  /** The version of this provider *adapter*, not the underlying service it talks to — AgentDock has no way to query that without an extra, provider-specific call. */
  readonly version: string;
  readonly capabilities: readonly Capability[];
  readonly supportsStreaming: boolean;
  readonly supportsVision: boolean;
  readonly supportsTools: boolean;
  readonly supportsJSON: boolean;
  readonly supportsFunctionCalling: boolean;
  readonly contextWindow: number;
  readonly maxOutputTokens: number;
  /** Higher is preferred. Used as a scoring input and as the routing tie-breaker. */
  readonly priority: number;
  readonly costTier: CostTier;
  readonly latencyTier: LatencyTier;
}
