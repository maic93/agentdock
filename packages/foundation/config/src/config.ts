import { ConfigurationError } from "./errors.js";

/**
 * The fully-validated application configuration. Every field here is
 * guaranteed present and well-formed by the time {@link loadConfig} returns
 * successfully — consumers never need to re-check a field for existence or
 * shape.
 */
export interface AppConfig {
  readonly ollamaBaseUrl: string;
  readonly ollamaModel: string;
  readonly requestTimeoutMs: number;
  readonly port: number;
}

/**
 * Loads and validates configuration from environment variables, per the
 * repository's layered-configuration design (foundation-config is the only
 * package that reads `process.env` directly — see
 * docs/architecture/002-repository-foundation.md). Throws
 * {@link ConfigurationError} immediately on any missing or invalid value,
 * so a misconfigured deployment fails at startup rather than failing later,
 * confusingly, on the first request.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const ollamaBaseUrl = requireString(env, "OLLAMA_BASE_URL");
  assertValidUrl("OLLAMA_BASE_URL", ollamaBaseUrl);

  const ollamaModel = requireString(env, "OLLAMA_MODEL");
  const requestTimeoutMs = requirePositiveInt(env, "REQUEST_TIMEOUT_MS");
  const port = requirePositiveInt(env, "PORT");

  return { ollamaBaseUrl, ollamaModel, requestTimeoutMs, port };
}

function requireString(env: NodeJS.ProcessEnv, key: string): string {
  const value = env[key];
  if (!value || value.trim().length === 0) {
    throw new ConfigurationError(`Missing required environment variable: ${key}`);
  }
  return value.trim();
}

function assertValidUrl(key: string, value: string): void {
  try {
    const parsed = new URL(value);
    void parsed;
  } catch {
    throw new ConfigurationError(`${key} is not a valid URL: "${value}"`);
  }
}

function requirePositiveInt(env: NodeJS.ProcessEnv, key: string): number {
  const raw = requireString(env, key);
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new ConfigurationError(`${key} must be a positive integer, got "${raw}".`);
  }
  return parsed;
}
