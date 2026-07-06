import type { ExecutionResult } from "./execution-result.js";

/**
 * The outcome recorded on a {@link Job} that reaches the Completed status.
 *
 * Unlike {@link JobGoal}/{@link JobMetadata}/{@link JobError}, this is
 * deliberately its OWN type rather than an alias for {@link
 * ExecutionResult} — those three concepts (a goal, a timestamp, an error)
 * mean exactly the same thing whether they're attached to a Job or an
 * Execution, forever. A Job's result does not: per the goal-to-artifacts
 * pipeline (Job -> Planning -> one or more Executions -> Artifacts -> Job
 * Result, see docs/architecture/005-job-domain.md), a Job's result will
 * eventually need to synthesize output from *multiple* Executions and
 * their artifacts — something a single ExecutionResult can never
 * represent. `durationMs` is deliberately not carried here for the same
 * reason: a Job with several Executions has no single meaningful
 * duration in the way one Execution does.
 *
 * Today, with exactly one Execution per Job, `jobResultFromExecutionResult`
 * is a straightforward projection — not because the types are the same,
 * but because there's only one input to synthesize from yet.
 */
export interface JobResult {
  readonly summary: string;
  readonly provider?: string;
  readonly model?: string;
}

/**
 * Derives a {@link JobResult} from the single {@link ExecutionResult} that
 * satisfied a Job in this milestone. This function's job is expected to
 * grow real logic (combining several Executions' results) once a Job can
 * have more than one Execution — it is not a placeholder today, but it is
 * the seam where that future change belongs.
 */
export function jobResultFromExecutionResult(executionResult: ExecutionResult): JobResult {
  const result: JobResult = { summary: executionResult.summary };
  return {
    ...result,
    ...(executionResult.provider !== undefined ? { provider: executionResult.provider } : {}),
    ...(executionResult.model !== undefined ? { model: executionResult.model } : {}),
  };
}
