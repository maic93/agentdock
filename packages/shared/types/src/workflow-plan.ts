import type { ExecutionId } from "./execution-id.js";
import { type Clock, createInitialMetadata } from "./execution-metadata.js";
import { InvalidWorkflowPlanError } from "./errors.js";
import type { JobId } from "./job-id.js";
import { createWorkflowId, type WorkflowId } from "./workflow-id.js";
import type { WorkflowMetadata } from "./workflow-metadata.js";
import type { WorkflowEdge, WorkflowNode, WorkflowNodeId } from "./workflow-node.js";

export interface WorkflowPlanProps {
  readonly workflowId: WorkflowId;
  readonly jobId: JobId;
  readonly rootExecutionId?: ExecutionId;
  readonly nodes: readonly WorkflowNode[];
  readonly edges: readonly WorkflowEdge[];
  readonly metadata: WorkflowMetadata;
}

/**
 * An immutable, structurally-validated DAG connecting one or more
 * Executions created to satisfy a Job. See
 * docs/architecture/007-workflow-planning.md for why Job, WorkflowPlan,
 * and Execution are three separate concepts rather than two or one.
 *
 * Validation happens once, at construction (mirroring ExecutionGraph's
 * design exactly). `withNode` — used by the WorkflowEngine to record
 * scheduling progress — does not re-run structural validation, because it
 * only ever patches a node's status/executionId, never adds, removes, or
 * rewires nodes or edges; the structural guarantees established at
 * `create` time are preserved by construction, not re-checked defensively
 * on every status update.
 */
export class WorkflowPlan {
  private readonly nodesById: ReadonlyMap<WorkflowNodeId, WorkflowNode>;
  private readonly nodeOrder: readonly WorkflowNodeId[];

  private constructor(private readonly props: WorkflowPlanProps) {
    this.nodeOrder = props.nodes.map((node) => node.id);
    this.nodesById = new Map(props.nodes.map((node) => [node.id, node]));
  }

  static create(
    jobId: JobId,
    nodes: readonly WorkflowNode[],
    edges: readonly WorkflowEdge[],
    clock?: Clock,
  ): WorkflowPlan {
    validate(nodes, edges);
    return new WorkflowPlan({
      workflowId: createWorkflowId(),
      jobId,
      nodes,
      edges,
      metadata: createInitialMetadata(clock),
    });
  }

  static fromProps(props: WorkflowPlanProps): WorkflowPlan {
    return new WorkflowPlan(props);
  }

  get workflowId(): WorkflowId {
    return this.props.workflowId;
  }

  get jobId(): JobId {
    return this.props.jobId;
  }

  get rootExecutionId(): ExecutionId | undefined {
    return this.props.rootExecutionId;
  }

  get nodes(): readonly WorkflowNode[] {
    return this.nodeOrder.map((id) => {
      const node = this.nodesById.get(id);
      if (!node) {
        throw new Error(`Internal invariant violated: node ${id} missing from plan.`);
      }
      return node;
    });
  }

  get edges(): readonly WorkflowEdge[] {
    return this.props.edges;
  }

  get metadata(): WorkflowMetadata {
    return this.props.metadata;
  }

  getNode(id: WorkflowNodeId): WorkflowNode | undefined {
    return this.nodesById.get(id);
  }

  incomingEdges(nodeId: WorkflowNodeId): readonly WorkflowEdge[] {
    return this.props.edges.filter((edge) => edge.to === nodeId);
  }

  outgoingEdges(nodeId: WorkflowNodeId): readonly WorkflowEdge[] {
    return this.props.edges.filter((edge) => edge.from === nodeId);
  }

  rootNodes(): readonly WorkflowNode[] {
    const nodesWithIncoming = new Set(this.props.edges.map((edge) => edge.to));
    return this.nodes.filter((node) => !nodesWithIncoming.has(node.id));
  }

  toProps(): WorkflowPlanProps {
    return this.props;
  }

  withNode(
    id: WorkflowNodeId,
    patch: Partial<Pick<WorkflowNode, "status" | "executionId">>,
  ): WorkflowPlan {
    const existing = this.nodesById.get(id);
    if (!existing) {
      throw new InvalidWorkflowPlanError(`Cannot update unknown node "${id}".`);
    }
    const updatedNode: WorkflowNode = { ...existing, ...patch };
    const updatedNodes = this.nodes.map((node) => (node.id === id ? updatedNode : node));

    const isRoot = this.rootNodes().some((node) => node.id === id);
    const rootExecutionId =
      isRoot && !this.props.rootExecutionId && updatedNode.executionId
        ? updatedNode.executionId
        : this.props.rootExecutionId;

    return new WorkflowPlan({
      ...this.props,
      nodes: updatedNodes,
      ...(rootExecutionId ? { rootExecutionId } : {}),
    });
  }
}

function validate(nodes: readonly WorkflowNode[], edges: readonly WorkflowEdge[]): void {
  const seenIds = new Set<WorkflowNodeId>();
  for (const node of nodes) {
    if (seenIds.has(node.id)) {
      throw new InvalidWorkflowPlanError(`Duplicate WorkflowNode id: "${node.id}".`);
    }
    seenIds.add(node.id);
  }

  for (const edge of edges) {
    if (!seenIds.has(edge.from)) {
      throw new InvalidWorkflowPlanError(`Edge references unknown node "${edge.from}".`);
    }
    if (!seenIds.has(edge.to)) {
      throw new InvalidWorkflowPlanError(`Edge references unknown node "${edge.to}".`);
    }
  }

  assertAcyclic(nodes, edges);
  assertAllReachable(nodes, edges);
}

function assertAcyclic(nodes: readonly WorkflowNode[], edges: readonly WorkflowEdge[]): void {
  const outgoing = new Map<WorkflowNodeId, WorkflowNodeId[]>();
  for (const node of nodes) {
    outgoing.set(node.id, []);
  }
  for (const edge of edges) {
    outgoing.get(edge.from)?.push(edge.to);
  }

  const visited = new Set<WorkflowNodeId>();
  const inStack = new Set<WorkflowNodeId>();

  const visit = (id: WorkflowNodeId): void => {
    if (inStack.has(id)) {
      throw new InvalidWorkflowPlanError(`Dependency cycle detected involving node "${id}".`);
    }
    if (visited.has(id)) {
      return;
    }
    inStack.add(id);
    for (const next of outgoing.get(id) ?? []) {
      visit(next);
    }
    inStack.delete(id);
    visited.add(id);
  };

  for (const node of nodes) {
    visit(node.id);
  }
}

function assertAllReachable(nodes: readonly WorkflowNode[], edges: readonly WorkflowEdge[]): void {
  if (nodes.length === 0) {
    return;
  }

  const nodesWithIncoming = new Set(edges.map((edge) => edge.to));
  const roots = nodes.filter((node) => !nodesWithIncoming.has(node.id));

  const outgoing = new Map<WorkflowNodeId, WorkflowNodeId[]>();
  for (const node of nodes) {
    outgoing.set(node.id, []);
  }
  for (const edge of edges) {
    outgoing.get(edge.from)?.push(edge.to);
  }

  const reachable = new Set<WorkflowNodeId>();
  const stack = roots.map((node) => node.id);
  while (stack.length > 0) {
    const current = stack.pop();
    if (current === undefined || reachable.has(current)) {
      continue;
    }
    reachable.add(current);
    for (const next of outgoing.get(current) ?? []) {
      stack.push(next);
    }
  }

  for (const node of nodes) {
    if (!reachable.has(node.id)) {
      throw new InvalidWorkflowPlanError(`Node "${node.id}" is unreachable from every root node.`);
    }
  }
}
