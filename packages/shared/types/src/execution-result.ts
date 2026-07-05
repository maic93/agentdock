/**
 * The outcome recorded on an {@link Execution} that reaches the Completed
 * status. `provider`, `model`, and `durationMs` are optional and populated
 * by the Executor once it actually runs an ExecutionGraph against a real
 * provider — a caller that only has a summary (e.g. a future outcome not
 * produced by calling a provider at all) can still construct a valid
 * result without them.
 */
export interface ExecutionResult {
  readonly summary: string;
  readonly provider?: string;
  readonly model?: string;
  readonly durationMs?: number;
}

export interface CreateExecutionResultOptions {
  readonly provider?: string;
  readonly model?: string;
  readonly durationMs?: number;
}

/** Constructs an {@link ExecutionResult}, rejecting an empty summary. */
export function createExecutionResult(
  summary: string,
  options: CreateExecutionResultOptions = {},
): ExecutionResult {
  const trimmed = summary.trim();
  if (trimmed.length === 0) {
    throw new Error("ExecutionResult summary must not be empty.");
  }
  return { summary: trimmed, ...options };
}
