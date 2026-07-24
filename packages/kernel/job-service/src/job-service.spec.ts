import { describe, expect, it } from "vitest";
import {
  InMemoryExecutionStore,
  InMemoryJobRepository,
  InMemoryWorkflowRepository,
} from "@agentdock/foundation-db";
import { CapabilityMatchingRouter } from "@agentdock/kernel-ai-router";
import { ProviderRegistry } from "@agentdock/kernel-provider-registry";
import {
  CompositeIntentAnalyzer,
  KeywordIntentAnalyzer,
  Planner,
  StaticCapabilityResolver,
} from "@agentdock/kernel-planner";
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
import { JobStatus } from "@agentdock/shared-types";
import { JobService, type JobServiceDependencies } from "./job-service.js";

class StubProvider implements Provider {
  readonly id: ProviderId = createProviderId("stub");
  readonly capabilities = ["text-generation" as const];
  readonly metadata: ProviderMetadata = {
    id: this.id,
    displayName: "Stub",
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
    private readonly result: ProviderExecuteResult = { output: "Hi there!", model: "stub-model" },
    private readonly healthy = true,
  ) {}

  async checkHealth(): Promise<ProviderHealth> {
    return { healthy: this.healthy };
  }

  async listModels(): Promise<readonly string[]> {
    return ["stub-model"];
  }

  async execute(_request: ProviderExecuteRequest): Promise<ProviderExecuteResult> {
    return this.result;
  }
}

function buildDependencies(provider: Provider = new StubProvider()): JobServiceDependencies {
  const intentAnalyzer = new CompositeIntentAnalyzer([new KeywordIntentAnalyzer()]);
  const capabilityResolver = new StaticCapabilityResolver();
  const planner = new Planner({ intentAnalyzer, capabilityResolver });
  const workflowPlanner = new WorkflowPlanner({ intentAnalyzer, capabilityResolver });

  const registry = new ProviderRegistry();
  registry.register(provider);
  const router = new CapabilityMatchingRouter(registry);
  const executor = new Executor(router);

  const executionStore = new InMemoryExecutionStore();
  const workflowEngine = new WorkflowEngine({ planner, executor, executionStore });

  return {
    jobRepository: new InMemoryJobRepository(),
    workflowRepository: new InMemoryWorkflowRepository(),
    executionStore,
    workflowPlanner,
    workflowEngine,
  };
}

describe("JobService.createJob", () => {
  it('completes a Job for "Hello", owning exactly one Execution', async () => {
    const deps = buildDependencies(new StubProvider({ output: "Hi there!", model: "stub-model" }));
    const service = new JobService(deps);

    const job = await service.createJob("Hello");

    expect(job.status).toBe(JobStatus.Completed);
    expect(job.result).toEqual({ summary: "Hi there!", provider: "stub", model: "stub-model" });
    expect(job.executionIds).toHaveLength(1);
  });

  it("persists the Job in the repository at every stage", async () => {
    const deps = buildDependencies();
    const service = new JobService(deps);

    const job = await service.createJob("Hello");

    const stored = await deps.jobRepository.get(job.id);
    expect(stored.status).toBe(JobStatus.Completed);
  });

  it("persists the owned Execution in the store", async () => {
    const deps = buildDependencies();
    const service = new JobService(deps);

    const job = await service.createJob("Hello");
    const executionId = job.executionIds[0];
    expect(executionId).toBeDefined();

    const execution = await deps.executionStore.get(executionId!);
    expect(execution.status).toBe("completed");
    expect(execution.jobId).toBe(job.id);
  });

  it("persists the WorkflowPlan and attaches its id to the Job", async () => {
    const deps = buildDependencies();
    const service = new JobService(deps);

    const job = await service.createJob("Hello");

    expect(job.workflowId).toBeDefined();
    const plan = await deps.workflowRepository.get(job.workflowId!);
    expect(plan.jobId).toBe(job.id);
    expect(plan.nodes).toHaveLength(1);
  });

  it("fails the Job with a planning error when the goal can't be classified", async () => {
    const deps = buildDependencies();
    const service = new JobService(deps);

    const job = await service.createJob("Reticulate the splines");

    expect(job.status).toBe(JobStatus.Failed);
    expect(job.error?.code).toBe("UNPLANNABLE_GOAL");
  });

  it("does not persist a WorkflowPlan when planning fails up front", async () => {
    const deps = buildDependencies();
    const service = new JobService(deps);

    await service.createJob("Reticulate the splines");

    expect(await deps.workflowRepository.list()).toEqual([]);
  });

  it("fails the Job with a routing error when no provider is healthy", async () => {
    const deps = buildDependencies(new StubProvider(undefined, false));
    const service = new JobService(deps);

    const job = await service.createJob("Hello");

    expect(job.status).toBe(JobStatus.Failed);
    expect(job.error?.code).toBe("ROUTING_ERROR");
  });

  it("rejects an empty goal without creating a Job", async () => {
    const deps = buildDependencies();
    const service = new JobService(deps);

    await expect(service.createJob("   ")).rejects.toThrow();
    expect(await deps.jobRepository.list()).toEqual([]);
  });

  it("records the Job as owning the Execution it created (Execution ownership)", async () => {
    const deps = buildDependencies();
    const service = new JobService(deps);

    const job = await service.createJob("Hello");
    const execution = await deps.executionStore.get(job.executionIds[0]!);

    expect(execution.jobId).toBe(job.id);
  });
});
