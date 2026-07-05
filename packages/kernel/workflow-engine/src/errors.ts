import type { ExecutionStatus } from "@agentdock/shared-types";

/**
 * Thrown when {@link Executor.execute} is called with an Execution that
 * isn't in the `Routing` status — the Executor's contract is to pick up
 * exactly where the Planner (and, eventually, the AI Router) left off, not
 * to recover from a caller passing the wrong stage of Execution.
 */
export class InvalidExecutionStateError extends Error {
  constructor(public readonly status: ExecutionStatus) {
    super(`Executor requires an Execution in the "Routing" status, but received "${status}".`);
    this.name = "InvalidExecutionStateError";
  }
}
