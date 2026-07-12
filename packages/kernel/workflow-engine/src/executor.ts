import {
  type Clock,
  createExecutionError,
  createExecutionResult,
  type Execution,
  type ExecutionError,
  ExecutionStatus,
  type RoutingDiagnostics,
} from "@agentdock/shared-types";
import { NoProviderAvailableError, type Router } from "@agentdock/kernel-ai-router";
import { PromptBuilder } from "@agentdock/kernel-prompt-builder";
import { ProviderError } from "@agentdock/provider-abstraction";
import { InvalidExecutionStateError } from "./errors.js";

/**
 * Runs an Execution's planned graph against real providers, via the
 * Router, and drives it to a terminal outcome.
 *
 * Today's graphs only ever contain one node (see the Planner), so the loop
 * below runs exactly once in practice — but it iterates `graph.nodes` in
 * order rather than special-casing "the one node," so a Planner that later
 * produces a real multi-node chain is executed correctly with no change
 * here. The combined result currently reports the *last* node's output;
 * how a genuinely branching, multi-output graph should be summarized is
 * intentionally left for whenever a Planner actually produces one, rather
 * than guessed at now.
 *
 * As of milestone 007, each node's raw objective text is no longer sent to
 * the provider directly — it's run through a {@link PromptBuilder} first,
 * using the node's capability and the Execution's already-resolved intent
 * to select a template. `promptBuilder` is a new, optional third
 * constructor parameter (defaulting to a builder with the standard
 * template set) specifically so every existing caller that only ever
 * passed `(router)` or `(router, clock)` keeps working unchanged.
 */
export class Executor {
  constructor(
    private readonly router: Router,
    private readonly clock?: Clock,
    private readonly promptBuilder: PromptBuilder = new PromptBuilder(),
  ) {}

  async execute(execution: Execution): Promise<Execution> {
    if (execution.status !== ExecutionStatus.Routing) {
      throw new InvalidExecutionStateError(execution.status);
    }

    const executing = execution.completeRouting(this.clock);
    const graph = executing.graph;

    if (!graph || graph.size === 0) {
      return executing.fail(
        createExecutionError("Execution has no plan to execute.", "NO_EXECUTABLE_GRAPH"),
        this.clock,
      );
    }

    const startedAt = Date.now();
    let lastDiagnostics: RoutingDiagnostics | undefined;
    try {
      let output = "";
      let model = "";
      let providerId = "";

      for (const node of graph.nodes) {
        const { provider, diagnostics: routingDiagnostics } =
          await this.router.selectProviderWithDiagnostics({ capability: node.capability });

        if (!provider) {
          lastDiagnostics = routingDiagnostics;
          throw new NoProviderAvailableError(node.capability);
        }

        const builtPrompt = this.promptBuilder.build({
          goal: executing.goal,
          // Invariant: a Routing-status Execution always has an intent —
          // set by the Planner during Analyzing, the stage before Routing
          // is reachable at all.
          intent: executing.intent!,
          capability: node.capability,
          execution: executing,
          providerMetadata: provider.metadata,
        });

        lastDiagnostics = {
          ...routingDiagnostics,
          promptTemplateId: builtPrompt.templateId,
          promptBuildDurationMs: builtPrompt.buildDurationMs,
        };

        const providerResult = await provider.execute({
          objective: builtPrompt.text,
          capability: node.capability,
        });
        output = providerResult.output;
        model = providerResult.model;
        providerId = provider.id;
      }

      const durationMs = Date.now() - startedAt;
      const result = createExecutionResult(output, {
        provider: providerId,
        model,
        durationMs,
        ...(lastDiagnostics ? { diagnostics: lastDiagnostics } : {}),
      });
      return executing.complete(result, this.clock);
    } catch (cause) {
      return executing.fail(toExecutionError(cause, lastDiagnostics), this.clock);
    }
  }
}

function toExecutionError(cause: unknown, diagnostics?: RoutingDiagnostics): ExecutionError {
  if (cause instanceof ProviderError) {
    return createExecutionError(cause.message, "PROVIDER_ERROR", cause, diagnostics);
  }
  if (cause instanceof NoProviderAvailableError) {
    return createExecutionError(cause.message, "ROUTING_ERROR", cause, diagnostics);
  }
  if (cause instanceof Error) {
    return createExecutionError(cause.message, "EXECUTION_FAILED", cause, diagnostics);
  }
  return createExecutionError("Unknown execution failure.", "EXECUTION_FAILED", cause, diagnostics);
}
