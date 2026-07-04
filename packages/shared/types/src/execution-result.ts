/**
 * The outcome recorded on an {@link Execution} that reaches the Completed
 * status. Deliberately minimal today: nothing in this milestone actually
 * runs an ExecutionGraph (that's the Workflow Engine's job, not yet
 * implemented), so there are no per-node outputs to model yet. Expanding
 * this to include artifact references or per-node results is a future,
 * additive change once something actually produces them.
 */
export interface ExecutionResult {
  readonly summary: string;
}

/** Constructs an {@link ExecutionResult}, rejecting an empty summary. */
export function createExecutionResult(summary: string): ExecutionResult {
  const trimmed = summary.trim();
  if (trimmed.length === 0) {
    throw new Error("ExecutionResult summary must not be empty.");
  }
  return { summary: trimmed };
}
