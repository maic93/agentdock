import type { ProviderId } from "@agentdock/provider-abstraction";

/** Thrown by {@link ProviderRegistry.register} when a provider with the same id is already registered. */
export class ProviderAlreadyRegisteredError extends Error {
  constructor(public readonly providerId: ProviderId) {
    super(`Provider "${providerId}" is already registered.`);
    this.name = "ProviderAlreadyRegisteredError";
  }
}

/** Thrown by {@link ProviderRegistry.unregister} when no provider with the given id is registered. */
export class ProviderNotRegisteredError extends Error {
  constructor(public readonly providerId: ProviderId) {
    super(`Provider "${providerId}" is not registered.`);
    this.name = "ProviderNotRegisteredError";
  }
}
