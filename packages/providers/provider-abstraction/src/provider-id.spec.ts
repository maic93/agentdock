import { describe, expect, it } from "vitest";
import { createProviderId } from "./provider-id.js";

describe("createProviderId", () => {
  it("creates a ProviderId from a non-empty string", () => {
    expect(createProviderId("ollama")).toBe("ollama");
  });

  it("trims surrounding whitespace", () => {
    expect(createProviderId("  ollama  ")).toBe("ollama");
  });

  it("rejects an empty string", () => {
    expect(() => createProviderId("")).toThrow();
  });

  it("rejects a whitespace-only string", () => {
    expect(() => createProviderId("   ")).toThrow();
  });
});
