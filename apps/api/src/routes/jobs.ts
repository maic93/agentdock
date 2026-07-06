import { JobNotFoundError } from "@agentdock/foundation-db";
import {
  type ExecutionId,
  type Job,
  type JobId,
  JobStatus,
  summarizeJob,
} from "@agentdock/shared-types";
import type { AppDependencies } from "../dependencies.js";
import { categorizeErrorCode, errorBody, statusCodeForCategory } from "../error-mapping.js";
import type { RouteResult } from "../route-result.js";
import { serializeExecution, serializeJob } from "../serialization.js";

/**
 * Handles `POST /jobs`: creates a Job for the given goal, runs it to
 * completion via {@link JobService} (which creates and executes the
 * underlying Execution — see docs/architecture/005-job-domain.md), and
 * returns a {@link JobSummary}-shaped response. This is the successor to
 * `POST /execute`, which now delegates to the same `JobService` internally
 * (see routes/execute.ts) but keeps its own, older response shape for
 * backward compatibility.
 */
export async function handleCreateJob(
  deps: AppDependencies,
  rawBody: unknown,
): Promise<RouteResult> {
  const goalText = extractGoalText(rawBody);
  if (goalText === undefined) {
    return {
      status: statusCodeForCategory("validation"),
      body: errorBody(
        "validation",
        'Request body must be JSON with a non-empty string "goal" field.',
      ),
    };
  }

  try {
    const job = await deps.jobService.createJob(goalText);

    if (job.status === JobStatus.Failed) {
      const category = categorizeErrorCode(job.error?.code);
      return {
        status: statusCodeForCategory(category),
        body: { ...summarizeJob(job), ...errorBody(category, job.error?.message ?? "Job failed.") },
      };
    }

    return { status: 200, body: summarizeJob(job) };
  } catch (cause) {
    return {
      status: statusCodeForCategory("validation"),
      body: errorBody("validation", cause instanceof Error ? cause.message : "Invalid goal."),
    };
  }
}

/** Handles `GET /jobs/:id`. */
export async function handleGetJob(deps: AppDependencies, rawId: string): Promise<RouteResult> {
  try {
    const job = await deps.jobRepository.get(rawId as JobId);
    return { status: 200, body: serializeJob(job) };
  } catch (cause) {
    if (cause instanceof JobNotFoundError) {
      return {
        status: statusCodeForCategory("not_found"),
        body: errorBody("not_found", cause.message),
      };
    }
    throw cause;
  }
}

/**
 * Handles `GET /jobs/:id/executions`: returns every Execution the Job owns
 * (today, at most one — see `Job.executionIds`'s doc comment on why it's
 * an array already), each serialized exactly like `GET /executions/:id`
 * does, reusing `serializeExecution` rather than duplicating that shape.
 */
export async function handleGetJobExecutions(
  deps: AppDependencies,
  rawId: string,
): Promise<RouteResult> {
  let job: Job;
  try {
    job = await deps.jobRepository.get(rawId as JobId);
  } catch (cause) {
    if (cause instanceof JobNotFoundError) {
      return {
        status: statusCodeForCategory("not_found"),
        body: errorBody("not_found", cause.message),
      };
    }
    throw cause;
  }

  const executions = await Promise.all(
    job.executionIds.map((executionId: ExecutionId) => deps.executionStore.get(executionId)),
  );

  return { status: 200, body: { executions: executions.map(serializeExecution) } };
}

function extractGoalText(rawBody: unknown): string | undefined {
  if (typeof rawBody !== "object" || rawBody === null) {
    return undefined;
  }
  const goal = (rawBody as Record<string, unknown>)["goal"];
  return typeof goal === "string" ? goal : undefined;
}
