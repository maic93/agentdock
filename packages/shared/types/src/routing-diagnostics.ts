import type { Capability } from "./capability.js";

/**
 * How one candidate provider scored during a routing decision. `providerId`
 * is a plain `string`, not the branded `ProviderId` from
 * `@agentdock/provider-abstraction` — `shared/types` must never depend on
 * that package (see docs/architecture/002-repository-foundation.md,
 * Section 4), so diagnostic data, which is read-only reporting rather than
 * something used to look a provider back up through a typed API, uses the
 * plain string form instead.
 */
export interface ProviderScore {
  readonly providerId: string;
  readonly eligible: boolean;
  readonly score: number;
  /** Named scoring components (e.g. `priority`, `latency`, `cost`) and their individual contributions. Empty when `eligible` is false. */
  readonly breakdown: Readonly<Record<string, number>>;
  /** Present when `eligible` is false, explaining why this provider was excluded. */
  readonly rejectionReason?: string;
}

/**
 * The immutable record of one routing (and, once a prompt was built for
 * the selected provider, prompt-building) decision. Attached to an
 * {@link ExecutionResult} once an Execution completes or fails during
 * execution, so "why did AgentDock pick this provider" is always
 * answerable after the fact, not just inferable from the outcome.
 */
export interface RoutingDiagnostics {
  readonly capability: Capability;
  /** Absent if no eligible provider was found. */
  readonly selectedProviderId?: string;
  /** Every candidate considered, selected or not — this is where "rejected providers" (per this milestone's requirement) live. */
  readonly scores: readonly ProviderScore[];
  readonly reason: string;
  readonly selectionDurationMs: number;
  /** Absent if routing failed before a prompt was ever built. */
  readonly promptTemplateId?: string;
  readonly promptBuildDurationMs?: number;
}
