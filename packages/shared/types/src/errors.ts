import type { ExecutionStatus } from "./execution-status.js";
import type { JobStatus } from "./job-status.js";

/**
 * Thrown when constructing a {@link Goal} from invalid input (see goal.ts).
 */
export class InvalidGoalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidGoalError";
  }
}

/**
 * Thrown when an {@link Execution} is asked to transition to a status that
 * the lifecycle state model (see execution-status.ts) does not allow from
 * its current status. This is the single mechanism that keeps lifecycle
 * rules centralized instead of scattered as ad-hoc `if` checks wherever an
 * Execution is mutated.
 */
export class InvalidExecutionTransitionError extends Error {
  constructor(
    public readonly from: ExecutionStatus,
    public readonly to: ExecutionStatus,
  ) {
    super(`Cannot transition Execution from "${from}" to "${to}".`);
    this.name = "InvalidExecutionTransitionError";
  }
}

/**
 * Thrown when constructing an {@link ExecutionGraph} whose nodes violate a
 * structural invariant (duplicate id, dependency on an unknown node, or a
 * dependency cycle).
 */
export class InvalidExecutionGraphError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidExecutionGraphError";
  }
}

/**
 * Thrown when a {@link Job} is asked to transition to a status that the
 * Job lifecycle state model (see job-status.ts) does not allow from its
 * current status. Mirrors {@link InvalidExecutionTransitionError} exactly,
 * for the same reason: one centralized mechanism, not scattered checks.
 */
export class InvalidJobTransitionError extends Error {
  constructor(
    public readonly from: JobStatus,
    public readonly to: JobStatus,
  ) {
    super(`Cannot transition Job from "${from}" to "${to}".`);
    this.name = "InvalidJobTransitionError";
  }
}
