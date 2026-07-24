import { type WorkflowNode, WorkflowNodeStatus, type WorkflowPlan } from "@agentdock/shared-types";

/**
 * Every `Pending` node whose dependencies (per `plan.incomingEdges`) have
 * ALL reached `Completed` — vacuously true for a node with no incoming
 * edges (a root), so roots are ready on the first call.
 *
 * This is a pure function over `plan` and the `completed` set — no I/O, no
 * mutation — specifically so the DAG-scheduling logic itself (as opposed
 * to "and then go create/run an Execution for it") is unit-testable in
 * isolation.
 */
export function findReadyNodes(
  plan: WorkflowPlan,
  completed: ReadonlySet<string>,
): readonly WorkflowNode[] {
  return plan.nodes.filter(
    (node) =>
      node.status === WorkflowNodeStatus.Pending &&
      plan.incomingEdges(node.id).every((edge) => completed.has(edge.from)),
  );
}

/**
 * Every `Pending` node with at least one dependency in `failed` -- these
 * will never become ready, and are marked `Skipped` by the WorkflowEngine
 * (see workflow-engine.ts) rather than left `Pending` forever, which is
 * what makes "fail remaining nodes correctly if an upstream dependency
 * fails" true: skipped nodes are added to a growing failure set each
 * iteration, so failure propagates transitively through however many
 * downstream layers exist, one iteration per layer.
 */
export function findBlockedNodes(
  plan: WorkflowPlan,
  failed: ReadonlySet<string>,
): readonly WorkflowNode[] {
  return plan.nodes.filter(
    (node) =>
      node.status === WorkflowNodeStatus.Pending &&
      plan.incomingEdges(node.id).some((edge) => failed.has(edge.from)),
  );
}
