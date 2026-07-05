import { describe, expect, it } from "vitest";
import {
  createProviderId,
  type Provider,
  type ProviderExecuteRequest,
  type ProviderExecuteResult,
  type ProviderHealth,
  type ProviderId,
} from "@agentdock/provider-abstraction";
import type { Capability } from "@agentdock/shared-types";
import { CapabilityMatchingRouter } from "./capability-matching-router.js";
import { NoProviderAvailableError } from "./router.js";

class FakeProvider implements Provider {
  readonly id: ProviderId;
  readonly capabilities: readonly Capability[];
  private readonly health: ProviderHealth;

  constructor(id: string, capabilities: readonly Capability[], health: ProviderHealth) {
    this.id = createProviderId(id);
    this.capabilities = capabilities;
    this.health = health;
  }

  async checkHealth(): Promise<ProviderHealth> {
    return this.health;
  }

  async listModels(): Promise<readonly string[]> {
    return [];
  }

  async execute(_request: ProviderExecuteRequest): Promise<ProviderExecuteResult> {
    return { output: `handled by ${this.id}`, model: "fake-model" };
  }
}

describe("CapabilityMatchingRouter", () => {
  it("selects the only capable, healthy provider", async () => {
    const provider = new FakeProvider("ollama", ["text-generation"], { healthy: true });
    const router = new CapabilityMatchingRouter([provider]);

    const selected = await router.selectProvider({ capability: "text-generation" });

    expect(selected).toBe(provider);
  });

  it("skips a capable but unhealthy provider in favor of a healthy one", async () => {
    const unhealthy = new FakeProvider("unhealthy-one", ["text-generation"], {
      healthy: false,
      message: "down",
    });
    const healthy = new FakeProvider("healthy-one", ["text-generation"], { healthy: true });
    const router = new CapabilityMatchingRouter([unhealthy, healthy]);

    const selected = await router.selectProvider({ capability: "text-generation" });

    expect(selected).toBe(healthy);
  });

  it("ignores a provider that doesn't have the requested capability, even if healthy", async () => {
    const wrongCapability = new FakeProvider("wrong", [], { healthy: true });
    const router = new CapabilityMatchingRouter([wrongCapability]);

    await expect(router.selectProvider({ capability: "text-generation" })).rejects.toThrow(
      NoProviderAvailableError,
    );
  });

  it("throws NoProviderAvailableError when no provider is registered at all", async () => {
    const router = new CapabilityMatchingRouter([]);

    await expect(router.selectProvider({ capability: "text-generation" })).rejects.toThrow(
      NoProviderAvailableError,
    );
  });

  it("throws NoProviderAvailableError when every capable provider is unhealthy", async () => {
    const unhealthy = new FakeProvider("ollama", ["text-generation"], { healthy: false });
    const router = new CapabilityMatchingRouter([unhealthy]);

    await expect(router.selectProvider({ capability: "text-generation" })).rejects.toThrow(
      NoProviderAvailableError,
    );
  });
});
