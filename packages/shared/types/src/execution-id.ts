import { randomUUID } from "node:crypto";

/**
 * A branded string so that a plain `string` can't be passed where an
 * ExecutionId is expected without going through {@link createExecutionId}
 * or an explicit cast at a trust boundary (e.g. deserializing from
 * persistence). This costs nothing at runtime — it's a type-level branding
 * trick — but catches an entire class of "passed the wrong string" bugs at
 * compile time once more identifiers (ExecutionNodeId, etc.) exist.
 */
export type ExecutionId = string & { readonly __brand: "ExecutionId" };

/** Generates a new, globally unique {@link ExecutionId}. */
export function createExecutionId(): ExecutionId {
  return randomUUID() as ExecutionId;
}
