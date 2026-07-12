import type { Capability } from "@agentdock/shared-types";
import type { AppDependencies } from "../dependencies.js";
import type { RouteResult } from "../route-result.js";

const DEFAULT_CAPABILITY: Capability = "text-generation";

/**
 * Handles `GET /routing?capability=text-generation`: runs a live routing
 * decision against every currently-registered provider and returns its
 * diagnostics, without executing anything. This is a genuine preview, not
 * a cached "last decision" — selecting a provider has no side effects, so
 * it's safe to compute fresh on every call, and doing so means this
 * endpoint always reflects the registry's current state (a provider
 * registered or health-changed a moment ago shows up immediately).
 *
 * `capability` defaults to `"text-generation"`, the only capability
 * AgentDock currently resolves any goal to.
 */
export async function handleGetRouting(
  deps: AppDependencies,
  query: URLSearchParams,
): Promise<RouteResult> {
  const capability = (query.get("capability") ?? DEFAULT_CAPABILITY) as Capability;
  const { diagnostics } = await deps.router.selectProviderWithDiagnostics({ capability });
  return { status: 200, body: diagnostics };
}
