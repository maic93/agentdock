import { describe, expect, it } from "vitest";
import { handleHealth } from "./health.js";
import { buildTestDependencies, FakeProvider } from "../test-support.js";

describe("handleHealth", () => {
  it("reports healthy overall when the provider is healthy", async () => {
    const deps = buildTestDependencies(new FakeProvider());

    const result = await handleHealth(deps);

    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      status: "healthy",
      components: {
        api: { status: "ok" },
        planner: { status: "ok" },
        router: { status: "ok" },
        executor: { status: "ok" },
        ollamaProvider: { status: "ok" },
      },
    });
  });

  it("reports unhealthy overall when the provider is unhealthy", async () => {
    const deps = buildTestDependencies(
      new FakeProvider("unused", "unused", { healthy: false, message: "connection refused" }),
    );

    const result = await handleHealth(deps);

    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      status: "unhealthy",
      components: {
        ollamaProvider: { status: "error", message: "connection refused" },
      },
    });
  });
});
