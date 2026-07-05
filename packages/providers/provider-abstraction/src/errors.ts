import type { ProviderId } from "./provider-id.js";

/**
 * Base class for every error a {@link Provider} implementation can throw
 * from `execute`, `listModels`, or `checkHealth`. Concrete providers
 * (plugins) throw one of the subclasses below rather than inventing their
 * own error types, so the AI Router and Executor can catch a stable,
 * provider-agnostic set of failure modes regardless of which provider is
 * involved.
 */
export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly providerId: ProviderId,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

/** The provider did not respond within its configured timeout. */
export class ProviderTimeoutError extends ProviderError {
  constructor(providerId: ProviderId, timeoutMs: number) {
    super(`Provider "${providerId}" timed out after ${timeoutMs}ms.`, providerId);
    this.name = "ProviderTimeoutError";
  }
}

/** The provider could not be reached, or responded with an error status. */
export class ProviderUnavailableError extends ProviderError {
  constructor(providerId: ProviderId, cause?: unknown) {
    super(`Provider "${providerId}" is unavailable.`, providerId, cause);
    this.name = "ProviderUnavailableError";
  }
}
