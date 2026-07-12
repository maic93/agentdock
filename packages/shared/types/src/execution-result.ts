import type { RoutingDiagnostics } from "./routing-diagnostics.js";

/**
 * The outcome recorded on an {@link Execution} that reaches the Completed
 * status. `provider`, `model`, and `durationMs` are optional and populated
 * by the Executor once it actually runs an ExecutionGraph against a real
 * provider — a caller that only has a summary (e.g. a future outcome not
 * produced by calling a provider at all) can still construct a valid
 * result without them.
 *
 * `diagnostics` was added in milestone 007: the immutable record of how
 * the Executor picked a provider (and, for the selected one, built its
 * prompt) — see routing-diagnostics.ts. Optional for the same reason as
 * the fields above: additive, so every existing caller from milestones
 * 004-006 that never populated it is still valid.
 */
export interface ExecutionResult {
  readonly summary: string;
  readonly provider?: string;
  readonly model?: string;
  readonly durationMs?: number;
  readonly diagnostics?: RoutingDiagnostics;
}

export interface CreateExecutionResultOptions {
  readonly provider?: string;
  readonly model?: string;
  readonly durationMs?: number;
  readonly diagnostics?: RoutingDiagnostics;
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
