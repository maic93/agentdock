import type { AppDependencies } from "../dependencies.js";
import type { RouteResult } from "../route-result.js";

interface ComponentStatus {
  readonly status: "ok" | "error";
  readonly message?: string;
}

/**
 * Handles `GET /health`. The Planner, Router, and Executor have no external
 * dependency to fail against today (they're pure orchestration, delegating
 * to providers) so they're reported as "ok" unconditionally — there's
 * nothing to check yet. The Ollama provider's status is the one component
 * with something real to verify, via its own `checkHealth`. Overall status
 * is "healthy" only if every component is "ok".
 */
export async function handleHealth(deps: AppDependencies): Promise<RouteResult> {
  const ollamaHealth = await deps.ollamaProvider.checkHealth();

  const components: Record<string, ComponentStatus> = {
    api: { status: "ok" },
    planner: { status: "ok" },
    router: { status: "ok" },
    executor: { status: "ok" },
    ollamaProvider: ollamaHealth.healthy
      ? { status: "ok" }
      : ollamaHealth.message !== undefined
        ? { status: "error", message: ollamaHealth.message }
        : { status: "error" },
  };

  const overall = Object.values(components).every((component) => component.status === "ok")
    ? "healthy"
    : "unhealthy";

  return {
    status: 200,
    body: { status: overall, components },
  };
}
