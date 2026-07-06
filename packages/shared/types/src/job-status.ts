import { InvalidJobTransitionError } from "./errors.js";

/**
 * The lifecycle stages a {@link Job} passes through:
 *
 *   Created -> Planning -> Executing -> Completed
 *                                      -> Failed
 *
 * This is deliberately coarser than {@link ExecutionStatus}: a Job doesn't
 * have separate Analyzing/Routing stages of its own — those are internal
 * to whichever Execution(s) it delegates to. A Job's "Planning" covers
 * everything up to and including its first Execution reaching the Routing
 * status; its "Executing" covers that Execution actually running. See
 * docs/architecture/005-job-domain.md for the full relationship between
 * Job and Execution lifecycles.
 *
 * As with ExecutionStatus, failure is legal from every non-terminal status
 * — a goal can fail during planning just as easily as during execution —
 * and this table is the single source of truth for which transitions are
 * legal, exactly mirroring execution-status.ts's design.
 */
export enum JobStatus {
  Created = "created",
  Planning = "planning",
  Executing = "executing",
  Completed = "completed",
  Failed = "failed",
}

const ALLOWED_TRANSITIONS: Readonly<Record<JobStatus, readonly JobStatus[]>> = {
  [JobStatus.Created]: [JobStatus.Planning, JobStatus.Failed],
  [JobStatus.Planning]: [JobStatus.Executing, JobStatus.Failed],
  [JobStatus.Executing]: [JobStatus.Completed, JobStatus.Failed],
  [JobStatus.Completed]: [],
  [JobStatus.Failed]: [],
};

const TERMINAL_STATUSES: ReadonlySet<JobStatus> = new Set([JobStatus.Completed, JobStatus.Failed]);

/** Whether `status` is a terminal lifecycle stage (no further transitions are legal). */
export function isTerminalJobStatus(status: JobStatus): boolean {
  return TERMINAL_STATUSES.has(status);
}

/** Whether transitioning from `from` to `to` is legal per the Job lifecycle model. */
export function canTransitionJob(from: JobStatus, to: JobStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

/** Throws {@link InvalidJobTransitionError} if the transition is not legal. */
export function assertJobTransition(from: JobStatus, to: JobStatus): void {
  if (!canTransitionJob(from, to)) {
    throw new InvalidJobTransitionError(from, to);
  }
}
