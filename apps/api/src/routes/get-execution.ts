import { ExecutionNotFoundError } from "@agentdock/foundation-db";
import type { ExecutionId } from "@agentdock/shared-types";
import type { AppDependencies } from "../dependencies.js";
import { errorBody, statusCodeForCategory } from "../error-mapping.js";
import type { RouteResult } from "../route-result.js";
import { serializeExecution } from "../serialization.js";

/**
 * Handles `GET /executions/:id`. The raw path segment is cast to
 * {@link ExecutionId} deliberately, at this one boundary — it's exactly
 * the kind of external-input-to-branded-type conversion the branding
 * exists for, not a bypass of it.
 */
export async function handleGetExecution(
  deps: AppDependencies,
  rawId: string,
): Promise<RouteResult> {
  try {
    const execution = await deps.executionStore.get(rawId as ExecutionId);
    return { status: 200, body: serializeExecution(execution) };
  } catch (cause) {
    if (cause instanceof ExecutionNotFoundError) {
      return {
        status: statusCodeForCategory("not_found"),
        body: errorBody("not_found", cause.message),
      };
    }
    throw cause;
  }
}
