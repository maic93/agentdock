import { InvalidExecutionTransitionError } from "./errors.js";

/**
 * The lifecycle stages an {@link Execution} passes through, from creation to
 * a terminal outcome:
 *
 *   Created -> Analyzing -> Planning -> Routing -> Executing -> Completed
 *                                                              -> Failed
 *
 * Failure can occur from any non-terminal stage (an analyzer can throw just
 * as easily as a running task can) — see {@link ALLOWED_TRANSITIONS} for the
 * exact, single source of truth on what's legal.
 *
 * This is an enum specifically so that no code elsewhere in the codebase
 * needs to write the string literal "planning" (or similar) — every status
 * comparison and every transition goes through this type and the functions
 * below.
 */
export enum ExecutionStatus {
  Created = "created",
  Analyzing = "analyzing",
  Planning = "planning",
  Routing = "routing",
  Executing = "executing",
  Completed = "completed",
  Failed = "failed",
}

/**
 * The single source of truth for legal lifecycle transitions. Every status
 * except the two terminal ones (Completed, Failed) can move forward to the
 * next stage, and every non-terminal stage can also move directly to
 * Failed — modeling the reality that a goal can fail at any point, not only
 * while actively executing.
 */
const ALLOWED_TRANSITIONS: Readonly<Record<ExecutionStatus, readonly ExecutionStatus[]>> = {
  [ExecutionStatus.Created]: [ExecutionStatus.Analyzing, ExecutionStatus.Failed],
  [ExecutionStatus.Analyzing]: [ExecutionStatus.Planning, ExecutionStatus.Failed],
  [ExecutionStatus.Planning]: [ExecutionStatus.Routing, ExecutionStatus.Failed],
  [ExecutionStatus.Routing]: [ExecutionStatus.Executing, ExecutionStatus.Failed],
  [ExecutionStatus.Executing]: [ExecutionStatus.Completed, ExecutionStatus.Failed],
  [ExecutionStatus.Completed]: [],
  [ExecutionStatus.Failed]: [],
};

const TERMINAL_STATUSES: ReadonlySet<ExecutionStatus> = new Set([
  ExecutionStatus.Completed,
  ExecutionStatus.Failed,
]);

/** Whether `status` is a terminal lifecycle stage (no further transitions are legal). */
export function isTerminalStatus(status: ExecutionStatus): boolean {
  return TERMINAL_STATUSES.has(status);
}

/** Whether transitioning from `from` to `to` is legal per the lifecycle model. */
export function canTransition(from: ExecutionStatus, to: ExecutionStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

/** Throws {@link InvalidExecutionTransitionError} if the transition is not legal. */
export function assertTransition(from: ExecutionStatus, to: ExecutionStatus): void {
  if (!canTransition(from, to)) {
    throw new InvalidExecutionTransitionError(from, to);
  }
}
