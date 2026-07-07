import { describe, expect, it } from "vitest";
import { createGoal, Execution } from "@agentdock/shared-types";
import { handleGetExecution } from "./get-execution.js";
import { buildTestDependencies } from "../test-support.js";

describe("handleGetExecution", () => {
  it("returns the serialized execution when it exists", async () => {
    const deps = buildTestDependencies();
    const execution = Execution.create(createGoal("Hello"));
    await deps.executionStore.create(execution);

    const result = await handleGetExecution(deps, execution.id);

    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ id: execution.id, status: "created" });
  });

  it("returns a 404 not_found error for an id that doesn't exist", async () => {
    const deps = buildTestDependencies();

    const result = await handleGetExecution(deps, "does-not-exist");

    expect(result.status).toBe(404);
    expect(result.body).toMatchObject({ error: { category: "not_found" } });
  });
});
