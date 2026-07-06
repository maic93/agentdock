import type { ExecutionStore, JobRepository } from "@agentdock/foundation-db";
import type { Router } from "@agentdock/kernel-ai-router";
import type { JobService } from "@agentdock/kernel-job-service";
import type { Planner } from "@agentdock/kernel-planner";
import type { Executor } from "@agentdock/kernel-workflow-engine";
import type { Provider } from "@agentdock/provider-abstraction";

/**
 * Everything the HTTP layer needs to handle a request. Built once at
 * startup by {@link buildDependencies} (see composition.ts) and passed
 * into {@link createServer} — route handlers receive this instead of
 * constructing their own collaborators, which is what makes them testable
 * with fakes instead of a real Ollama instance.
 *
 * `executionStore` and `jobRepository` are exposed directly (not only
 * reachable through `jobService`) because the read-only routes — `GET
 * /executions/:id`, `GET /jobs/:id`, `GET /jobs/:id/executions` — need to
 * fetch already-persisted records without going through JobService, which
 * only knows how to create and run a Job, not look one up.
 */
export interface AppDependencies {
  readonly executionStore: ExecutionStore;
  readonly jobRepository: JobRepository;
  readonly jobService: JobService;
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
