import { describe, expect, it } from "vitest";
import { loadConfig } from "./config.js";
import { ConfigurationError } from "./errors.js";

function validEnv(overrides: Partial<NodeJS.ProcessEnv> = {}): NodeJS.ProcessEnv {
  return {
    OLLAMA_BASE_URL: "http://localhost:11434",
    OLLAMA_MODEL: "llama3.2",
    REQUEST_TIMEOUT_MS: "30000",
    PORT: "3000",
    ...overrides,
  };
}

describe("loadConfig", () => {
  it("loads a fully valid configuration", () => {
    const config = loadConfig(validEnv());
    expect(config).toEqual({
      ollamaBaseUrl: "http://localhost:11434",
      ollamaModel: "llama3.2",
      requestTimeoutMs: 30000,
      port: 3000,
    });
  });

  it("throws ConfigurationError when OLLAMA_BASE_URL is missing", () => {
    expect(() => loadConfig(validEnv({ OLLAMA_BASE_URL: undefined }))).toThrow(ConfigurationError);
  });

  it("throws ConfigurationError when OLLAMA_BASE_URL is not a valid URL", () => {
    expect(() => loadConfig(validEnv({ OLLAMA_BASE_URL: "not-a-url" }))).toThrow(
      ConfigurationError,
    );
  });

  it("throws ConfigurationError when OLLAMA_MODEL is missing", () => {
    expect(() => loadConfig(validEnv({ OLLAMA_MODEL: "" }))).toThrow(ConfigurationError);
  });

  it("throws ConfigurationError when REQUEST_TIMEOUT_MS is missing", () => {
    expect(() => loadConfig(validEnv({ REQUEST_TIMEOUT_MS: undefined }))).toThrow(
      ConfigurationError,
    );
  });

  it("throws ConfigurationError when REQUEST_TIMEOUT_MS is not a positive integer", () => {
    expect(() => loadConfig(validEnv({ REQUEST_TIMEOUT_MS: "0" }))).toThrow(ConfigurationError);
    expect(() => loadConfig(validEnv({ REQUEST_TIMEOUT_MS: "-5" }))).toThrow(ConfigurationError);
    expect(() => loadConfig(validEnv({ REQUEST_TIMEOUT_MS: "3.5" }))).toThrow(ConfigurationError);
    expect(() => loadConfig(validEnv({ REQUEST_TIMEOUT_MS: "abc" }))).toThrow(ConfigurationError);
  });

  it("throws ConfigurationError when PORT is missing", () => {
    expect(() => loadConfig(validEnv({ PORT: undefined }))).toThrow(ConfigurationError);
  });

  it("throws ConfigurationError when PORT is not a positive integer", () => {
    expect(() => loadConfig(validEnv({ PORT: "0" }))).toThrow(ConfigurationError);
    expect(() => loadConfig(validEnv({ PORT: "-1" }))).toThrow(ConfigurationError);
  });

  it("includes the offending variable name in the error message", () => {
    try {
      loadConfig(validEnv({ OLLAMA_MODEL: undefined }));
      expect.unreachable("loadConfig should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigurationError);
      expect((error as Error).message).toContain("OLLAMA_MODEL");
    }
  });
});
