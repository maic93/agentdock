import { describe, expect, it } from "vitest";
import { createGoal, Execution, ExecutionStatus } from "@agentdock/shared-types";
import { StaticCapabilityResolver } from "./capability-resolver.js";
import { KeywordIntentAnalyzer } from "./intent-analyzer.js";
import { Planner } from "./planner.js";

function createPlanner(): Planner {
  return new Planner({
    intentAnalyzer: new KeywordIntentAnalyzer(),
    capabilityResolver: new StaticCapabilityResolver(),
  });
}

describe("Planner.plan", () => {
  it('plans "Hello" into a single text-generation node, left in Routing status', () => {
    const planner = createPlanner();
    const execution = Execution.create(createGoal("Hello"));

    const planned = planner.plan(execution);

    expect(planned.status).toBe(ExecutionStatus.Routing);
    expect(planned.intent?.category).toBe("conversation");
    expect(planned.capabilities).toEqual(["text-generation"]);
    expect(planned.graph?.size).toBe(1);
    expect(planned.graph?.nodes[0]?.capability).toBe("text-generation");
    expect(planned.graph?.nodes[0]?.objective).toBe("Hello");
    expect(planned.graph?.nodes[0]?.dependencies).toEqual([]);
  });

  it("never mutates the input Execution", () => {
    const planner = createPlanner();
    const execution = Execution.create(createGoal("Hello"));

    planner.plan(execution);

    expect(execution.status).toBe(ExecutionStatus.Created);
  });

  it("fails the Execution when no capability can satisfy the intent", () => {
    const planner = createPlanner();
    const execution = Execution.create(createGoal("Reticulate the splines"));

    const planned = planner.plan(execution);

    expect(planned.status).toBe(ExecutionStatus.Failed);
    expect(planned.error?.code).toBe("UNPLANNABLE_GOAL");
  });

  it("preserves the Execution id through planning", () => {
    const planner = createPlanner();
    const execution = Execution.create(createGoal("Hello"));

    const planned = planner.plan(execution);

    expect(planned.id).toBe(execution.id);
  });
});
