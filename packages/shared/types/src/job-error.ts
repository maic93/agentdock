import type { ExecutionError } from "./execution-error.js";

/**
 * A Job's recorded failure. A plain alias for {@link ExecutionError} — the
 * shape (message, code, cause) is identical, and today a Job's error is
 * always derived directly from the Execution that failed (see
 * `packages/kernel/job-service`). Aliasing means no conversion function is
 * even needed for the common case: an `ExecutionError` already satisfies
 * `JobError`'s shape as-is.
 */
export type JobError = ExecutionError;
