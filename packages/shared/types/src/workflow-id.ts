import { randomUUID } from "node:crypto";

/** A branded string, exactly like {@link ExecutionId} and {@link JobId}. */
export type WorkflowId = string & { readonly __brand: "WorkflowId" };

/** Generates a new, globally unique {@link WorkflowId}. */
export function createWorkflowId(): WorkflowId {
  return randomUUID() as WorkflowId;
}
