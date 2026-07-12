import type {
  Provider,
  ProviderHealth,
  ProviderId,
  ProviderMetadata,
} from "@agentdock/provider-abstraction";
import type { Capability } from "@agentdock/shared-types";
import { ProviderAlreadyRegisteredError, ProviderNotRegisteredError } from "./errors.js";

/**
 * Holds the set of providers AgentDock currently knows about, and answers
 * questions about them — by id, by capability, by health — without ever
 * knowing which concrete provider (Ollama, or anything registered later)
 * it's holding. This package imports only `@agentdock/provider-abstraction`
 * types; it has no dependency on any plugin, and never will, by
 * construction (see docs/architecture/006-provider-routing.md).
 *
 * "Dynamic" here means providers can be registered and unregistered at
 * runtime — nothing about the registry's shape assumes a fixed set decided
 * once at startup, even though today's composition root (apps/api) only
 * ever registers one.
 */
export class ProviderRegistry {
  private readonly providersById = new Map<ProviderId, Provider>();

  /** Registers a provider. Throws {@link ProviderAlreadyRegisteredError} if its id is already registered. */
  register(provider: Provider): void {
    if (this.providersById.has(provider.id)) {
      throw new ProviderAlreadyRegisteredError(provider.id);
    }
    this.providersById.set(provider.id, provider);
  }

  /** Unregisters a provider by id. Throws {@link ProviderNotRegisteredError} if it isn't registered. */
  unregister(id: ProviderId): void {
    if (!this.providersById.delete(id)) {
      throw new ProviderNotRegisteredError(id);
    }
  }

  /** Returns the provider with the given id, or `undefined` if none is registered. */
  getProvider(id: ProviderId): Provider | undefined {
    return this.providersById.get(id);
  }

  /** Every currently-registered provider. */
  listProviders(): readonly Provider[] {
    return Array.from(this.providersById.values());
  }

  /** Every currently-registered provider that supports `capability`. */
  listProvidersByCapability(capability: Capability): readonly Provider[] {
    return this.listProviders().filter((provider) => provider.capabilities.includes(capability));
  }

  /** The metadata for a registered provider, or `undefined` if it isn't registered. */
  getMetadata(id: ProviderId): ProviderMetadata | undefined {
    return this.providersById.get(id)?.metadata;
  }

  /** The current health of a registered provider, or `undefined` if it isn't registered. */
  async getHealth(id: ProviderId): Promise<ProviderHealth | undefined> {
    const provider = this.providersById.get(id);
    if (!provider) {
      return undefined;
    }
    return provider.checkHealth();
  }

  /** Whether a registered provider is currently healthy. `false` (not an error) if it isn't registered at all. */
  async isAvailable(id: ProviderId): Promise<boolean> {
    const health = await this.getHealth(id);
    return health?.healthy ?? false;
  }
}
