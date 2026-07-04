import type { Capability, Intent, IntentCategory } from "@agentdock/shared-types";

/**
 * Maps a resolved {@link Intent} to the capabilities required to satisfy
 * it. The Planner depends on this interface rather than a lookup table
 * directly, so the resolution strategy (static map today; something more
 * dynamic later, e.g. per-provider capability negotiation) can change
 * without the Planner's code changing.
 */
export interface CapabilityResolver {
  resolve(intent: Intent): readonly Capability[];
}

const CAPABILITIES_BY_INTENT: Readonly<Record<IntentCategory, readonly Capability[]>> = {
  conversation: ["text-generation"],
  unknown: [],
};

/**
 * The first Capability Resolver: a static lookup table. "unknown" resolves
 * to no capabilities at all — deliberately, since AgentDock has no
 * capability for goals it couldn't classify, and the Planner (see
 * planner.ts) treats an empty capability list as an unplannable goal rather
 * than guessing.
 */
export class StaticCapabilityResolver implements CapabilityResolver {
  resolve(intent: Intent): readonly Capability[] {
    return CAPABILITIES_BY_INTENT[intent.category];
  }
}
