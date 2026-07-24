import { describe, expect, it } from "vitest";
import { handleCreateWorkflow, handleGetWorkflow, handleGetWorkflowGraph } from "./workflows.js";
import { buildTestDependencies, FakeProvider } from "../test-support.js";

describe("handleCreateWorkflow", () => {
  it('creates a workflow for "Hello" with exactly one completed node', async () => {
    const deps = buildTestDependencies(new FakeProvider("Hi there!", "fake-model"));
    const result = await handleCreateWorkflow(deps, { goal: "Hello" });
    expect(result.status).toBe(200);
    const body = result.body as { nodes: Array<{ status: string }>; jobId: string };
    expect(body.nodes).toHaveLength(1);
    expect(body.nodes[0]?.status).toBe("completed");
    expect(body.jobId).toBeTruthy();
  });

  it("returns a 400 validation error when goal is missing", async () => {
    const deps = buildTestDependencies();
    const result = await handleCreateWorkflow(deps, {});
    expect(result.status).toBe(400);
  });

  it("returns a 422 planning error when the goal can't be classified", async () => {
    const deps = buildTestDependencies();
    const result = await handleCreateWorkflow(deps, { goal: "Reticulate the splines" });
    expect(result.status).toBe(422);
    expect(result.body).toMatchObject({ error: { category: "planning" } });
  });

  it("returns a 502 routing error when the provider is unhealthy", async () => {
    const deps = buildTestDependencies(
      new FakeProvider("unused", "unused", { healthy: false, message: "down" }),
    );
    const result = await handleCreateWorkflow(deps, { goal: "Hello" });
    expect(result.status).toBe(502);
  });
});

describe("handleGetWorkflow", () => {
  it("returns the serialized workflow after creation", async () => {
    const deps = buildTestDependencies(new FakeProvider("Hi there!", "fake-model"));
    const created = await handleCreateWorkflow(deps, { goal: "Hello" });
    const workflowId = (created.body as { id: string }).id;

    const result = await handleGetWorkflow(deps, workflowId);

    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ id: workflowId });
  });

  it("returns a 404 not_found error for an id that doesn't exist", async () => {
    const deps = buildTestDependencies();
    const result = await handleGetWorkflow(deps, "does-not-exist");
    expect(result.status).toBe(404);
    expect(result.body).toMatchObject({ error: { category: "not_found" } });
  });
});

describe("handleGetWorkflowGraph", () => {
  it("returns nodes, edges, and timestamps", async () => {
    const deps = buildTestDependencies(new FakeProvider("Hi there!", "fake-model"));
    const created = await handleCreateWorkflow(deps, { goal: "Hello" });
    const workflowId = (created.body as { id: string }).id;

    const result = await handleGetWorkflowGraph(deps, workflowId);

    expect(result.status).toBe(200);
    const body = result.body as {
      nodes: unknown[];
      edges: unknown[];
      metadata: { createdAt: string; updatedAt: string };
    };
    expect(body.nodes).toHaveLength(1);
    expect(body.edges).toEqual([]);
    expect(typeof body.metadata.createdAt).toBe("string");
  });

  it("returns a 404 not_found error for an id that doesn't exist", async () => {
    const deps = buildTestDependencies();
    const result = await handleGetWorkflowGraph(deps, "does-not-exist");
    expect(result.status).toBe(404);
  });
});
