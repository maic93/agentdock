import { describe, expect, it } from "vitest";
import {
  createJobId,
  createWorkflowNodeId,
  WorkflowNodeStatus,
  WorkflowPlan,
} from "@agentdock/shared-types";
import { findBlockedNodes, findReadyNodes } from "./scheduler.js";

const JOB_ID = createJobId();

function node(
  overrides: { id?: ReturnType<typeof createWorkflowNodeId>; status?: WorkflowNodeStatus } = {},
) {
  return {
    id: overrides.id ?? createWorkflowNodeId(),
    objective: "do work",
    capability: "text-generation" as const,
    status: overrides.status ?? WorkflowNodeStatus.Pending,
  };
}

describe("findReadyNodes", () => {
  it("returns a root node (no incoming edges) immediately", () => {
    const root = node();
    const plan = WorkflowPlan.create(JOB_ID, [root], []);
    expect(findReadyNodes(plan, new Set()).map((n) => n.id)).toEqual([root.id]);
  });

  it("does not return the dependent node when the dependency hasn't completed yet", () => {
    const a = node();
    const b = node();
    const plan = WorkflowPlan.create(JOB_ID, [a, b], [{ from: a.id, to: b.id }]);
    expect(findReadyNodes(plan, new Set()).map((n) => n.id)).not.toContain(b.id);
  });

  it("returns a node once its single dependency has completed", () => {
    const a = node({ status: WorkflowNodeStatus.Completed });
    const b = node();
    const plan = WorkflowPlan.create(JOB_ID, [a, b], [{ from: a.id, to: b.id }]);
    expect(findReadyNodes(plan, new Set([a.id])).map((n) => n.id)).toEqual([b.id]);
  });

  it("does not return the join node until BOTH dependencies have completed", () => {
    const a = node({ status: WorkflowNodeStatus.Completed });
    const b = node();
    const join = node();
    const plan = WorkflowPlan.create(
      JOB_ID,
      [a, b, join],
      [
        { from: a.id, to: join.id },
        { from: b.id, to: join.id },
      ],
    );

    expect(findReadyNodes(plan, new Set([a.id])).map((n) => n.id)).not.toContain(join.id);

    const bCompleted = node({ id: b.id, status: WorkflowNodeStatus.Completed });
    const planBothDone = WorkflowPlan.create(
      JOB_ID,
      [a, bCompleted, join],
      [
        { from: a.id, to: join.id },
        { from: b.id, to: join.id },
      ],
    );
    expect(findReadyNodes(planBothDone, new Set([a.id, b.id])).map((n) => n.id)).toEqual([join.id]);
  });

  it("returns multiple simultaneously-ready nodes in a diamond graph (parallel-ready scheduling)", () => {
    const a = node({ status: WorkflowNodeStatus.Completed });
    const b = node();
    const c = node();
    const d = node();
    const plan = WorkflowPlan.create(
      JOB_ID,
      [a, b, c, d],
      [
        { from: a.id, to: b.id },
        { from: a.id, to: c.id },
        { from: b.id, to: d.id },
        { from: c.id, to: d.id },
      ],
    );

    const ready = findReadyNodes(plan, new Set([a.id]));
    expect(ready.map((n) => n.id).sort()).toEqual([b.id, c.id].sort());
  });

  it("does not return a node that isn't Pending, even if its dependencies are complete", () => {
    const a = node({ status: WorkflowNodeStatus.Completed });
    const b = node({ status: WorkflowNodeStatus.Running });
    const plan = WorkflowPlan.create(JOB_ID, [a, b], [{ from: a.id, to: b.id }]);
    expect(findReadyNodes(plan, new Set([a.id]))).toEqual([]);
  });
});

describe("findBlockedNodes", () => {
  it("returns a node whose dependency is in the failed set", () => {
    const a = node({ status: WorkflowNodeStatus.Failed });
    const b = node();
    const plan = WorkflowPlan.create(JOB_ID, [a, b], [{ from: a.id, to: b.id }]);
    expect(findBlockedNodes(plan, new Set([a.id])).map((n) => n.id)).toEqual([b.id]);
  });

  it("does not return a node whose dependencies have not failed", () => {
    const a = node();
    const b = node();
    const plan = WorkflowPlan.create(JOB_ID, [a, b], [{ from: a.id, to: b.id }]);
    expect(findBlockedNodes(plan, new Set())).toEqual([]);
  });

  it("propagates one layer per call, not transitively in a single call", () => {
    const a = node({ status: WorkflowNodeStatus.Failed });
    const b = node();
    const c = node();
    const plan = WorkflowPlan.create(
      JOB_ID,
      [a, b, c],
      [
        { from: a.id, to: b.id },
        { from: b.id, to: c.id },
      ],
    );
    expect(findBlockedNodes(plan, new Set([a.id])).map((n) => n.id)).toEqual([b.id]);
  });
});
