import type { AppConfig } from "@agentdock/foundation-config";
import { InMemoryExecutionStore } from "@agentdock/foundation-db";
import { CapabilityMatchingRouter } from "@agentdock/kernel-ai-router";
import {
  CompositeIntentAnalyzer,
  KeywordIntentAnalyzer,
  Planner,
  StaticCapabilityResolver,
} from "@agentdock/kernel-planner";
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
 */
export function buildDependencies(config: AppConfig): AppDependencies {
  const ollamaProvider = new OllamaProvider({
    baseUrl: config.ollamaBaseUrl,
    model: config.ollamaModel,
    timeoutMs: config.requestTimeoutMs,
  });

  const planner = new Planner({
    intentAnalyzer: new CompositeIntentAnalyzer([new KeywordIntentAnalyzer()]),
    capabilityResolver: new StaticCapabilityResolver(),
  });

  const router = new CapabilityMatchingRouter([ollamaProvider]);
  const executor = new Executor(router);
  const store = new InMemoryExecutionStore();

  return { store, planner, router, executor, ollamaProvider };
}
