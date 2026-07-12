import { describe, expect, it } from "vitest";
import {
  createExecutionNodeId,
  createGoal,
  Execution,
  ExecutionGraph,
  ExecutionNodeStatus,
  ExecutionStatus,
} from "@agentdock/shared-types";
import {
  createProviderId,
  type Provider,
  type ProviderExecuteRequest,
  type ProviderExecuteResult,
  type ProviderHealth,
  type ProviderId,
  type ProviderMetadata,
  ProviderUnavailableError,
} from "@agentdock/provider-abstraction";
import {
  NoProviderAvailableError,
  type Router,
  type RoutingRequest,
} from "@agentdock/kernel-ai-router";
import { Executor } from "./executor.js";
import { InvalidExecutionStateError } from "./errors.js";

const CONVERSATION_INTENT = {
  category: "conversation" as const,
  confidence: 0.9,
  reasoning: "test",
};

function routedExecution(): Execution {
  const graph = ExecutionGraph.create([
    {
      id: createExecutionNodeId(),
      objective: "Hello",
      capability: "text-generation",
      dependencies: [],
      status: ExecutionNodeStatus.Pending,
    },
  ]);

  return Execution.create(createGoal("Hello"))
    .startAnalyzing()
    .completeAnalysis(CONVERSATION_INTENT)
    .completePlanning(["text-generation"], graph);
}

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
    private readonly result: ProviderExecuteResult = { output: "Hi!", model: "stub-model" },
    private readonly failure?: Error,
  ) {}

  async checkHealth(): Promise<ProviderHealth> {
    return { healthy: true };
  }

  async listModels(): Promise<readonly string[]> {
    return ["stub-model"];
  }

  async execute(_request: ProviderExecuteRequest): Promise<ProviderExecuteResult> {
    if (this.failure) {
      throw this.failure;
    }
    return this.result;
  }
}

class StubRouter implements Router {
  constructor(private readonly provider: Provider | Error) {}

  async selectProvider(_request: RoutingRequest): Promise<Provider> {
    if (this.provider instanceof Error) {
      throw this.provider;
    }
    return this.provider;
  }

  async selectProviderWithDiagnostics(request: RoutingRequest) {
    const diagnostics = {
      capability: request.capability,
      scores: [],
      reason: this.provider instanceof Error ? this.provider.message : "stub selection",
      selectionDurationMs: 0,
    };
    if (this.provider instanceof Error) {
      return { diagnostics };
    }
    return {
      provider: this.provider,
      diagnostics: { ...diagnostics, selectedProviderId: this.provider.id },
    };
  }
}

describe("Executor.execute", () => {
  it("completes the Execution with the provider's output, provider id, model, and a duration", async () => {
    const provider = new StubProvider({ output: "Hi there!", model: "stub-model" });
    const executor = new Executor(new StubRouter(provider));

    const result = await executor.execute(routedExecution());

    expect(result.status).toBe(ExecutionStatus.Completed);
    expect(result.result?.summary).toBe("Hi there!");
    expect(result.result?.provider).toBe("stub");
    expect(result.result?.model).toBe("stub-model");
    expect(result.result?.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("transitions through Executing on the way to Completed", async () => {
    const executor = new Executor(new StubRouter(new StubProvider()));
    const execution = routedExecution();
    expect(execution.status).toBe(ExecutionStatus.Routing);

    const result = await executor.execute(execution);

    expect(result.status).toBe(ExecutionStatus.Completed);
  });

  it("never mutates the input Execution", async () => {
    const executor = new Executor(new StubRouter(new StubProvider()));
    const execution = routedExecution();

    await executor.execute(execution);

    expect(execution.status).toBe(ExecutionStatus.Routing);
  });

  it("throws InvalidExecutionStateError if the Execution isn't in Routing status", async () => {
    const executor = new Executor(new StubRouter(new StubProvider()));
    const notRouted = Execution.create(createGoal("Hello"));

    await expect(executor.execute(notRouted)).rejects.toThrow(InvalidExecutionStateError);
  });

  it("fails the Execution with a ROUTING_ERROR code when no provider is available", async () => {
    const executor = new Executor(new StubRouter(new NoProviderAvailableError("text-generation")));

    const result = await executor.execute(routedExecution());

    expect(result.status).toBe(ExecutionStatus.Failed);
    expect(result.error?.code).toBe("ROUTING_ERROR");
  });

  it("fails the Execution with a PROVIDER_ERROR code when the provider throws a ProviderError", async () => {
    const failingProvider = new StubProvider(
      undefined,
      new ProviderUnavailableError(createProviderId("stub")),
    );
    const executor = new Executor(new StubRouter(failingProvider));

    const result = await executor.execute(routedExecution());

    expect(result.status).toBe(ExecutionStatus.Failed);
    expect(result.error?.code).toBe("PROVIDER_ERROR");
  });

  it("fails the Execution with a generic EXECUTION_FAILED code for an unexpected error", async () => {
    const failingProvider = new StubProvider(undefined, new Error("something unexpected"));
    const executor = new Executor(new StubRouter(failingProvider));

    const result = await executor.execute(routedExecution());

    expect(result.status).toBe(ExecutionStatus.Failed);
    expect(result.error?.code).toBe("EXECUTION_FAILED");
  });
});
