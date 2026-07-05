/**
 * Configuration the {@link OllamaProvider} needs to talk to a running Ollama
 * instance. Deliberately passed in by the caller (the composition root, see
 * apps/api) rather than read from `process.env` internally — only
 * foundation/config reads environment variables directly, per the
 * repository's layered-configuration design.
 */
export interface OllamaProviderConfig {
  readonly baseUrl: string;
  /** The default model used when a request doesn't specify one. Never hardcoded — always supplied by config. */
  readonly model: string;
  readonly timeoutMs: number;
}
