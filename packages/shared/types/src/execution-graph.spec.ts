import { describe, expect, it } from "vitest";
import {
  createExecutionNodeId,
  ExecutionGraph,
  type ExecutionNode,
  ExecutionNodeStatus,
} from "./execution-graph.js";
import { InvalidExecutionGraphError } from "./errors.js";

function node(overrides: Partial<ExecutionNode> = {}): ExecutionNode {
  return {
    id: createExecutionNodeId(),
    objective: "Say hello",
    capability: "text-generation",
    dependencies: [],
    status: ExecutionNodeStatus.Pending,
    ...overrides,
  };
}

describe("ExecutionGraph.create", () => {
  it("accepts a single node with no dependencies", () => {
    const single = node();
    const graph = ExecutionGraph.create([single]);
    expect(graph.size).toBe(1);
    expect(graph.getNode(single.id)).toEqual(single);
  });

  it("accepts a valid multi-node chain", () => {
    const first = node();
    const second = node({ dependencies: [first.id] });
    const graph = ExecutionGraph.create([first, second]);
    expect(graph.size).toBe(2);
    expect(graph.nodes.map((n) => n.id)).toEqual([first.id, second.id]);
  });

  it("preserves construction order in .nodes", () => {
    const first = node();
    const second = node();
    const graph = ExecutionGraph.create([second, first]);
    expect(graph.nodes.map((n) => n.id)).toEqual([second.id, first.id]);
  });

  it("rejects duplicate node ids", () => {
    const id = createExecutionNodeId();
    const first = node({ id });
    const duplicate = node({ id });
    expect(() => ExecutionGraph.create([first, duplicate])).toThrow(InvalidExecutionGraphError);
  });

  it("rejects a dependency on an unknown node", () => {
    const dangling = node({ dependencies: [createExecutionNodeId()] });
    expect(() => ExecutionGraph.create([dangling])).toThrow(InvalidExecutionGraphError);
  });

  it("rejects a direct self-dependency cycle", () => {
    const id = createExecutionNodeId();
    const selfReferencing = node({ id, dependencies: [id] });
    expect(() => ExecutionGraph.create([selfReferencing])).toThrow(InvalidExecutionGraphError);
  });

  it("rejects an indirect dependency cycle", () => {
    const idA = createExecutionNodeId();
    const idB = createExecutionNodeId();
    const a = node({ id: idA, dependencies: [idB] });
    const b = node({ id: idB, dependencies: [idA] });
    expect(() => ExecutionGraph.create([a, b])).toThrow(InvalidExecutionGraphError);
  });

  it("accepts an empty graph", () => {
    const graph = ExecutionGraph.create([]);
    expect(graph.size).toBe(0);
    expect(graph.nodes).toEqual([]);
  });
});

describe("ExecutionGraph#getNode", () => {
  it("returns undefined for an id not in the graph", () => {
    const graph = ExecutionGraph.create([node()]);
    expect(graph.getNode(createExecutionNodeId())).toBeUndefined();
  });
});
