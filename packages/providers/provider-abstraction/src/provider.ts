import type { Capability } from "@agentdock/shared-types";
import type { ProviderHealth } from "./provider-health.js";
import type { ProviderId } from "./provider-id.js";

/** A request to a {@link Provider} to satisfy one capability for one objective. */
export interface ProviderExecuteRequest {
  readonly objective: string;
  readonly capability: Capability;
  /** Overrides the provider's configured default model, if given. */
  readonly model?: string;
}

/** What a {@link Provider} produced for a {@link ProviderExecuteRequest}. */
export interface ProviderExecuteResult {
  readonly output: string;
  /** The model that actually produced `output` — always concrete, never "default". */
  readonly model: string;
}

/**
 * The contract every AI provider implements — the abstraction that lets the
 * AI Router and Executor work with "a provider that does text-generation"
 * without knowing whether that's Ollama, OpenAI, Anthropic, or anything
 * else. This interface is deliberately small: exactly the operations the
 * rest of the kernel needs today (what can you do, are you working, what
 * models do you have, do the work) and nothing a future provider might
 * conceivably want. New capabilities on a provider are added here only once
 * something in the kernel actually needs to call them.
 */
export interface Provider {
  readonly id: ProviderId;
  readonly capabilities: readonly Capability[];

  /** Whether the provider is currently reachable and usable. */
  checkHealth(): Promise<ProviderHealth>;

  /** The models this provider currently has available. */
  listModels(): Promise<readonly string[]>;

  /** Executes a request, throwing a {@link ProviderError} subclass on failure. */
  execute(request: ProviderExecuteRequest): Promise<ProviderExecuteResult>;
}
