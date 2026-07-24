import { WorkflowNotFoundError } from "@agentdock/foundation-db";
import { type Job, JobStatus, type WorkflowId } from "@agentdock/shared-types";
import type { AppDependencies } from "../dependencies.js";
import { categorizeErrorCode, errorBody, statusCodeForCategory } from "../error-mapping.js";
import type { RouteResult } from "../route-result.js";
import { serializeWorkflow, serializeWorkflowGraph } from "../serialization.js";

/** Handles POST /workflows: creates a Job for the given goal and returns the WorkflowPlan. */
export async function handleCreateWorkflow(
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

  let job: Job;
  try {
    job = await deps.jobService.createJob(goalText);
  } catch (cause) {
    return {
      status: statusCodeForCategory("validation"),
      body: errorBody("validation", cause instanceof Error ? cause.message : "Invalid goal."),
    };
  }

  if (!job.workflowId) {
    const category = categorizeErrorCode(job.error?.code);
    return {
      status: statusCodeForCategory(category),
      body: errorBody(category, job.error?.message ?? "Workflow could not be planned."),
    };
  }

  const plan = await deps.workflowRepository.get(job.workflowId);
  const status =
    job.status === JobStatus.Completed
      ? 200
      : statusCodeForCategory(categorizeErrorCode(job.error?.code));
  return { status, body: serializeWorkflow(plan) };
}

/** Handles GET /workflows/:id. */
export async function handleGetWorkflow(
  deps: AppDependencies,
  rawId: string,
): Promise<RouteResult> {
  try {
    const plan = await deps.workflowRepository.get(rawId as WorkflowId);
    return { status: 200, body: serializeWorkflow(plan) };
  } catch (cause) {
    if (cause instanceof WorkflowNotFoundError) {
      return {
        status: statusCodeForCategory("not_found"),
        body: errorBody("not_found", cause.message),
      };
    }
    throw cause;
  }
}

/** Handles GET /workflows/:id/graph: nodes, edges, and timestamps only. */
export async function handleGetWorkflowGraph(
  deps: AppDependencies,
  rawId: string,
): Promise<RouteResult> {
  try {
    const plan = await deps.workflowRepository.get(rawId as WorkflowId);
    return { status: 200, body: serializeWorkflowGraph(plan) };
  } catch (cause) {
    if (cause instanceof WorkflowNotFoundError) {
      return {
        status: statusCodeForCategory("not_found"),
        body: errorBody("not_found", cause.message),
      };
    }
    throw cause;
  }
}

function extractGoalText(rawBody: unknown): string | undefined {
  if (typeof rawBody !== "object" || rawBody === null) {
    return undefined;
  }
  const goal = (rawBody as Record<string, unknown>)["goal"];
  return typeof goal === "string" ? goal : undefined;
}
