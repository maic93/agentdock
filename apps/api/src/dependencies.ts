import type { ExecutionStore, JobRepository, WorkflowRepository } from "@agentdock/foundation-db";
import type { Router } from "@agentdock/kernel-ai-router";
import type { JobService } from "@agentdock/kernel-job-service";
import type { Planner } from "@agentdock/kernel-planner";
import type { ProviderRegistry } from "@agentdock/kernel-provider-registry";
import type { Executor } from "@agentdock/kernel-workflow-engine";
import type { Provider } from "@agentdock/provider-abstraction";

export interface AppDependencies {
  readonly executionStore: ExecutionStore;
  readonly jobRepository: JobRepository;
  readonly workflowRepository: WorkflowRepository;
  readonly jobService: JobService;
  readonly planner: Planner;
  readonly router: Router;
  readonly executor: Executor;
  readonly providerRegistry: ProviderRegistry;
  readonly ollamaProvider: Provider;
}
