import { InMemoryExecutionStore, InMemoryJobRepository } from "@agentdock/foundation-db";
import { CapabilityMatchingRouter } from "@agentdock/kernel-ai-router";
import { JobService } from "@agentdock/kernel-job-service";
import {
  CompositeIntentAnalyzer,
  KeywordIntentAnalyzer,
  Planner,
  StaticCapabilityResolver,
} from "@agentdock/kernel-planner";
import { Executor } from "@agentdock/kernel-workflow-engine";
import {
  createProviderId,
  type Provider,
  type ProviderExecuteRequest,
  type ProviderExecuteResult,
  type ProviderHealth,
  type ProviderId,
} from "@agentdock/provider-abstraction";
import type { Capability } from "@agentdock/shared-types";
import type { AppDependencies } from "./dependencies.js";

/**
 * A fake provider for tests: no network, deterministic output, and
 * configurable health/failure behavior. This is the "mock Ollama" referred
 * to by this milestone's testing requirement — the real `OllamaProvider`
 * is tested on its own (see plugins/provider-ollama) with a fake `fetch`,
 * so nothing here needs to re-verify Ollama's HTTP contract.
 *
 * NOTE: this file is excluded from the package's build (see tsconfig.json)
 * — it exists only to support tests, and shipping it in `dist` would be
 * dead weight in the published package.
 */
export class FakeProvider implements Provider {
  readonly id: ProviderId = createProviderId("fake-provider");
  readonly capabilities: readonly Capability[] = ["text-generation"];

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

/** Builds a full AppDependencies graph backed by a {@link FakeProvider} instead of a real Ollama instance. */
export function buildTestDependencies(provider: Provider = new FakeProvider()): AppDependencies {
  const planner = new Planner({
    intentAnalyzer: new CompositeIntentAnalyzer([new KeywordIntentAnalyzer()]),
    capabilityResolver: new StaticCapabilityResolver(),
  });
  const router = new CapabilityMatchingRouter([provider]);
  const executor = new Executor(router);
  const executionStore = new InMemoryExecutionStore();
  const jobRepository = new InMemoryJobRepository();
  const jobService = new JobService({ jobRepository, executionStore, planner, executor });

  return {
    executionStore,
    jobRepository,
    jobService,
    planner,
    router,
    executor,
    ollamaProvider: provider,
  };
}
