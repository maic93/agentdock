import {
  InMemoryExecutionStore,
  InMemoryJobRepository,
  InMemoryWorkflowRepository,
} from "@agentdock/foundation-db";
import { ScoringRouter } from "@agentdock/kernel-ai-router";
import { JobService } from "@agentdock/kernel-job-service";
import {
  CompositeIntentAnalyzer,
  KeywordIntentAnalyzer,
  Planner,
  StaticCapabilityResolver,
} from "@agentdock/kernel-planner";
import { ProviderRegistry } from "@agentdock/kernel-provider-registry";
import { Executor, WorkflowEngine } from "@agentdock/kernel-workflow-engine";
import { WorkflowPlanner } from "@agentdock/kernel-workflow-planner";
import {
  createProviderId,
  type Provider,
  type ProviderExecuteRequest,
  type ProviderExecuteResult,
  type ProviderHealth,
  type ProviderId,
  type ProviderMetadata,
} from "@agentdock/provider-abstraction";
import type { Capability } from "@agentdock/shared-types";
import type { AppDependencies } from "./dependencies.js";

export class FakeProvider implements Provider {
  readonly id: ProviderId = createProviderId("fake-provider");
  readonly capabilities: readonly Capability[] = ["text-generation"];
  readonly metadata: ProviderMetadata = {
    id: this.id,
    displayName: "Fake Provider",
    providerType: "local",
    version: "0.0.0",
    capabilities: this.capabilities,
    supportsStreaming: false,
    supportsVision: false,
    supportsTools: false,
    supportsJSON: false,
    supportsFunctionCalling: false,
    contextWindow: 4096,
    maxOutputTokens: 1024,
    priority: 100,
    costTier: "free",
    latencyTier: "medium",
  };

  constructor(
    private readonly response = "Hello! How can I help?",
    private readonly model = "fake-model",
    private readonly health: ProviderHealth = { healthy: true },
  ) {}

  async checkHealth(): Promise<ProviderHealth> {
    return this.health;
  }

  async listModels(): Promise<readonly string[]> {
    return [this.model];
  }

  async execute(_request: ProviderExecuteRequest): Promise<ProviderExecuteResult> {
    return { output: this.response, model: this.model };
  }
}

export function buildTestDependencies(provider: Provider = new FakeProvider()): AppDependencies {
  const providerRegistry = new ProviderRegistry();
  providerRegistry.register(provider);

  const intentAnalyzer = new CompositeIntentAnalyzer([new KeywordIntentAnalyzer()]);
  const capabilityResolver = new StaticCapabilityResolver();
  const planner = new Planner({ intentAnalyzer, capabilityResolver });
  const workflowPlanner = new WorkflowPlanner({ intentAnalyzer, capabilityResolver });

  const router = new ScoringRouter(providerRegistry);
  const executor = new Executor(router);

  const executionStore = new InMemoryExecutionStore();
  const jobRepository = new InMemoryJobRepository();
  const workflowRepository = new InMemoryWorkflowRepository();
  const workflowEngine = new WorkflowEngine({ planner, executor, executionStore });

  const jobService = new JobService({
    jobRepository,
    workflowRepository,
    executionStore,
    workflowPlanner,
    workflowEngine,
  });

  return {
    executionStore,
    jobRepository,
    workflowRepository,
    jobService,
    planner,
    router,
    executor,
    providerRegistry,
    ollamaProvider: provider,
  };
}
