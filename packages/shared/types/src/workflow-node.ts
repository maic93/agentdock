import { randomUUID } from "node:crypto";
import type { Capability } from "./capability.js";
import type { ExecutionId } from "./execution-id.js";

/** Branded id for a {@link WorkflowNode}, distinct from every other id type in this package. */
export type WorkflowNodeId = string & { readonly __brand: "WorkflowNodeId" };

/** Generates a new, globally unique {@link WorkflowNodeId}. */
export function createWorkflowNodeId(): WorkflowNodeId {
  return randomUUID() as WorkflowNodeId;
}

/**
 * A WorkflowNode's lifecycle, distinct from {@link ExecutionStatus} (which
 * describes one Execution's internal progress) — a WorkflowNode describes
 * that Execution's place *within the workflow's scheduling*: has it been
 * reached yet, is it currently running, did it finish, or was it skipped
 * because an upstream dependency failed. `Skipped` has no equivalent in
 * ExecutionStatus because "an upstream dependency failed, so this never
 * even started" isn't a concept that applies to a single, standalone
 * Execution — it only makes sense once Executions are connected by a DAG.
 */
export enum WorkflowNodeStatus {
  Pending = "pending",
  Ready = "ready",
  Running = "running",
  Completed = "completed",
  Failed = "failed",
  Skipped = "skipped",
}

/**
 * One unit of work within a {@link WorkflowPlan} — conceptually, "one
 * Execution this workflow will create." `executionId` is unset until the
 * WorkflowEngine actually creates that Execution (see
 * packages/kernel/workflow-engine); everything else is decided at planning
 * time by {@link WorkflowPlanner}.
 *
 * Deliberately has no `dependencies` field of its own, unlike {@link
 * ExecutionNode} — a WorkflowPlan's dependency structure lives entirely in
 * its separate `edges` array (see workflow-plan.ts), which is what lets
 * WorkflowPlan run real graph algorithms (topological readiness, cycle
 * detection, reachability) over `edges` without needing to reconcile two
 * places dependency information could live.
 */
export interface WorkflowNode {
  readonly id: WorkflowNodeId;
  readonly objective: string;
  readonly capability: Capability;
  readonly status: WorkflowNodeStatus;
  readonly executionId?: ExecutionId;
}

/** A dependency edge: `from` must reach a terminal status before `to` can start. */
export interface WorkflowEdge {
  readonly from: WorkflowNodeId;
  readonly to: WorkflowNodeId;
}
