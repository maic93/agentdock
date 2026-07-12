import { describe, expect, it } from "vitest";
import { handleGetProvider, handleListProviders, handleProvidersHealth } from "./providers.js";
import { buildTestDependencies, FakeProvider } from "../test-support.js";

describe("handleListProviders", () => {
  it("returns metadata and health for every registered provider", async () => {
    const deps = buildTestDependencies(new FakeProvider());
    const result = await handleListProviders(deps);

    expect(result.status).toBe(200);
    const body = result.body as {
      providers: Array<{ metadata: { id: string }; health: { healthy: boolean } }>;
    };
    expect(body.providers).toHaveLength(1);
    expect(body.providers[0]?.metadata.id).toBe("fake-provider");
    expect(body.providers[0]?.health.healthy).toBe(true);
  });
});

describe("handleGetProvider", () => {
  it("returns metadata and health for a registered provider", async () => {
    const deps = buildTestDependencies(new FakeProvider());
    const result = await handleGetProvider(deps, "fake-provider");

    expect(result.status).toBe(200);
    const body = result.body as { metadata: { displayName: string } };
    expect(body.metadata.displayName).toBe("Fake Provider");
  });

  it("returns a 404 not_found error for an unregistered provider id", async () => {
    const deps = buildTestDependencies();
    const result = await handleGetProvider(deps, "does-not-exist");
    expect(result.status).toBe(404);
    expect(result.body).toMatchObject({ error: { category: "not_found" } });
  });
});

describe("handleProvidersHealth", () => {
  it("returns id and health for every registered provider, without full metadata", async () => {
    const deps = buildTestDependencies(new FakeProvider());
    const result = await handleProvidersHealth(deps);

    expect(result.status).toBe(200);
    const body = result.body as { providers: Array<{ id: string; health: { healthy: boolean } }> };
    expect(body.providers).toEqual([{ id: "fake-provider", health: { healthy: true } }]);
  });
});
