import type { Intent } from "@agentdock/shared-types";

/**
 * Thrown internally when the Capability Resolver produces no capabilities
 * for a resolved Intent — there is nothing for the Planner to build a graph
 * from. The Planner catches this and turns it into a Failed Execution
 * (see planner.ts); it is not expected to escape to callers.
 */
export class UnplannableGoalError extends Error {
  constructor(public readonly intent: Intent) {
    super(`No capabilities are available to satisfy intent "${intent.category}".`);
    this.name = "UnplannableGoalError";
  }
}
