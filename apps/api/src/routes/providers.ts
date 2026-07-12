import { createProviderId } from "@agentdock/provider-abstraction";
import type { AppDependencies } from "../dependencies.js";
import { errorBody, statusCodeForCategory } from "../error-mapping.js";
import type { RouteResult } from "../route-result.js";

/** Handles `GET /providers`: every registered provider's metadata and current health. */
export async function handleListProviders(deps: AppDependencies): Promise<RouteResult> {
  const providers = deps.providerRegistry.listProviders();
  const body = await Promise.all(
    providers.map(async (provider) => ({
      metadata: provider.metadata,
      health: await provider.checkHealth(),
    })),
  );
  return { status: 200, body: { providers: body } };
}

/** Handles `GET /providers/:id`: one provider's metadata and current health. 404 if not registered. */
export async function handleGetProvider(
  deps: AppDependencies,
  rawId: string,
): Promise<RouteResult> {
  const id = createProviderId(rawId);
  const provider = deps.providerRegistry.getProvider(id);
  if (!provider) {
    return {
      status: statusCodeForCategory("not_found"),
      body: errorBody("not_found", `Provider "${rawId}" is not registered.`),
    };
  }
  return {
    status: 200,
    body: { metadata: provider.metadata, health: await provider.checkHealth() },
  };
}

/** Handles `GET /providers/health`: every registered provider's health only, without the full metadata payload. */
export async function handleProvidersHealth(deps: AppDependencies): Promise<RouteResult> {
  const providers = deps.providerRegistry.listProviders();
  const body = await Promise.all(
    providers.map(async (provider) => ({
      id: provider.id,
      health: await provider.checkHealth(),
    })),
  );
  return { status: 200, body: { providers: body } };
}
