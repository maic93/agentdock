import type { Intent } from "@agentdock/shared-types";

/**
 * Thrown when the Capability Resolver produces no capabilities for a
 * resolved Intent — mirrors `UnplannableGoalError` from
 * `@agentdock/kernel-planner` exactly (same cause, same shape), kept as
 * its own type here rather than imported from that package because a
 * WorkflowPlanner failure and a single-Execution Planner failure are
 * caught at different layers (JobService, not the Executor) and shouldn't
 * be structurally coupled just because they currently share a cause.
 */
export class UnplannableWorkflowError extends Error {
  constructor(public readonly intent: Intent) {
    super(`No capabilities are available to satisfy intent "${intent.category}".`);
    this.name = "UnplannableWorkflowError";
  }
}
