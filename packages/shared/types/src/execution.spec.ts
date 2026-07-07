import { describe, expect, it } from "vitest";
import { Execution } from "./execution.js";
import { createGoal } from "./goal.js";
import { ExecutionStatus } from "./execution-status.js";
import { InvalidExecutionTransitionError } from "./errors.js";
import type { Intent } from "./intent.js";
import { ExecutionGraph, ExecutionNodeStatus, createExecutionNodeId } from "./execution-graph.js";
import { createExecutionResult } from "./execution-result.js";
import { createExecutionError } from "./execution-error.js";
import type { JobId } from "./job-id.js";

const FIXED_TIME_1 = new Date("2026-01-01T00:00:00.000Z");
const FIXED_TIME_2 = new Date("2026-01-01T00:00:01.000Z");

const CONVERSATION_INTENT: Intent = {
  category: "conversation",
  confidence: 0.9,
  reasoning: "Matched conversational keyword(s): hello.",
};

function graphWithOneNode(): ExecutionGraph {
  return ExecutionGraph.create([
    {
      id: createExecutionNodeId(),
      objective: "Say hello",
      capability: "text-generation",
      dependencies: [],
      status: ExecutionNodeStatus.Pending,
    },
  ]);
}

describe("Execution.create", () => {
  it("starts in the Created status", () => {
    const execution = Execution.create(createGoal("Hello"));
    expect(execution.status).toBe(ExecutionStatus.Created);
  });

  it("assigns a unique id", () => {
    const goal = createGoal("Hello");
    const first = Execution.create(goal);
    const second = Execution.create(goal);
    expect(first.id).not.toBe(second.id);
  });

  it("stores the goal", () => {
    const goal = createGoal("Hello");
    const execution = Execution.create(goal);
    expect(execution.goal).toEqual(goal);
  });

  it("has no intent, capabilities, graph, result, or error yet", () => {
    const execution = Execution.create(createGoal("Hello"));
    expect(execution.intent).toBeUndefined();
    expect(execution.capabilities).toBeUndefined();
    expect(execution.graph).toBeUndefined();
    expect(execution.result).toBeUndefined();
    expect(execution.error).toBeUndefined();
  });

  it("sets createdAt and updatedAt to the same initial timestamp", () => {
    const execution = Execution.create(createGoal("Hello"), () => FIXED_TIME_1);
    expect(execution.metadata.createdAt).toEqual(FIXED_TIME_1);
    expect(execution.metadata.updatedAt).toEqual(FIXED_TIME_1);
  });
});

describe("Execution full lifecycle (happy path)", () => {
  it("walks Created -> Analyzing -> Planning -> Routing -> Executing -> Completed", () => {
    const goal = createGoal("Hello");
    let execution = Execution.create(goal, () => FIXED_TIME_1);
    expect(execution.status).toBe(ExecutionStatus.Created);

    execution = execution.startAnalyzing(() => FIXED_TIME_2);
    expect(execution.status).toBe(ExecutionStatus.Analyzing);

    execution = execution.completeAnalysis(CONVERSATION_INTENT, () => FIXED_TIME_2);
    expect(execution.status).toBe(ExecutionStatus.Planning);
    expect(execution.intent).toEqual(CONVERSATION_INTENT);

    const graph = graphWithOneNode();
    execution = execution.completePlanning(["text-generation"], graph, () => FIXED_TIME_2);
    expect(execution.status).toBe(ExecutionStatus.Routing);
    expect(execution.capabilities).toEqual(["text-generation"]);
    expect(execution.graph).toBe(graph);

    execution = execution.completeRouting(() => FIXED_TIME_2);
    expect(execution.status).toBe(ExecutionStatus.Executing);

    const result = createExecutionResult("Said hello back.");
    execution = execution.complete(result, () => FIXED_TIME_2);
    expect(execution.status).toBe(ExecutionStatus.Completed);
    expect(execution.result).toEqual(result);
  });

  it("never mutates the original instance at any step", () => {
    const original = Execution.create(createGoal("Hello"));
    const afterAnalyzing = original.startAnalyzing();
    expect(original.status).toBe(ExecutionStatus.Created);
    expect(afterAnalyzing.status).toBe(ExecutionStatus.Analyzing);
    expect(original).not.toBe(afterAnalyzing);
  });

  it("advances updatedAt but not createdAt on every transition", () => {
    let execution = Execution.create(createGoal("Hello"), () => FIXED_TIME_1);
    execution = execution.startAnalyzing(() => FIXED_TIME_2);
    expect(execution.metadata.createdAt).toEqual(FIXED_TIME_1);
    expect(execution.metadata.updatedAt).toEqual(FIXED_TIME_2);
  });
});

describe("Execution failure path", () => {
  it("can fail directly from Created", () => {
    const execution = Execution.create(createGoal("Hello"));
    const failed = execution.fail(createExecutionError("boom", "TEST_FAILURE"));
    expect(failed.status).toBe(ExecutionStatus.Failed);
    expect(failed.error?.message).toBe("boom");
  });

  it("can fail from Analyzing", () => {
    const execution = Execution.create(createGoal("Hello")).startAnalyzing();
    const failed = execution.fail(createExecutionError("boom", "TEST_FAILURE"));
    expect(failed.status).toBe(ExecutionStatus.Failed);
  });

  it("can fail from Planning", () => {
    const execution = Execution.create(createGoal("Hello"))
      .startAnalyzing()
      .completeAnalysis(CONVERSATION_INTENT);
    const failed = execution.fail(createExecutionError("boom", "TEST_FAILURE"));
    expect(failed.status).toBe(ExecutionStatus.Failed);
  });

  it("can fail from Routing", () => {
    const execution = Execution.create(createGoal("Hello"))
      .startAnalyzing()
      .completeAnalysis(CONVERSATION_INTENT)
      .completePlanning(["text-generation"], graphWithOneNode());
    const failed = execution.fail(createExecutionError("boom", "TEST_FAILURE"));
    expect(failed.status).toBe(ExecutionStatus.Failed);
  });

  it("can fail from Executing", () => {
    const execution = Execution.create(createGoal("Hello"))
      .startAnalyzing()
      .completeAnalysis(CONVERSATION_INTENT)
      .completePlanning(["text-generation"], graphWithOneNode())
      .completeRouting();
    const failed = execution.fail(createExecutionError("boom", "TEST_FAILURE"));
    expect(failed.status).toBe(ExecutionStatus.Failed);
  });
});

describe("Execution illegal transitions", () => {
  it("rejects skipping directly from Created to Executing", () => {
    const execution = Execution.create(createGoal("Hello"));
    expect(() => execution.completeRouting()).toThrow(InvalidExecutionTransitionError);
  });

  it("rejects any transition once Completed", () => {
    const execution = Execution.create(createGoal("Hello"))
      .startAnalyzing()
      .completeAnalysis(CONVERSATION_INTENT)
      .completePlanning(["text-generation"], graphWithOneNode())
      .completeRouting()
      .complete(createExecutionResult("done"));

    expect(() => execution.fail(createExecutionError("boom", "X"))).toThrow(
      InvalidExecutionTransitionError,
    );
    expect(() => execution.startAnalyzing()).toThrow(InvalidExecutionTransitionError);
  });

  it("rejects any transition once Failed", () => {
    const execution = Execution.create(createGoal("Hello")).fail(createExecutionError("boom", "X"));
    expect(() => execution.startAnalyzing()).toThrow(InvalidExecutionTransitionError);
    expect(() => execution.complete(createExecutionResult("done"))).toThrow(
      InvalidExecutionTransitionError,
    );
  });
});

describe("Execution.fromProps / toProps round-trip", () => {
  it("reconstructs an equivalent Execution from its props", () => {
    const original = Execution.create(createGoal("Hello"), () => FIXED_TIME_1);
    const rehydrated = Execution.fromProps(original.toProps());
    expect(rehydrated.id).toBe(original.id);
    expect(rehydrated.status).toBe(original.status);
    expect(rehydrated.goal).toEqual(original.goal);
    expect(rehydrated.metadata).toEqual(original.metadata);
  });
});

describe("Execution.createForJob", () => {
  it("creates an Execution owned by the given Job, starting in Created", () => {
    const jobId = "11111111-1111-4111-8111-111111111111" as JobId;
    const execution = Execution.createForJob(jobId, createGoal("Hello"));

    expect(execution.jobId).toBe(jobId);
    expect(execution.status).toBe(ExecutionStatus.Created);
  });

  it("assigns a unique Execution id independent of the Job id", () => {
    const jobId = "11111111-1111-4111-8111-111111111111" as JobId;
    const execution = Execution.createForJob(jobId, createGoal("Hello"));

    expect(execution.id).not.toBe(jobId);
  });
});

describe("Execution.create leaves jobId unset", () => {
  it("has no jobId when created via the original factory", () => {
    const execution = Execution.create(createGoal("Hello"));
    expect(execution.jobId).toBeUndefined();
  });
});
