import type { Execution, Job } from "@agentdock/shared-types";

/**
 * Converts a domain {@link Execution} into a plain, JSON-safe object for
 * an API response. This is deliberately an application-layer concern, not
 * something Execution itself knows how to do — the domain model
 * (packages/shared/types) has no reason to know what an HTTP response
 * looks like.
 *
 * `error.cause` is intentionally omitted: it may be an arbitrary caught
 * value (including a nested Error whose own fields don't serialize
 * meaningfully via JSON.stringify), and exposing it doesn't help an API
 * consumer beyond what `error.message` and `error.code` already convey.
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

/**
 * Converts a domain {@link Job} into a plain, JSON-safe object for an API
 * response, mirroring {@link serializeExecution}'s shape and reasoning
 * exactly (same `error.cause` omission, same ISO-string timestamps).
 */
export function serializeJob(job: Job): Record<string, unknown> {
  return {
    id: job.id,
    goal: job.goal,
    status: job.status,
    priority: job.priority,
    executionIds: job.executionIds,
    result: job.result,
    error: job.error ? { message: job.error.message, code: job.error.code } : undefined,
    metadata: {
      createdAt: job.metadata.createdAt.toISOString(),
      updatedAt: job.metadata.updatedAt.toISOString(),
    },
  };
}
