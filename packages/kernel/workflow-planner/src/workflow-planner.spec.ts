import { describe, expect, it } from "vitest";
import {
  CompositeIntentAnalyzer,
  KeywordIntentAnalyzer,
  StaticCapabilityResolver,
} from "@agentdock/kernel-planner";
import { createGoal, Job } from "@agentdock/shared-types";
import { UnplannableWorkflowError } from "./errors.js";
import { WorkflowPlanner } from "./workflow-planner.js";

function buildPlanner(): WorkflowPlanner {
  return new WorkflowPlanner({
    intentAnalyzer: new CompositeIntentAnalyzer([new KeywordIntentAnalyzer()]),
    capabilityResolver: new StaticCapabilityResolver(),
  });
}

describe("WorkflowPlanner.plan", () => {
  it('produces exactly one node for a conversation goal ("Hello")', () => {
    const planner = buildPlanner();
    const job = Job.create(createGoal("Hello"));

    const plan = planner.plan(job);

    expect(plan.nodes).toHaveLength(1);
    expect(plan.nodes[0]?.capability).toBe("text-generation");
    expect(plan.nodes[0]?.objective).toBe("Hello");
    expect(plan.edges).toEqual([]);
  });

  it("records the owning jobId on the produced plan", () => {
    const planner = buildPlanner();
    const job = Job.create(createGoal("Hello"));

    const plan = planner.plan(job);

    expect(plan.jobId).toBe(job.id);
  });

  it("throws UnplannableWorkflowError when no capability satisfies the intent", () => {
    const planner = buildPlanner();
    const job = Job.create(createGoal("Reticulate the splines"));

    expect(() => planner.plan(job)).toThrow(UnplannableWorkflowError);
  });

  it("produces a plan whose single node starts Pending", () => {
    const planner = buildPlanner();
    const job = Job.create(createGoal("Hello"));

    const plan = planner.plan(job);

    expect(plan.nodes[0]?.status).toBe("pending");
  });

  it("produces a fresh workflowId on every call", () => {
    const planner = buildPlanner();
    const job = Job.create(createGoal("Hello"));

    const first = planner.plan(job);
    const second = planner.plan(job);

    expect(first.workflowId).not.toBe(second.workflowId);
  });
});
