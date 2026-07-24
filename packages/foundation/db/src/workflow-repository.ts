import type { WorkflowId, WorkflowPlan } from "@agentdock/shared-types";

/**
 * Persistence abstraction for WorkflowPlans — the same design as
 * ExecutionStore and JobRepository, for the same reasons.
 */
export interface WorkflowRepository {
  create(plan: WorkflowPlan): Promise<WorkflowPlan>;
  get(id: WorkflowId): Promise<WorkflowPlan>;
  update(plan: WorkflowPlan): Promise<WorkflowPlan>;
  list(): Promise<readonly WorkflowPlan[]>;
  delete(id: WorkflowId): Promise<void>;
}
