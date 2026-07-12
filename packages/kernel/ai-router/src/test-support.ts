import {
  createProviderId,
  type Provider,
  type ProviderExecuteRequest,
  type ProviderExecuteResult,
  type ProviderHealth,
  type ProviderId,
  type ProviderMetadata,
} from "@agentdock/provider-abstraction";
import { ProviderRegistry } from "@agentdock/kernel-provider-registry";
import type { Capability } from "@agentdock/shared-types";

/**
 * NOTE: excluded from this package's build (see tsconfig.json) — exists
 * only to support tests, mirroring the pattern already established in
 * apps/api/src/test-support.ts.
 */
export interface FakeProviderOptions {
  readonly capabilities?: readonly Capability[];
  readonly health?: ProviderHealth;
  readonly priority?: number;
  readonly latencyTier?: ProviderMetadata["latencyTier"];
  readonly costTier?: ProviderMetadata["costTier"];
}

export class FakeProvider implements Provider {
  readonly id: ProviderId;
  readonly capabilities: readonly Capability[];
  readonly metadata: ProviderMetadata;
  private readonly health: ProviderHealth;

  constructor(id: string, options: FakeProviderOptions = {}) {
    this.id = createProviderId(id);
    this.capabilities = options.capabilities ?? ["text-generation"];
    this.health = options.health ?? { healthy: true };
    this.metadata = {
      id: this.id,
      displayName: id,
      providerType: "local",
      version: "0.0.0",
      capabilities: this.capabilities,
      supportsStreaming: false,
      supportsVision: false,
      supportsTools: false,
      supportsJSON: false,
      supportsFunctionCalling: false,
      contextWindow: 4096,
      maxOutputTokens: 1024,
      priority: options.priority ?? 100,
      costTier: options.costTier ?? "free",
      latencyTier: options.latencyTier ?? "medium",
    };
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

/** Builds a ProviderRegistry with every given provider already registered. */
export function registryWith(...providers: readonly Provider[]): ProviderRegistry {
  const registry = new ProviderRegistry();
  for (const provider of providers) {
    registry.register(provider);
  }
  return registry;
}
