import type { Execution, Job, WorkflowPlan } from "@agentdock/shared-types";

/**
 * Converts a domain Execution into a plain, JSON-safe object for an API
 * response. error.cause is intentionally omitted.
 */
export function serializeExecution(execution: Execution): Record<string, unknown> {
  return {
    id: execution.id,
    jobId: execution.jobId,
    goal: execution.goal,
    status: execution.status,
    intent: execution.intent,
    capabilities: execution.capabilities,
    graph: execution.graph ? { nodes: execution.graph.nodes } : undefined,
    result: execution.result,
    error: execution.error
      ? { message: execution.error.message, code: execution.error.code }
      : undefined,
    metadata: {
      createdAt: execution.metadata.createdAt.toISOString(),
      updatedAt: execution.metadata.updatedAt.toISOString(),
    },
  };
}

/** Converts a domain Job into a plain, JSON-safe object for an API response. */
export function serializeJob(job: Job): Record<string, unknown> {
  return {
    id: job.id,
    goal: job.goal,
    status: job.status,
    priority: job.priority,
    executionIds: job.executionIds,
    workflowId: job.workflowId,
    result: job.result,
    error: job.error ? { message: job.error.message, code: job.error.code } : undefined,
    metadata: {
      createdAt: job.metadata.createdAt.toISOString(),
      updatedAt: job.metadata.updatedAt.toISOString(),
    },
  };
}

/** Converts a domain WorkflowPlan into a plain, JSON-safe object for GET /workflows/:id. */
export function serializeWorkflow(plan: WorkflowPlan): Record<string, unknown> {
  return {
    id: plan.workflowId,
    jobId: plan.jobId,
    rootExecutionId: plan.rootExecutionId,
    nodes: plan.nodes,
    edges: plan.edges,
    metadata: {
      createdAt: plan.metadata.createdAt.toISOString(),
      updatedAt: plan.metadata.updatedAt.toISOString(),
    },
  };
}

/** Converts a WorkflowPlan into the graph-focused shape GET /workflows/:id/graph returns. */
export function serializeWorkflowGraph(plan: WorkflowPlan): Record<string, unknown> {
  return {
    nodes: plan.nodes,
    edges: plan.edges,
    metadata: {
      createdAt: plan.metadata.createdAt.toISOString(),
      updatedAt: plan.metadata.updatedAt.toISOString(),
    },
  };
}
