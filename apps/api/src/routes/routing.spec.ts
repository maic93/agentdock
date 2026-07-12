import { describe, expect, it } from "vitest";
import { handleGetRouting } from "./routing.js";
import { buildTestDependencies, FakeProvider } from "../test-support.js";

describe("handleGetRouting", () => {
  it("defaults to text-generation and returns diagnostics with the selected provider", async () => {
    const deps = buildTestDependencies(new FakeProvider());
    const result = await handleGetRouting(deps, new URLSearchParams());

    expect(result.status).toBe(200);
    const body = result.body as {
      capability: string;
      selectedProviderId?: string;
      scores: unknown[];
    };
    expect(body.capability).toBe("text-generation");
    expect(body.selectedProviderId).toBe("fake-provider");
    expect(body.scores).toHaveLength(1);
  });

  it("respects an explicit ?capability= query parameter", async () => {
    const deps = buildTestDependencies(new FakeProvider());
    const result = await handleGetRouting(deps, new URLSearchParams("capability=text-generation"));
    const body = result.body as { capability: string };
    expect(body.capability).toBe("text-generation");
  });

  it("returns diagnostics with no selected provider when nothing is eligible, without throwing", async () => {
    const deps = buildTestDependencies(
      new FakeProvider("unused", "unused", { healthy: false, message: "down" }),
    );
    const result = await handleGetRouting(deps, new URLSearchParams());

    expect(result.status).toBe(200);
    const body = result.body as {
      selectedProviderId?: string;
      scores: Array<{ eligible: boolean }>;
    };
    expect(body.selectedProviderId).toBeUndefined();
    expect(body.scores[0]?.eligible).toBe(false);
  });
});
