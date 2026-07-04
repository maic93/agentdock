/**
 * The failure recorded on an {@link Execution} that reaches the Failed
 * status. This is a plain data value, not a thrown exception: an Execution
 * that has failed is a normal, well-formed outcome (per the lifecycle
 * diagram, Failed is a first-class sibling of Completed, not an exceptional
 * case), so it's represented as data that a caller reads, not an exception
 * a caller must catch.
 */
export interface ExecutionError {
  readonly message: string;
  readonly code: string;
  /** The underlying cause, if any — kept as `unknown` since it may be a caught exception, not necessarily an Error. */
  readonly cause?: unknown;
}

/** Constructs an {@link ExecutionError}. */
export function createExecutionError(
  message: string,
  code: string,
  cause?: unknown,
): ExecutionError {
  return { message, code, cause };
}
