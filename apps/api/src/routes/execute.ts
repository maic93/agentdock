import { createGoal, Execution, ExecutionStatus } from "@agentdock/shared-types";
import type { AppDependencies } from "../dependencies.js";
import { categorizeErrorCode, errorBody, statusCodeForCategory } from "../error-mapping.js";
import type { RouteResult } from "../route-result.js";

/**
 * Handles `POST /execute`: creates an Execution for the given goal, runs it
 * through the Planner and then the Executor, persisting the Execution
 * after every stage so `GET /executions/:id` reflects real-time progress
 * even if a client asks about it before this handler returns. Returns a
 * structured error response (see error-mapping.ts) if planning or
 * execution fails, rather than throwing.
 */
export async function handleExecute(deps: AppDependencies, rawBody: unknown): Promise<RouteResult> {
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

  let execution: Execution;
  try {
    execution = Execution.create(createGoal(goalText));
  } catch (cause) {
    return {
      status: statusCodeForCategory("validation"),
      body: errorBody("validation", cause instanceof Error ? cause.message : "Invalid goal."),
    };
  }

  await deps.store.create(execution);

  const planned = deps.planner.plan(execution);
  await deps.store.update(planned);

  if (planned.status === ExecutionStatus.Failed) {
    return failureResult(planned);
  }

  const executed = await deps.executor.execute(planned);
  await deps.store.update(executed);

  if (executed.status === ExecutionStatus.Failed) {
    return failureResult(executed);
  }

  return {
    status: 200,
    body: {
      executionId: executed.id,
      status: "completed",
      response: executed.result?.summary,
      provider: executed.result?.provider,
      model: executed.result?.model,
      durationMs: executed.result?.durationMs,
    },
  };
}

function extractGoalText(rawBody: unknown): string | undefined {
  if (typeof rawBody !== "object" || rawBody === null) {
    return undefined;
  }
  const goal = (rawBody as Record<string, unknown>)["goal"];
  return typeof goal === "string" ? goal : undefined;
}

function failureResult(execution: Execution): RouteResult {
  const category = categorizeErrorCode(execution.error?.code);
  return {
    status: statusCodeForCategory(category),
    body: {
      executionId: execution.id,
      status: "failed",
      ...errorBody(category, execution.error?.message ?? "Execution failed."),
    },
  };
}
