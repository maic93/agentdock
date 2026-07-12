import { describe, expect, it } from "vitest";
import { CapabilityMatchingRouter } from "./capability-matching-router.js";
import { NoProviderAvailableError } from "./router.js";
import { FakeProvider, registryWith } from "./test-support.js";

describe("CapabilityMatchingRouter", () => {
  it("selects the only capable, healthy provider", async () => {
    const provider = new FakeProvider("ollama");
    const router = new CapabilityMatchingRouter(registryWith(provider));

    const selected = await router.selectProvider({ capability: "text-generation" });

    expect(selected).toBe(provider);
  });

  it("skips a capable but unhealthy provider in favor of a healthy one", async () => {
    const unhealthy = new FakeProvider("unhealthy-one", {
      health: { healthy: false, message: "down" },
    });
    const healthy = new FakeProvider("healthy-one");
    const router = new CapabilityMatchingRouter(registryWith(unhealthy, healthy));

    const selected = await router.selectProvider({ capability: "text-generation" });

    expect(selected).toBe(healthy);
  });

  it("ignores a provider that doesn't have the requested capability, even if healthy", async () => {
    const wrongCapability = new FakeProvider("wrong", { capabilities: [] });
    const router = new CapabilityMatchingRouter(registryWith(wrongCapability));

    await expect(router.selectProvider({ capability: "text-generation" })).rejects.toThrow(
      NoProviderAvailableError,
    );
  });

  it("throws NoProviderAvailableError when no provider is registered at all", async () => {
    const router = new CapabilityMatchingRouter(registryWith());

    await expect(router.selectProvider({ capability: "text-generation" })).rejects.toThrow(
      NoProviderAvailableError,
    );
  });

  it("throws NoProviderAvailableError when every capable provider is unhealthy", async () => {
    const unhealthy = new FakeProvider("ollama", { health: { healthy: false } });
    const router = new CapabilityMatchingRouter(registryWith(unhealthy));

    await expect(router.selectProvider({ capability: "text-generation" })).rejects.toThrow(
      NoProviderAvailableError,
    );
  });

  describe("selectProviderWithDiagnostics", () => {
    it("returns diagnostics with the selected provider on success", async () => {
      const provider = new FakeProvider("ollama");
      const router = new CapabilityMatchingRouter(registryWith(provider));

      const { provider: selected, diagnostics } = await router.selectProviderWithDiagnostics({
        capability: "text-generation",
      });

      expect(selected).toBe(provider);
      expect(diagnostics.selectedProviderId).toBe(provider.id);
      expect(diagnostics.capability).toBe("text-generation");
      expect(diagnostics.selectionDurationMs).toBeGreaterThanOrEqual(0);
    });

    it("returns diagnostics with no provider and a rejection reason on failure, without throwing", async () => {
      const unhealthy = new FakeProvider("ollama", {
        health: { healthy: false, message: "connection refused" },
      });
      const router = new CapabilityMatchingRouter(registryWith(unhealthy));

      const { provider, diagnostics } = await router.selectProviderWithDiagnostics({
        capability: "text-generation",
      });

      expect(provider).toBeUndefined();
      expect(diagnostics.selectedProviderId).toBeUndefined();
      expect(diagnostics.scores).toHaveLength(1);
      expect(diagnostics.scores[0]?.eligible).toBe(false);
      expect(diagnostics.scores[0]?.rejectionReason).toBe("connection refused");
    });
  });
});
