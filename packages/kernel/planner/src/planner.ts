import {
  type Capability,
  createExecutionError,
  createExecutionNodeId,
  type Clock,
  type ExecutionError,
  ExecutionGraph,
  type ExecutionNode,
  ExecutionNodeStatus,
  type Execution,
} from "@agentdock/shared-types";
import type { CapabilityResolver } from "./capability-resolver.js";
import { UnplannableGoalError } from "./errors.js";
import type { IntentAnalyzer } from "./intent-analyzer.js";

export interface PlannerDependencies {
  readonly intentAnalyzer: IntentAnalyzer;
  readonly capabilityResolver: CapabilityResolver;
}

/**
 * Converts a Goal into a task graph, per the approved architecture's
 * description of this package's responsibility. Concretely: it drives an
 * Execution through Analyzing (via the Intent Analyzer) and Planning (via
 * the Capability Resolver and its own graph-building), handing back an
 * Execution left in the Routing status — ready for the (not yet
 * implemented) AI Router to pick up next.
 *
 * `plan` never throws. A failure at any step (an unplannable goal, or any
 * unexpected error) is caught and turned into a Failed Execution instead,
 * because Failed is a first-class, expected outcome of planning — not an
 * exceptional one a caller must wrap in try/catch to handle correctly.
 */
export class Planner {
  constructor(
    private readonly dependencies: PlannerDependencies,
    private readonly clock?: Clock,
  ) {}

  plan(execution: Execution): Execution {
    let current = execution;
    try {
      current = current.startAnalyzing(this.clock);

      const { intent } = this.dependencies.intentAnalyzer.analyze(current.goal);
      current = current.completeAnalysis(intent, this.clock);

      const capabilities = this.dependencies.capabilityResolver.resolve(intent);
      if (capabilities.length === 0) {
        throw new UnplannableGoalError(intent);
      }

      const graph = this.buildGraph(current.goal.text, capabilities);
      current = current.completePlanning(capabilities, graph, this.clock);

      return current;
    } catch (cause) {
      return current.fail(toExecutionError(cause), this.clock);
    }
  }

  /**
   * Builds a linear chain: one node per required capability, each depending
   * on the one before it. Today `capabilities` is always length 1 (the only
   * resolver in the codebase only ever returns `["text-generation"]`), so
   * this always produces a single-node graph — but the loop makes no
   * assumption about that, so a resolver that returns multiple capabilities
   * later produces a valid multi-node DAG with no change here.
   */
  private buildGraph(objective: string, capabilities: readonly Capability[]): ExecutionGraph {
    const nodes: ExecutionNode[] = [];
    let previousId: ExecutionNode["id"] | undefined;

    for (const capability of capabilities) {
      const id = createExecutionNodeId();
      nodes.push({
        id,
        objective,
        capability,
        dependencies: previousId ? [previousId] : [],
        status: ExecutionNodeStatus.Pending,
      });
      previousId = id;
    }

    return ExecutionGraph.create(nodes);
  }
}

function toExecutionError(cause: unknown): ExecutionError {
  if (cause instanceof UnplannableGoalError) {
    return createExecutionError(cause.message, "UNPLANNABLE_GOAL", cause);
  }
  if (cause instanceof Error) {
    return createExecutionError(cause.message, "PLANNING_FAILED", cause);
  }
  return createExecutionError("Unknown planning failure.", "PLANNING_FAILED", cause);
}
