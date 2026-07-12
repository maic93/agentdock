import { beforeEach, describe, expect, it } from "vitest";
import {
  createProviderId,
  type Provider,
  type ProviderExecuteRequest,
  type ProviderExecuteResult,
  type ProviderHealth,
  type ProviderId,
  type ProviderMetadata,
} from "@agentdock/provider-abstraction";
import type { Capability } from "@agentdock/shared-types";
import { ProviderAlreadyRegisteredError, ProviderNotRegisteredError } from "./errors.js";
import { ProviderRegistry } from "./provider-registry.js";

class FakeProvider implements Provider {
  readonly id: ProviderId;
  readonly capabilities: readonly Capability[];
  readonly metadata: ProviderMetadata;

  constructor(
    id: string,
    capabilities: readonly Capability[] = ["text-generation"],
    private readonly health: ProviderHealth = { healthy: true },
  ) {
    this.id = createProviderId(id);
    this.capabilities = capabilities;
    this.metadata = {
      id: this.id,
      displayName: id,
      providerType: "local",
      version: "0.0.0",
      capabilities,
      supportsStreaming: false,
      supportsVision: false,
      supportsTools: false,
      supportsJSON: false,
      supportsFunctionCalling: false,
      contextWindow: 4096,
      maxOutputTokens: 1024,
      priority: 100,
      costTier: "free",
      latencyTier: "medium",
    };
  }

  async checkHealth(): Promise<ProviderHealth> {
    return this.health;
  }

  async listModels(): Promise<readonly string[]> {
    return [];
  }

  async execute(_request: ProviderExecuteRequest): Promise<ProviderExecuteResult> {
    return { output: "stub", model: "stub-model" };
  }
}

describe("ProviderRegistry", () => {
  let registry: ProviderRegistry;

  beforeEach(() => {
    registry = new ProviderRegistry();
  });

  describe("register", () => {
    it("makes the provider retrievable by id", () => {
      const provider = new FakeProvider("ollama");
      registry.register(provider);
      expect(registry.getProvider(provider.id)).toBe(provider);
    });

    it("rejects registering the same id twice", () => {
      const provider = new FakeProvider("ollama");
      registry.register(provider);
      expect(() => registry.register(provider)).toThrow(ProviderAlreadyRegisteredError);
    });
  });

  describe("unregister", () => {
    it("removes a registered provider", () => {
      const provider = new FakeProvider("ollama");
      registry.register(provider);
      registry.unregister(provider.id);
      expect(registry.getProvider(provider.id)).toBeUndefined();
    });

    it("throws for an id that isn't registered", () => {
      expect(() => registry.unregister(createProviderId("unknown"))).toThrow(
        ProviderNotRegisteredError,
      );
    });
  });

  describe("getProvider", () => {
    it("returns undefined for an id that isn't registered", () => {
      expect(registry.getProvider(createProviderId("unknown"))).toBeUndefined();
    });
  });

  describe("listProviders", () => {
    it("returns every registered provider", () => {
      const first = new FakeProvider("first");
      const second = new FakeProvider("second");
      registry.register(first);
      registry.register(second);
      expect(registry.listProviders()).toEqual([first, second]);
    });

    it("returns an empty list when nothing is registered", () => {
      expect(registry.listProviders()).toEqual([]);
    });
  });

  describe("listProvidersByCapability", () => {
    it("returns only providers supporting the given capability", () => {
      const withCapability = new FakeProvider("has-it", ["text-generation"]);
      const withoutCapability = new FakeProvider("lacks-it", []);
      registry.register(withCapability);
      registry.register(withoutCapability);

      expect(registry.listProvidersByCapability("text-generation")).toEqual([withCapability]);
    });
  });

  describe("getMetadata", () => {
    it("returns the registered provider's metadata", () => {
      const provider = new FakeProvider("ollama");
      registry.register(provider);
      expect(registry.getMetadata(provider.id)).toBe(provider.metadata);
    });

    it("returns undefined for an unregistered id", () => {
      expect(registry.getMetadata(createProviderId("unknown"))).toBeUndefined();
    });
  });

  describe("getHealth / isAvailable", () => {
    it("reflects a healthy provider", async () => {
      const provider = new FakeProvider("ollama", ["text-generation"], { healthy: true });
      registry.register(provider);
      expect(await registry.getHealth(provider.id)).toEqual({ healthy: true });
      expect(await registry.isAvailable(provider.id)).toBe(true);
    });

    it("reflects an unhealthy provider", async () => {
      const provider = new FakeProvider("ollama", ["text-generation"], {
        healthy: false,
        message: "down",
      });
      registry.register(provider);
      expect(await registry.isAvailable(provider.id)).toBe(false);
    });

    it("returns undefined health and unavailable for an unregistered id", async () => {
      const unknown = createProviderId("unknown");
      expect(await registry.getHealth(unknown)).toBeUndefined();
      expect(await registry.isAvailable(unknown)).toBe(false);
    });
  });
});
