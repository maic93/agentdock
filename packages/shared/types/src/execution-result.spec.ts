import { describe, expect, it } from "vitest";
import { createExecutionResult } from "./execution-result.js";

describe("createExecutionResult", () => {
  it("creates a result from a non-empty summary alone", () => {
    const result = createExecutionResult("Said hello back.");
    expect(result).toEqual({ summary: "Said hello back." });
  });

  it("trims the summary", () => {
    const result = createExecutionResult("  Said hello back.  ");
    expect(result.summary).toBe("Said hello back.");
  });

  it("rejects an empty summary", () => {
    expect(() => createExecutionResult("")).toThrow();
  });

  it("rejects a whitespace-only summary", () => {
    expect(() => createExecutionResult("   ")).toThrow();
  });

  it("includes provider, model, and durationMs when given", () => {
    const result = createExecutionResult("Said hello back.", {
      provider: "ollama",
      model: "llama3.2",
      durationMs: 42,
    });
    expect(result).toEqual({
      summary: "Said hello back.",
      provider: "ollama",
      model: "llama3.2",
      durationMs: 42,
    });
  });

  it("includes diagnostics when given", () => {
    const diagnostics = {
      capability: "text-generation" as const,
      selectedProviderId: "ollama",
      scores: [],
      reason: "only eligible provider",
      selectionDurationMs: 3,
    };
    const result = createExecutionResult("Said hello back.", { diagnostics });
    expect(result.diagnostics).toEqual(diagnostics);
  });
});
