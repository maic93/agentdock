import type { ExecutionStore } from "@agentdock/foundation-db";
import type { Router } from "@agentdock/kernel-ai-router";
import type { Planner } from "@agentdock/kernel-planner";
import type { Executor } from "@agentdock/kernel-workflow-engine";
import type { Provider } from "@agentdock/provider-abstraction";

/**
 * Everything the HTTP layer needs to handle a request. Built once at
 * startup by {@link buildDependencies} (see composition.ts) and passed
 * into {@link createServer} — route handlers receive this instead of
 * constructing their own collaborators, which is what makes them testable
 * with fakes instead of a real Ollama instance.
 */
export interface AppDependencies {
  readonly store: ExecutionStore;
  readonly planner: Planner;
  readonly router: Router;
  readonly executor: Executor;
  /**
   * Kept as a direct reference (in addition to being registered with
   * `router`) specifically so GET /health can report this provider's
   * status by name, per this milestone's required health response shape.
   */
  readonly ollamaProvider: Provider;
}
