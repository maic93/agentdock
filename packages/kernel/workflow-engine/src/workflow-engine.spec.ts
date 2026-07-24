import { describe, expect, it } from "vitest";
import { InMemoryExecutionStore } from "@agentdock/foundation-db";
import { CapabilityMatchingRouter } from "@agentdock/kernel-ai-router";
import { ProviderRegistry } from "@agentdock/kernel-provider-registry";
import {
  CompositeIntentAnalyzer,
  KeywordIntentAnalyzer,
  Planner,
  StaticCapabilityResolver,
} from "@agentdock/kernel-planner";
import {
  createProviderId,
  type Provider,
  type ProviderExecuteRequest,
  type ProviderExecuteResult,
  type ProviderHealth,
  type ProviderId,
  type ProviderMetadata,
} from "@agentdock/provider-abstraction";
import {
  createJobId,
  createWorkflowNodeId,
  ExecutionStatus,
  WorkflowNodeStatus,
  WorkflowPlan,
} from "@agentdock/shared-types";
import { Executor } from "./executor.js";
import { WorkflowEngine } from "./workflow-engine.js";

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
    private readonly behavior: (request: ProviderExecuteRequest) => ProviderExecuteResult = () => ({
      output: "ok",
      model: "stub-model",
    }),
  ) {}

  async checkHealth(): Promise<ProviderHealth> {
    return { healthy: true };
  }

  async listModels(): Promise<readonly string[]> {
    return ["stub-model"];
  }

  async execute(request: ProviderExecuteRequest): Promise<ProviderExecuteResult> {
    return this.behavior(request);
  }
}

function buildEngine(behavior?: (request: ProviderExecuteRequest) => ProviderExecuteResult) {
  const registry = new ProviderRegistry();
  registry.register(new StubProvider(behavior));
  const router = new CapabilityMatchingRouter(registry);
  const planner = new Planner({
    intentAnalyzer: new CompositeIntentAnalyzer([new KeywordIntentAnalyzer()]),
    capabilityResolver: new StaticCapabilityResolver(),
  });
  const executor = new Executor(router);
  const executionStore = new InMemoryExecutionStore();
  const engine = new WorkflowEngine({ planner, executor, executionStore });
  return { engine, executionStore };
}

function node(overrides: { objective?: string } = {}) {
  return {
    id: createWorkflowNodeId(),
    objective: overrides.objective ?? "Hello",
    capability: "text-generation" as const,
    status: WorkflowNodeStatus.Pending,
  };
}

describe("WorkflowEngine.execute - single-node workflow", () => {
  it("completes the one node and reports success", async () => {
    const { engine } = buildEngine();
    const jobId = createJobId();
    const root = node();
    const plan = WorkflowPlan.create(jobId, [root], []);

    const outcome = await engine.execute(plan, jobId);

    expect(outcome.succeeded).toBe(true);
    expect(outcome.executionIds).toHaveLength(1);
    expect(outcome.plan.getNode(root.id)?.status).toBe(WorkflowNodeStatus.Completed);
    expect(outcome.plan.rootExecutionId).toBe(outcome.executionIds[0]);
  });

  it("persists the node's Execution in the store, owned by the Job", async () => {
    const { engine, executionStore } = buildEngine();
    const jobId = createJobId();
    const plan = WorkflowPlan.create(jobId, [node()], []);

    const outcome = await engine.execute(plan, jobId);

    const execution = await executionStore.get(outcome.executionIds[0]!);
    expect(execution.jobId).toBe(jobId);
    expect(execution.status).toBe(ExecutionStatus.Completed);
  });
});

describe("WorkflowEngine.execute - multi-node workflow (dependency ordering)", () => {
  it("completes a linear chain, executing nodes in dependency order", async () => {
    const executionOrder: string[] = [];
    const { engine } = buildEngine((request) => {
      executionOrder.push(request.objective);
      return { output: `handled: ${request.objective}`, model: "stub-model" };
    });
    const jobId = createJobId();
    const a = node({ objective: "Hello, this is step A" });
    const b = node({ objective: "Hello, this is step B" });
    const plan = WorkflowPlan.create(jobId, [a, b], [{ from: a.id, to: b.id }]);

    const outcome = await engine.execute(plan, jobId);

    expect(outcome.succeeded).toBe(true);
    expect(outcome.plan.getNode(a.id)?.status).toBe(WorkflowNodeStatus.Completed);
    expect(outcome.plan.getNode(b.id)?.status).toBe(WorkflowNodeStatus.Completed);
    expect(executionOrder[0]).toContain("step A");
    expect(executionOrder[1]).toContain("step B");
  });

  it("completes a diamond graph, with both middle nodes reached (parallel-ready scheduling)", async () => {
    const { engine } = buildEngine();
    const jobId = createJobId();
    const a = node({ objective: "Hello from root" });
    const b = node({ objective: "Hello from left" });
    const c = node({ objective: "Hello from right" });
    const d = node({ objective: "Hello, join" });
    const plan = WorkflowPlan.create(
      jobId,
      [a, b, c, d],
      [
        { from: a.id, to: b.id },
        { from: a.id, to: c.id },
        { from: b.id, to: d.id },
        { from: c.id, to: d.id },
      ],
    );

    const outcome = await engine.execute(plan, jobId);

    expect(outcome.succeeded).toBe(true);
    for (const original of [a, b, c, d]) {
      expect(outcome.plan.getNode(original.id)?.status).toBe(WorkflowNodeStatus.Completed);
    }
    expect(outcome.executionIds).toHaveLength(4);
  });
});

describe("WorkflowEngine.execute - failure propagation", () => {
  it("marks a failing node Failed and every downstream node Skipped", async () => {
    const { engine } = buildEngine((request) => {
      if (request.objective.includes("Hello, this fails")) {
        throw new Error("provider exploded");
      }
      return { output: "ok", model: "stub-model" };
    });
    const jobId = createJobId();
    const a = node({ objective: "Hello, this fails" });
    const b = node({ objective: "Hello, never reached" });
    const c = node({ objective: "Hello, also never reached" });
    const plan = WorkflowPlan.create(
      jobId,
      [a, b, c],
      [
        { from: a.id, to: b.id },
        { from: b.id, to: c.id },
      ],
    );

    const outcome = await engine.execute(plan, jobId);

    expect(outcome.succeeded).toBe(false);
    expect(outcome.plan.getNode(a.id)?.status).toBe(WorkflowNodeStatus.Failed);
    expect(outcome.plan.getNode(b.id)?.status).toBe(WorkflowNodeStatus.Skipped);
    expect(outcome.plan.getNode(c.id)?.status).toBe(WorkflowNodeStatus.Skipped);
  });

  it("still completes an independent branch unaffected by a sibling branch's failure", async () => {
    const { engine } = buildEngine((request) => {
      if (request.objective.includes("Hello, this fails")) {
        throw new Error("provider exploded");
      }
      return { output: "ok", model: "stub-model" };
    });
    const jobId = createJobId();
    const root = node({ objective: "Hello from root" });
    const failingBranch = node({ objective: "Hello, this fails" });
    const healthyBranch = node({ objective: "Hello, this succeeds" });
    const plan = WorkflowPlan.create(
      jobId,
      [root, failingBranch, healthyBranch],
      [
        { from: root.id, to: failingBranch.id },
        { from: root.id, to: healthyBranch.id },
      ],
    );

    const outcome = await engine.execute(plan, jobId);

    expect(outcome.succeeded).toBe(false);
    expect(outcome.plan.getNode(failingBranch.id)?.status).toBe(WorkflowNodeStatus.Failed);
    expect(outcome.plan.getNode(healthyBranch.id)?.status).toBe(WorkflowNodeStatus.Completed);
  });

  it("does not execute any node in a workflow with only unplannable nodes", async () => {
    const { engine } = buildEngine();
    const jobId = createJobId();
    const unplannable = node({ objective: "Reticulate the splines" });
    const plan = WorkflowPlan.create(jobId, [unplannable], []);

    const outcome = await engine.execute(plan, jobId);

    expect(outcome.succeeded).toBe(false);
    expect(outcome.plan.getNode(unplannable.id)?.status).toBe(WorkflowNodeStatus.Failed);
  });
});

describe("WorkflowEngine.execute - empty workflow", () => {
  it("succeeds trivially with no nodes", async () => {
    const { engine } = buildEngine();
    const jobId = createJobId();
    const plan = WorkflowPlan.create(jobId, [], []);

    const outcome = await engine.execute(plan, jobId);

    expect(outcome.succeeded).toBe(true);
    expect(outcome.executionIds).toEqual([]);
  });
});
