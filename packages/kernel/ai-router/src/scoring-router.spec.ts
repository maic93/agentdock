import { describe, expect, it } from "vitest";
import { NoProviderAvailableError } from "./router.js";
import { ScoringRouter } from "./scoring-router.js";
import { FakeProvider, registryWith } from "./test-support.js";

describe("ScoringRouter.selectProvider", () => {
  it("selects the only capable, healthy provider", async () => {
    const provider = new FakeProvider("ollama");
    const router = new ScoringRouter(registryWith(provider));

    expect(await router.selectProvider({ capability: "text-generation" })).toBe(provider);
  });

  it("prefers higher priority over lower priority", async () => {
    const low = new FakeProvider("low-priority", { priority: 10 });
    const high = new FakeProvider("high-priority", { priority: 200 });
    const router = new ScoringRouter(registryWith(low, high));

    expect(await router.selectProvider({ capability: "text-generation" })).toBe(high);
  });

  it("prefers a faster latency tier when priority is equal", async () => {
    const slow = new FakeProvider("slow-one", { priority: 100, latencyTier: "slow" });
    const fast = new FakeProvider("fast-one", { priority: 100, latencyTier: "fast" });
    const router = new ScoringRouter(registryWith(slow, fast));

    expect(await router.selectProvider({ capability: "text-generation" })).toBe(fast);
  });

  it("prefers a cheaper cost tier when priority and latency are equal", async () => {
    const expensive = new FakeProvider("pricey", {
      priority: 100,
      latencyTier: "fast",
      costTier: "high",
    });
    const cheap = new FakeProvider("cheap", {
      priority: 100,
      latencyTier: "fast",
      costTier: "free",
    });
    const router = new ScoringRouter(registryWith(expensive, cheap));

    expect(await router.selectProvider({ capability: "text-generation" })).toBe(cheap);
  });

  it("breaks a fully-tied score by priority, then by provider id (deterministically)", async () => {
    // Identical priority/latency/cost -> identical score. Tie-break must
    // fall through to priority (still equal here) and then provider id,
    // lexicographically ascending: "a-provider" sorts before "b-provider".
    const b = new FakeProvider("b-provider", {
      priority: 50,
      latencyTier: "medium",
      costTier: "low",
    });
    const a = new FakeProvider("a-provider", {
      priority: 50,
      latencyTier: "medium",
      costTier: "low",
    });
    const router = new ScoringRouter(registryWith(b, a));

    expect(await router.selectProvider({ capability: "text-generation" })).toBe(a);
  });

  it("is deterministic across repeated calls with the same inputs", async () => {
    const first = new FakeProvider("first", { priority: 50 });
    const second = new FakeProvider("second", { priority: 50 });
    const router = new ScoringRouter(registryWith(first, second));

    const results = await Promise.all(
      Array.from({ length: 5 }, () => router.selectProvider({ capability: "text-generation" })),
    );

    expect(new Set(results.map((provider) => provider.id)).size).toBe(1);
  });

  it("excludes an unhealthy provider from scoring entirely, regardless of its metadata", async () => {
    const unhealthyButBetter = new FakeProvider("better-but-down", {
      priority: 1000,
      health: { healthy: false },
    });
    const healthyButWorse = new FakeProvider("worse-but-up", { priority: 1 });
    const router = new ScoringRouter(registryWith(unhealthyButBetter, healthyButWorse));

    expect(await router.selectProvider({ capability: "text-generation" })).toBe(healthyButWorse);
  });

  it("excludes a provider lacking the requested capability", async () => {
    const wrongCapability = new FakeProvider("wrong", { capabilities: [] });
    const router = new ScoringRouter(registryWith(wrongCapability));

    await expect(router.selectProvider({ capability: "text-generation" })).rejects.toThrow(
      NoProviderAvailableError,
    );
  });

  it("throws NoProviderAvailableError when nothing is eligible", async () => {
    const router = new ScoringRouter(registryWith());
    await expect(router.selectProvider({ capability: "text-generation" })).rejects.toThrow(
      NoProviderAvailableError,
    );
  });
});

describe("ScoringRouter.selectProviderWithDiagnostics", () => {
  it("includes a score breakdown for every eligible candidate", async () => {
    const provider = new FakeProvider("ollama", {
      priority: 100,
      latencyTier: "fast",
      costTier: "free",
    });
    const router = new ScoringRouter(registryWith(provider));

    const { diagnostics } = await router.selectProviderWithDiagnostics({
      capability: "text-generation",
    });

    expect(diagnostics.scores).toHaveLength(1);
    const [score] = diagnostics.scores;
    expect(score?.eligible).toBe(true);
    expect(score?.breakdown).toEqual({ priority: 100, latency: 3, cost: 3 });
    expect(score?.score).toBe(106);
  });

  it("includes rejected providers with a rejection reason, never silently dropping them", async () => {
    const winner = new FakeProvider("winner", { priority: 100 });
    const loserUnhealthy = new FakeProvider("loser", {
      health: { healthy: false, message: "timeout" },
    });
    const router = new ScoringRouter(registryWith(winner, loserUnhealthy));

    const { diagnostics } = await router.selectProviderWithDiagnostics({
      capability: "text-generation",
    });

    expect(diagnostics.scores).toHaveLength(2);
    const loserScore = diagnostics.scores.find((score) => score.providerId === loserUnhealthy.id);
    expect(loserScore?.eligible).toBe(false);
    expect(loserScore?.rejectionReason).toBe("timeout");
  });

  it("never throws, even with zero eligible candidates", async () => {
    const router = new ScoringRouter(registryWith());
    const { provider, diagnostics } = await router.selectProviderWithDiagnostics({
      capability: "text-generation",
    });
    expect(provider).toBeUndefined();
    expect(diagnostics.reason).toContain("No healthy");
  });

  it("reports a non-negative selectionDurationMs", async () => {
    const router = new ScoringRouter(registryWith(new FakeProvider("ollama")));
    const { diagnostics } = await router.selectProviderWithDiagnostics({
      capability: "text-generation",
    });
    expect(diagnostics.selectionDurationMs).toBeGreaterThanOrEqual(0);
  });
});
