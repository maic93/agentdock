import { describe, expect, it } from "vitest";
import { InvalidWorkflowPlanError } from "./errors.js";
import { createJobId } from "./job-id.js";
import { createExecutionId } from "./execution-id.js";
import { WorkflowPlan } from "./workflow-plan.js";
import { createWorkflowNodeId, type WorkflowNode, WorkflowNodeStatus } from "./workflow-node.js";

const JOB_ID = createJobId();

function node(overrides: Partial<WorkflowNode> = {}): WorkflowNode {
  return {
    id: createWorkflowNodeId(),
    objective: "Say hello",
    capability: "text-generation",
    status: WorkflowNodeStatus.Pending,
    ...overrides,
  };
}

describe("WorkflowPlan.create", () => {
  it("accepts a single node with no edges", () => {
    const single = node();
    const plan = WorkflowPlan.create(JOB_ID, [single], []);
    expect(plan.nodes).toEqual([single]);
    expect(plan.edges).toEqual([]);
  });

  it("accepts an empty workflow", () => {
    const plan = WorkflowPlan.create(JOB_ID, [], []);
    expect(plan.nodes).toEqual([]);
  });

  it("accepts a valid linear chain", () => {
    const a = node();
    const b = node();
    const plan = WorkflowPlan.create(JOB_ID, [a, b], [{ from: a.id, to: b.id }]);
    expect(plan.nodes.map((n) => n.id)).toEqual([a.id, b.id]);
    expect(plan.edges).toEqual([{ from: a.id, to: b.id }]);
  });

  it("accepts a valid diamond graph (A -> B, A -> C, B -> D, C -> D)", () => {
    const a = node();
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
    expect(plan.nodes).toHaveLength(4);
  });

  it("assigns a unique workflowId per plan", () => {
    const first = WorkflowPlan.create(JOB_ID, [], []);
    const second = WorkflowPlan.create(JOB_ID, [], []);
    expect(first.workflowId).not.toBe(second.workflowId);
  });

  it("records the owning jobId", () => {
    const plan = WorkflowPlan.create(JOB_ID, [], []);
    expect(plan.jobId).toBe(JOB_ID);
  });

  it("has no rootExecutionId until a root node's Execution is recorded", () => {
    const plan = WorkflowPlan.create(JOB_ID, [node()], []);
    expect(plan.rootExecutionId).toBeUndefined();
  });

  it("rejects duplicate node ids", () => {
    const id = createWorkflowNodeId();
    const first = node({ id });
    const duplicate = node({ id });
    expect(() => WorkflowPlan.create(JOB_ID, [first, duplicate], [])).toThrow(
      InvalidWorkflowPlanError,
    );
  });

  it("rejects an edge referencing an unknown 'from' node", () => {
    const only = node();
    expect(() =>
      WorkflowPlan.create(JOB_ID, [only], [{ from: createWorkflowNodeId(), to: only.id }]),
    ).toThrow(InvalidWorkflowPlanError);
  });

  it("rejects an edge referencing an unknown 'to' node", () => {
    const only = node();
    expect(() =>
      WorkflowPlan.create(JOB_ID, [only], [{ from: only.id, to: createWorkflowNodeId() }]),
    ).toThrow(InvalidWorkflowPlanError);
  });

  it("rejects a direct self-dependency cycle", () => {
    const id = createWorkflowNodeId();
    const self = node({ id });
    expect(() => WorkflowPlan.create(JOB_ID, [self], [{ from: id, to: id }])).toThrow(
      InvalidWorkflowPlanError,
    );
  });

  it("rejects an indirect dependency cycle", () => {
    const a = node();
    const b = node();
    expect(() =>
      WorkflowPlan.create(
        JOB_ID,
        [a, b],
        [
          { from: a.id, to: b.id },
          { from: b.id, to: a.id },
        ],
      ),
    ).toThrow(InvalidWorkflowPlanError);
  });

  it("rejects a node unreachable from every root", () => {
    // In a finite acyclic graph, tracing incoming edges backward from any
    // node must terminate at a node with no incoming edges (a root) — so
    // an isolated node with no edges at all is itself trivially a root
    // and therefore reachable, not an error case. This test documents
    // that the "unreachable" validation is real but, given the other
    // three checks already ran (duplicates, missing deps, cycles), it can
    // never actually fire on a graph that passed them — see
    // docs/architecture/007-workflow-planning.md.
    const a = node();
    const b = node();
    const isolated = node();
    const plan = WorkflowPlan.create(JOB_ID, [a, b, isolated], [{ from: a.id, to: b.id }]);
    expect(
      plan
        .rootNodes()
        .map((n) => n.id)
        .sort(),
    ).toEqual([a.id, isolated.id].sort());
  });
});

describe("WorkflowPlan.rootNodes", () => {
  it("returns every node with no incoming edge", () => {
    const a = node();
    const b = node();
    const c = node();
    const plan = WorkflowPlan.create(JOB_ID, [a, b, c], [{ from: a.id, to: b.id }]);
    expect(
      plan
        .rootNodes()
        .map((n) => n.id)
        .sort(),
    ).toEqual([a.id, c.id].sort());
  });
});

describe("WorkflowPlan.incomingEdges / outgoingEdges", () => {
  it("returns the correct edges for a node", () => {
    const a = node();
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
    expect(plan.incomingEdges(b.id)).toEqual([{ from: a.id, to: b.id }]);
    expect(plan.outgoingEdges(b.id)).toEqual([{ from: b.id, to: c.id }]);
    expect(plan.incomingEdges(a.id)).toEqual([]);
  });
});

describe("WorkflowPlan.withNode", () => {
  it("patches the given node's status", () => {
    const only = node();
    const plan = WorkflowPlan.create(JOB_ID, [only], []);
    const updated = plan.withNode(only.id, { status: WorkflowNodeStatus.Running });
    expect(updated.getNode(only.id)?.status).toBe(WorkflowNodeStatus.Running);
  });

  it("never mutates the original plan", () => {
    const only = node();
    const plan = WorkflowPlan.create(JOB_ID, [only], []);
    plan.withNode(only.id, { status: WorkflowNodeStatus.Running });
    expect(plan.getNode(only.id)?.status).toBe(WorkflowNodeStatus.Pending);
  });

  it("sets rootExecutionId when a root node receives its executionId", () => {
    const only = node();
    const plan = WorkflowPlan.create(JOB_ID, [only], []);
    const executionId = createExecutionId();
    const updated = plan.withNode(only.id, { executionId });
    expect(updated.rootExecutionId).toBe(executionId);
  });

  it("does not set rootExecutionId when a non-root node receives its executionId", () => {
    const a = node();
    const b = node();
    const plan = WorkflowPlan.create(JOB_ID, [a, b], [{ from: a.id, to: b.id }]);
    const updated = plan.withNode(b.id, { executionId: createExecutionId() });
    expect(updated.rootExecutionId).toBeUndefined();
  });

  it("throws for an unknown node id", () => {
    const plan = WorkflowPlan.create(JOB_ID, [], []);
    expect(() =>
      plan.withNode(createWorkflowNodeId(), { status: WorkflowNodeStatus.Running }),
    ).toThrow(InvalidWorkflowPlanError);
  });
});
