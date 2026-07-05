import { describe, expect, it } from "vitest";
import type { ExecutionId } from "@agentdock/shared-types";
import { handleExecute } from "./execute.js";
import { buildTestDependencies, FakeProvider } from "../test-support.js";

describe("handleExecute", () => {
  it('returns a completed response for "Hello"', async () => {
    const deps = buildTestDependencies(new FakeProvider("Hi there!", "fake-model"));

    const result = await handleExecute(deps, { goal: "Hello" });

    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      status: "completed",
      response: "Hi there!",
      provider: "fake-provider",
      model: "fake-model",
    });
    expect((result.body as { executionId: string }).executionId).toBeTruthy();
    expect((result.body as { durationMs: number }).durationMs).toBeGreaterThanOrEqual(0);
  });

  it("persists the completed execution in the store", async () => {
    const deps = buildTestDependencies();
    const result = await handleExecute(deps, { goal: "Hello" });
    const executionId = (result.body as { executionId: string }).executionId;

    const stored = await deps.store.get(executionId as ExecutionId);
    expect(stored.status).toBe("completed");
  });

  it("returns a 400 validation error when goal is missing", async () => {
    const deps = buildTestDependencies();

    const result = await handleExecute(deps, {});

    expect(result.status).toBe(400);
    expect(result.body).toMatchObject({ error: { category: "validation" } });
  });

  it("returns a 400 validation error when goal is not a string", async () => {
    const deps = buildTestDependencies();

    const result = await handleExecute(deps, { goal: 123 });

    expect(result.status).toBe(400);
    expect(result.body).toMatchObject({ error: { category: "validation" } });
  });

  it("returns a 400 validation error when goal is an empty string", async () => {
    const deps = buildTestDependencies();

    const result = await handleExecute(deps, { goal: "   " });

    expect(result.status).toBe(400);
    expect(result.body).toMatchObject({ error: { category: "validation" } });
  });

  it("returns a 422 planning error when the goal can't be classified", async () => {
    const deps = buildTestDependencies();

    const result = await handleExecute(deps, { goal: "Reticulate the splines" });

    expect(result.status).toBe(422);
    expect(result.body).toMatchObject({ status: "failed", error: { category: "planning" } });
  });

  it("returns a 502 provider error when the provider is unhealthy", async () => {
    const deps = buildTestDependencies(
      new FakeProvider("unused", "unused", { healthy: false, message: "down" }),
    );

    const result = await handleExecute(deps, { goal: "Hello" });

    expect(result.status).toBe(502);
    expect(result.body).toMatchObject({ status: "failed", error: { category: "routing" } });
  });
});
