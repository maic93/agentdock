import { randomUUID } from "node:crypto";
import type { Capability } from "./capability.js";
import { InvalidExecutionGraphError } from "./errors.js";

/** Branded id for an {@link ExecutionNode}, distinct from {@link ExecutionId}. */
export type ExecutionNodeId = string & { readonly __brand: "ExecutionNodeId" };

/** Generates a new, globally unique {@link ExecutionNodeId}. */
export function createExecutionNodeId(): ExecutionNodeId {
  return randomUUID() as ExecutionNodeId;
}

export enum ExecutionNodeStatus {
  Pending = "pending",
  Running = "running",
  Completed = "completed",
  Failed = "failed",
}

/**
 * A single unit of work within an {@link ExecutionGraph}. Today the Planner
 * only ever produces one node per capability, chained linearly by
 * `dependencies` — but the shape here does not assume that: a node can
 * depend on any number of other nodes, which is what lets the same type
 * support a real multi-branch DAG once a Planner exists that can produce
 * one.
 *
 * `provider`, `estimatedCostUsd`, and `estimatedDurationMs` are optional
 * because nothing populates them yet (there is no AI Router or provider
 * implementation in this milestone) — but they're part of the type now
 * because the Workflow Engine and AI Router will need to read and write
 * them without a breaking type change later.
 */
export interface ExecutionNode {
  readonly id: ExecutionNodeId;
  readonly objective: string;
  readonly capability: Capability;
  readonly dependencies: readonly ExecutionNodeId[];
  readonly status: ExecutionNodeStatus;
  readonly provider?: string;
  readonly estimatedCostUsd?: number;
  readonly estimatedDurationMs?: number;
}

/**
 * An immutable, structurally-validated directed graph of {@link
 * ExecutionNode}s. Validation happens once, at construction, so that every
 * `ExecutionGraph` instance that exists is guaranteed acyclic with only
 * internally-resolvable dependencies — consumers (the future Workflow
 * Engine, in particular) never need to re-check this themselves.
 */
export class ExecutionGraph {
  private readonly nodesById: ReadonlyMap<ExecutionNodeId, ExecutionNode>;
  private readonly order: readonly ExecutionNodeId[];

  private constructor(nodes: readonly ExecutionNode[]) {
    ExecutionGraph.validate(nodes);
    this.order = nodes.map((node) => node.id);
    this.nodesById = new Map(nodes.map((node) => [node.id, node]));
  }

  /** Constructs a validated ExecutionGraph, throwing {@link InvalidExecutionGraphError} on any structural violation. */
  static create(nodes: readonly ExecutionNode[]): ExecutionGraph {
    return new ExecutionGraph(nodes);
  }

  /** All nodes, in the order they were provided at construction. */
  get nodes(): readonly ExecutionNode[] {
    return this.order.map((id) => {
      const node = this.nodesById.get(id);
      // Invariant: every id in `order` has a corresponding entry in
      // `nodesById`, since both are derived from the same validated input.
      if (!node) {
        throw new Error(`Internal invariant violated: node ${id} missing from graph.`);
      }
      return node;
    });
  }

  get size(): number {
    return this.order.length;
  }

  getNode(id: ExecutionNodeId): ExecutionNode | undefined {
    return this.nodesById.get(id);
  }

  private static validate(nodes: readonly ExecutionNode[]): void {
    const seenIds = new Set<ExecutionNodeId>();
    for (const node of nodes) {
      if (seenIds.has(node.id)) {
        throw new InvalidExecutionGraphError(`Duplicate ExecutionNode id: "${node.id}".`);
      }
      seenIds.add(node.id);
    }

    for (const node of nodes) {
      for (const dependencyId of node.dependencies) {
        if (!seenIds.has(dependencyId)) {
          throw new InvalidExecutionGraphError(
            `ExecutionNode "${node.id}" depends on unknown node "${dependencyId}".`,
          );
        }
      }
    }

    ExecutionGraph.assertAcyclic(nodes);
  }

  private static assertAcyclic(nodes: readonly ExecutionNode[]): void {
    const byId = new Map(nodes.map((node) => [node.id, node]));
    const visited = new Set<ExecutionNodeId>();
    const inStack = new Set<ExecutionNodeId>();

    const visit = (id: ExecutionNodeId): void => {
      if (inStack.has(id)) {
        throw new InvalidExecutionGraphError(`Dependency cycle detected involving node "${id}".`);
      }
      if (visited.has(id)) {
        return;
      }
      inStack.add(id);
      const node = byId.get(id);
      if (node) {
        for (const dependencyId of node.dependencies) {
          visit(dependencyId);
        }
      }
      inStack.delete(id);
      visited.add(id);
    };

    for (const node of nodes) {
      visit(node.id);
    }
  }
}
