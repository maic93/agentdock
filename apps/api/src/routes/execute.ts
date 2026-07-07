import { type Job, JobStatus } from "@agentdock/shared-types";
import type { AppDependencies } from "../dependencies.js";
import { categorizeErrorCode, errorBody, statusCodeForCategory } from "../error-mapping.js";
import type { RouteResult } from "../route-result.js";

/**
 * Handles `POST /execute`.
 *
 * **Deprecated** — prefer `POST /jobs`. Kept working, unchanged in its
 * request and response shape, for backward compatibility (see
 * docs/architecture/005-job-domain.md). Internally this now delegates
 * entirely to {@link JobService}: it creates a Job, runs its one
 * Execution, and reshapes the resulting Job back into the exact response
 * shape this endpoint returned before the Job domain existed. Responses
 * carry a `Deprecation: true` header (RFC 8594) so a client inspecting
 * headers — not just documentation — can tell this endpoint is on its way
 * out.
 */
export async function handleExecute(deps: AppDependencies, rawBody: unknown): Promise<RouteResult> {
  const goalText = extractGoalText(rawBody);
  if (goalText === undefined) {
    return withDeprecationHeader({
      status: statusCodeForCategory("validation"),
      body: errorBody(
        "validation",
        'Request body must be JSON with a non-empty string "goal" field.',
      ),
    });
  }

  let job: Job;
  try {
    job = await deps.jobService.createJob(goalText);
  } catch (cause) {
    return withDeprecationHeader({
      status: statusCodeForCategory("validation"),
      body: errorBody("validation", cause instanceof Error ? cause.message : "Invalid goal."),
    });
  }

  const executionId = job.executionIds.at(-1);

  if (job.status === JobStatus.Failed) {
    const category = categorizeErrorCode(job.error?.code);
    return withDeprecationHeader({
      status: statusCodeForCategory(category),
      body: {
        executionId,
        status: "failed",
        ...errorBody(category, job.error?.message ?? "Execution failed."),
      },
    });
  }

  // durationMs is part of this legacy response shape but is deliberately
  // not part of JobResult (see job-result.ts) — a Job has no single
  // meaningful duration once it can own more than one Execution. Fetching
  // the actual Execution directly preserves the old field without
  // widening JobResult just for this one backward-compatibility case.
  const execution = executionId ? await deps.executionStore.get(executionId) : undefined;

  return withDeprecationHeader({
    status: 200,
    body: {
      executionId,
      status: "completed",
      response: job.result?.summary,
      provider: job.result?.provider,
      model: job.result?.model,
      durationMs: execution?.result?.durationMs,
    },
  });
}

function extractGoalText(rawBody: unknown): string | undefined {
  if (typeof rawBody !== "object" || rawBody === null) {
    return undefined;
  }
  const goal = (rawBody as Record<string, unknown>)["goal"];
  return typeof goal === "string" ? goal : undefined;
}

function withDeprecationHeader(result: RouteResult): RouteResult {
  return { ...result, headers: { ...result.headers, Deprecation: "true" } };
}
