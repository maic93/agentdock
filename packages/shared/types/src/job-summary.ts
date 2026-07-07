import type { ExecutionId } from "./execution-id.js";
import type { Job } from "./job.js";
import type { JobId } from "./job-id.js";
import type { JobStatus } from "./job-status.js";

/**
 * A slim, outward-facing projection of a {@link Job} — its id, status, most
 * recent Execution id, and result summary, without the full goal,
 * timestamps, or error detail the complete `Job` carries. This exists
 * because it's exactly the shape both `POST /jobs` and the
 * backward-compatible `POST /execute` need to return (see apps/api) — it's
 * a real response DTO with real call sites, not a speculative read model
 * with nothing using it.
 */
export interface JobSummary {
  readonly jobId: JobId;
  readonly status: JobStatus;
  /** The most recently created Execution for this Job, if any. */
  readonly executionId?: ExecutionId;
  readonly response?: string;
}

/** Builds a {@link JobSummary} from a {@link Job}. */
export function summarizeJob(job: Job): JobSummary {
  const latestExecutionId = job.executionIds.at(-1);
  return {
    jobId: job.id,
    status: job.status,
    ...(latestExecutionId !== undefined ? { executionId: latestExecutionId } : {}),
    ...(job.result?.summary !== undefined ? { response: job.result.summary } : {}),
  };
}
