import type { Execution } from "@agentdock/shared-types";

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
