import {
  type Clock,
  createExecutionError,
  createExecutionResult,
  type Execution,
  type ExecutionError,
  ExecutionStatus,
} from "@agentdock/shared-types";
import { NoProviderAvailableError, type Router } from "@agentdock/kernel-ai-router";
import { ProviderError } from "@agentdock/provider-abstraction";
import { InvalidExecutionStateError } from "./errors.js";

/**
 * Runs an Execution's planned graph against real providers, via the
 * Router, and drives it to a terminal outcome.
 *
 * Today's graphs only ever contain one node (see the Planner), so the loop
 * below runs exactly once in practice — but it iterates `graph.nodes` in
 * order rather than special-casing "the one node," so a Planner that later
 * produces a real multi-node chain is executed correctly with no change
 * here. The combined result currently reports the *last* node's output;
 * how a genuinely branching, multi-output graph should be summarized is
 * intentionally left for whenever a Planner actually produces one, rather
 * than guessed at now.
 */
export class Executor {
  constructor(
    private readonly router: Router,
    private readonly clock?: Clock,
  ) {}

  async execute(execution: Execution): Promise<Execution> {
    if (execution.status !== ExecutionStatus.Routing) {
      throw new InvalidExecutionStateError(execution.status);
    }

    const executing = execution.completeRouting(this.clock);
    const graph = executing.graph;

    if (!graph || graph.size === 0) {
      return executing.fail(
        createExecutionError("Execution has no plan to execute.", "NO_EXECUTABLE_GRAPH"),
        this.clock,
      );
    }

    const startedAt = Date.now();
    try {
      let output = "";
      let model = "";
      let providerId = "";

      for (const node of graph.nodes) {
        const provider = await this.router.selectProvider({ capability: node.capability });
        const providerResult = await provider.execute({
          objective: node.objective,
          capability: node.capability,
        });
        output = providerResult.output;
        model = providerResult.model;
        providerId = provider.id;
      }

      const durationMs = Date.now() - startedAt;
      const result = createExecutionResult(output, { provider: providerId, model, durationMs });
      return executing.complete(result, this.clock);
    } catch (cause) {
      return executing.fail(toExecutionError(cause), this.clock);
    }
  }
}

function toExecutionError(cause: unknown): ExecutionError {
  if (cause instanceof ProviderError) {
    return createExecutionError(cause.message, "PROVIDER_ERROR", cause);
  }
  if (cause instanceof NoProviderAvailableError) {
    return createExecutionError(cause.message, "ROUTING_ERROR", cause);
  }
  if (cause instanceof Error) {
    return createExecutionError(cause.message, "EXECUTION_FAILED", cause);
  }
  return createExecutionError("Unknown execution failure.", "EXECUTION_FAILED", cause);
}
