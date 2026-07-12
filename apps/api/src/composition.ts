import type { AppConfig } from "@agentdock/foundation-config";
import { InMemoryExecutionStore, InMemoryJobRepository } from "@agentdock/foundation-db";
import { ScoringRouter } from "@agentdock/kernel-ai-router";
import { JobService } from "@agentdock/kernel-job-service";
import {
  CompositeIntentAnalyzer,
  KeywordIntentAnalyzer,
  Planner,
  StaticCapabilityResolver,
} from "@agentdock/kernel-planner";
import { PromptBuilder } from "@agentdock/kernel-prompt-builder";
import { ProviderRegistry } from "@agentdock/kernel-provider-registry";
import { Executor } from "@agentdock/kernel-workflow-engine";
import { OllamaProvider } from "@agentdock/plugin-provider-ollama";
import type { AppDependencies } from "./dependencies.js";

/**
 * Builds every collaborator the API needs from validated configuration.
 * This is the application's composition root — the one place, per
 * ADR 0004, allowed to import a concrete plugin (`OllamaProvider`)
 * directly, since AgentDock has no dynamic Plugin System yet. Everything
 * downstream of this function (the Router, the Executor, the route
 * handlers) only ever sees the `Provider` interface.
 *
 * As of milestone 007, providers are registered into a
 * {@link ProviderRegistry} rather than handed to the Router as a fixed
 * array, and the Router is {@link ScoringRouter} rather than
 * `CapabilityMatchingRouter` — see docs/adr/0006-provider-registry.md for
 * why the scoring strategy is now the default while the simpler one is
 * kept, not removed.
 */
export function buildDependencies(config: AppConfig): AppDependencies {
  const ollamaProvider = new OllamaProvider({
    baseUrl: config.ollamaBaseUrl,
    model: config.ollamaModel,
    timeoutMs: config.requestTimeoutMs,
  });

  const providerRegistry = new ProviderRegistry();
  providerRegistry.register(ollamaProvider);

  const planner = new Planner({
    intentAnalyzer: new CompositeIntentAnalyzer([new KeywordIntentAnalyzer()]),
    capabilityResolver: new StaticCapabilityResolver(),
  });

  const router = new ScoringRouter(providerRegistry);
  const promptBuilder = new PromptBuilder();
  const executor = new Executor(router, undefined, promptBuilder);
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
    providerRegistry,
    ollamaProvider,
  };
}
