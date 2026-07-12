import { describe, expect, it } from "vitest";
import { createExecutionError } from "./execution-error.js";

describe("createExecutionError", () => {
  it("creates an error from message and code alone", () => {
    const error = createExecutionError("boom", "TEST_FAILURE");
    expect(error.message).toBe("boom");
    expect(error.code).toBe("TEST_FAILURE");
    expect(error.diagnostics).toBeUndefined();
  });

  it("carries an optional cause", () => {
    const cause = new Error("underlying");
    const error = createExecutionError("boom", "TEST_FAILURE", cause);
    expect(error.cause).toBe(cause);
  });

  it("carries optional diagnostics as a fourth argument", () => {
    const diagnostics = {
      capability: "text-generation" as const,
      scores: [],
      reason: "no eligible provider",
      selectionDurationMs: 2,
    };
    const error = createExecutionError("boom", "ROUTING_ERROR", undefined, diagnostics);
    expect(error.diagnostics).toEqual(diagnostics);
  });
});
