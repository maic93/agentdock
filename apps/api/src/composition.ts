import type { AppConfig } from "@agentdock/foundation-config";
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
import { PromptBuilder } from "@agentdock/kernel-prompt-builder";
import { ProviderRegistry } from "@agentdock/kernel-provider-registry";
import { Executor, WorkflowEngine } from "@agentdock/kernel-workflow-engine";
import { WorkflowPlanner } from "@agentdock/kernel-workflow-planner";
import { OllamaProvider } from "@agentdock/plugin-provider-ollama";
import type { AppDependencies } from "./dependencies.js";

/**
 * Builds every collaborator the API needs from validated configuration.
 * This is the application's composition root — the one place, per
 * ADR 0004, allowed to import a concrete plugin (OllamaProvider)
 * directly, since AgentDock has no dynamic Plugin System yet. Everything
 * downstream of this function (the Router, the Executor, the route
 * handlers) only ever sees the Provider interface.
 *
 * As of milestone 008, JobService is wired to a WorkflowPlanner and
 * WorkflowEngine (see docs/architecture/007-workflow-planning.md)
 * instead of directly to a Planner/Executor pair.
 */
export function buildDependencies(config: AppConfig): AppDependencies {
  const ollamaProvider = new OllamaProvider({
    baseUrl: config.ollamaBaseUrl,
    model: config.ollamaModel,
    timeoutMs: config.requestTimeoutMs,
  });

  const providerRegistry = new ProviderRegistry();
  providerRegistry.register(ollamaProvider);

  const intentAnalyzer = new CompositeIntentAnalyzer([new KeywordIntentAnalyzer()]);
  const capabilityResolver = new StaticCapabilityResolver();
  const planner = new Planner({ intentAnalyzer, capabilityResolver });
  const workflowPlanner = new WorkflowPlanner({ intentAnalyzer, capabilityResolver });

  const router = new ScoringRouter(providerRegistry);
  const promptBuilder = new PromptBuilder();
  const executor = new Executor(router, undefined, promptBuilder);

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
    ollamaProvider,
  };
}
