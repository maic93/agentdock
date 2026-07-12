import {
  createProviderId,
  type Provider,
  type ProviderExecuteRequest,
  type ProviderExecuteResult,
  type ProviderHealth,
  type ProviderId,
  type ProviderMetadata,
  ProviderTimeoutError,
  ProviderUnavailableError,
} from "@agentdock/provider-abstraction";
import type { Capability } from "@agentdock/shared-types";
import type { OllamaProviderConfig } from "./config.js";

interface OllamaTagsResponse {
  readonly models?: ReadonlyArray<{ readonly name: string }>;
}

interface OllamaGenerateResponse {
  readonly response?: string;
}

/**
 * A minimal HTTP client type covering exactly what this provider calls,
 * matching the global `fetch` signature. Accepting this as a constructor
 * parameter (defaulting to the real global `fetch`) is what lets tests
 * substitute a fake implementation instead of hitting a real network
 * request or a real Ollama instance.
 */
type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

/**
 * The first concrete AI provider: a client for a locally (or remotely)
 * running Ollama instance. Supports text generation via Ollama's
 * `/api/generate` endpoint, model listing via `/api/tags`, and treats a
 * successful response from `/api/tags` as a health signal.
 */
export class OllamaProvider implements Provider {
  readonly id: ProviderId = createProviderId("ollama");
  readonly capabilities: readonly Capability[] = ["text-generation"];

  /**
   * Every value here is honest about what it actually reflects:
   * - `supportsStreaming`/`supportsVision`/`supportsTools`/`supportsJSON`/
   *   `supportsFunctionCalling` are all `false` because this *adapter*
   *   doesn't implement any of them yet (Ollama itself supports several —
   *   e.g. `stream: true`, `format: "json"` — this provider just never
   *   sets those request options). These describe AgentDock's current
   *   integration, not Ollama's full feature set.
   * - `contextWindow`/`maxOutputTokens` are conservative, commonly-safe
   *   defaults, NOT introspected from whichever model `OLLAMA_MODEL`
   *   actually names — Ollama's `/api/show` endpoint could provide the
   *   real per-model values, but calling it isn't implemented in this
   *   milestone. Treat these two fields as approximate until that exists.
   * - `latencyTier` is a reasonable default for a local model, not a
   *   measured benchmark.
   * - `costTier: "free"` and `providerType: "local"` are genuinely true
   *   for a local Ollama instance.
   */
  readonly metadata: ProviderMetadata;

  constructor(
    private readonly config: OllamaProviderConfig,
    private readonly fetchImpl: FetchLike = fetch,
  ) {
    this.metadata = {
      id: this.id,
      displayName: "Ollama",
      providerType: "local",
      version: "0.1.0",
      capabilities: this.capabilities,
      supportsStreaming: false,
      supportsVision: false,
      supportsTools: false,
      supportsJSON: false,
      supportsFunctionCalling: false,
      contextWindow: 4096,
      maxOutputTokens: 2048,
      priority: 100,
      costTier: "free",
      latencyTier: "medium",
    };
  }

  async checkHealth(): Promise<ProviderHealth> {
    try {
      const response = await this.fetchWithTimeout("/api/tags", { method: "GET" });
      if (!response.ok) {
        return { healthy: false, message: `Ollama responded with status ${response.status}.` };
      }
      return { healthy: true };
    } catch (cause) {
      return { healthy: false, message: describeFailure(cause) };
    }
  }

  async listModels(): Promise<readonly string[]> {
    let response: Response;
    try {
      response = await this.fetchWithTimeout("/api/tags", { method: "GET" });
    } catch (cause) {
      throw this.toProviderError(cause);
    }
    if (!response.ok) {
      throw new ProviderUnavailableError(
        this.id,
        new Error(`Ollama responded with status ${response.status}.`),
      );
    }
    const body = (await response.json()) as OllamaTagsResponse;
    return (body.models ?? []).map((model) => model.name);
  }

  async execute(request: ProviderExecuteRequest): Promise<ProviderExecuteResult> {
    const model = request.model ?? this.config.model;
    let response: Response;
    try {
      response = await this.fetchWithTimeout("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ model, prompt: request.objective, stream: false }),
      });
    } catch (cause) {
      throw this.toProviderError(cause);
    }

    if (!response.ok) {
      throw new ProviderUnavailableError(
        this.id,
        new Error(`Ollama responded with status ${response.status}.`),
      );
    }

    const body = (await response.json()) as OllamaGenerateResponse;
    if (typeof body.response !== "string") {
      throw new ProviderUnavailableError(
        this.id,
        new Error('Ollama response was missing the expected "response" field.'),
      );
    }

    return { output: body.response, model };
  }

  private async fetchWithTimeout(path: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);
    try {
      return await this.fetchImpl(new URL(path, this.config.baseUrl), {
        ...init,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  }

  private toProviderError(cause: unknown): Error {
    if (isAbortError(cause)) {
      return new ProviderTimeoutError(this.id, this.config.timeoutMs);
    }
    return new ProviderUnavailableError(this.id, cause);
  }
}

function isAbortError(cause: unknown): boolean {
  return cause instanceof Error && cause.name === "AbortError";
}

function describeFailure(cause: unknown): string {
  if (isAbortError(cause)) {
    return "Request timed out.";
  }
  if (cause instanceof Error) {
    return cause.message;
  }
  return "Unknown failure.";
}
