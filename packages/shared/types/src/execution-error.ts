import type { RoutingDiagnostics } from "./routing-diagnostics.js";

/**
 * The failure recorded on an {@link Execution} that reaches the Failed
 * status. This is a plain data value, not a thrown exception: an Execution
 * that has failed is a normal, well-formed outcome (per the lifecycle
 * diagram, Failed is a first-class sibling of Completed, not an exceptional
 * case), so it's represented as data that a caller reads, not an exception
 * a caller must catch.
 *
 * `diagnostics` was added in milestone 007, for the same reason it was
 * added to {@link ExecutionResult}: a routing or provider failure is
 * exactly when "why did AgentDock pick — or fail to pick — a provider"
 * matters most, so a Failed Execution should be able to carry that record
 * just as much as a Completed one.
 */
export interface ExecutionError {
  readonly message: string;
  readonly code: string;
  /** The underlying cause, if any — kept as `unknown` since it may be a caught exception, not necessarily an Error. */
  readonly cause?: unknown;
  readonly diagnostics?: RoutingDiagnostics;
}

/**
 * Constructs an {@link ExecutionError}. `diagnostics` is a new, optional
 * fourth parameter (additive — every existing 3-argument call site is
 * still valid) rather than folded into an options object shared with
 * `cause`, specifically to avoid needing to distinguish "a cause that
 * happens to be object-shaped" from "an options object" at the call site.
 */
export function createExecutionError(
  message: string,
  code: string,
  cause?: unknown,
  diagnostics?: RoutingDiagnostics,
): ExecutionError {
  return { message, code, cause, ...(diagnostics !== undefined ? { diagnostics } : {}) };
}
