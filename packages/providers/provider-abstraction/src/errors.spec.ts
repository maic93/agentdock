import { describe, expect, it } from "vitest";
import { createProviderId } from "./provider-id.js";
import { ProviderError, ProviderTimeoutError, ProviderUnavailableError } from "./errors.js";

describe("ProviderTimeoutError", () => {
  it("is a ProviderError with the provider id and timeout in its message", () => {
    const id = createProviderId("ollama");
    const error = new ProviderTimeoutError(id, 5000);
    expect(error).toBeInstanceOf(ProviderError);
    expect(error.providerId).toBe(id);
    expect(error.message).toContain("ollama");
    expect(error.message).toContain("5000");
  });
});

describe("ProviderUnavailableError", () => {
  it("is a ProviderError carrying an optional cause", () => {
    const id = createProviderId("ollama");
    const cause = new Error("ECONNREFUSED");
    const error = new ProviderUnavailableError(id, cause);
    expect(error).toBeInstanceOf(ProviderError);
    expect(error.cause).toBe(cause);
  });
});
