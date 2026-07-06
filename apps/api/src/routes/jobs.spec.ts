import { describe, expect, it } from "vitest";
import { handleCreateJob, handleGetJob, handleGetJobExecutions } from "./jobs.js";
import { buildTestDependencies, FakeProvider } from "../test-support.js";

describe("handleCreateJob", () => {
  it('creates and completes a Job for "Hello"', async () => {
    const deps = buildTestDependencies(new FakeProvider("Hi there!", "fake-model"));

    const result = await handleCreateJob(deps, { goal: "Hello" });

    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ status: "completed", response: "Hi there!" });
    expect((result.body as { jobId: string }).jobId).toBeTruthy();
    expect((result.body as { executionId: string }).executionId).toBeTruthy();
  });

  it("returns a 400 validation error when goal is missing", async () => {
    const deps = buildTestDependencies();
    const result = await handleCreateJob(deps, {});
    expect(result.status).toBe(400);
    expect(result.body).toMatchObject({ error: { category: "validation" } });
  });

  it("returns a 422 planning error when the goal can't be classified", async () => {
    const deps = buildTestDependencies();
    const result = await handleCreateJob(deps, { goal: "Reticulate the splines" });
    expect(result.status).toBe(422);
    expect(result.body).toMatchObject({ status: "failed", error: { category: "planning" } });
  });

  it("returns a 502 routing error when the provider is unhealthy", async () => {
    const deps = buildTestDependencies(
      new FakeProvider("unused", "unused", { healthy: false, message: "down" }),
    );
    const result = await handleCreateJob(deps, { goal: "Hello" });
    expect(result.status).toBe(502);
    expect(result.body).toMatchObject({ status: "failed", error: { category: "routing" } });
  });
});

describe("handleGetJob", () => {
  it("returns the serialized Job after creation", async () => {
    const deps = buildTestDependencies(new FakeProvider("Hi there!", "fake-model"));
    const created = await handleCreateJob(deps, { goal: "Hello" });
    const jobId = (created.body as { jobId: string }).jobId;

    const result = await handleGetJob(deps, jobId);

    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      id: jobId,
      status: "completed",
      goal: { text: "Hello" },
      result: { summary: "Hi there!" },
    });
  });

  it("returns a 404 not_found error for an id that doesn't exist", async () => {
    const deps = buildTestDependencies();
    const result = await handleGetJob(deps, "does-not-exist");
    expect(result.status).toBe(404);
    expect(result.body).toMatchObject({ error: { category: "not_found" } });
  });
});

describe("handleGetJobExecutions", () => {
  it("returns the one Execution the Job owns", async () => {
    const deps = buildTestDependencies(new FakeProvider("Hi there!", "fake-model"));
    const created = await handleCreateJob(deps, { goal: "Hello" });
    const { jobId, executionId } = created.body as { jobId: string; executionId: string };

    const result = await handleGetJobExecutions(deps, jobId);

    expect(result.status).toBe(200);
    const body = result.body as { executions: Array<{ id: string; jobId: string }> };
    expect(body.executions).toHaveLength(1);
    expect(body.executions[0]?.id).toBe(executionId);
    expect(body.executions[0]?.jobId).toBe(jobId);
  });

  it("returns a 404 not_found error for an id that doesn't exist", async () => {
    const deps = buildTestDependencies();
    const result = await handleGetJobExecutions(deps, "does-not-exist");
    expect(result.status).toBe(404);
  });
});
