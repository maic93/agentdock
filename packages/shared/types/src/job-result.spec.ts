import { describe, expect, it } from "vitest";
import { createExecutionResult } from "./execution-result.js";
import { jobResultFromExecutionResult } from "./job-result.js";

describe("jobResultFromExecutionResult", () => {
  it("carries the summary, provider, and model over", () => {
    const executionResult = createExecutionResult("Hi there!", {
      provider: "ollama",
      model: "llama3.2",
      durationMs: 42,
    });

    const jobResult = jobResultFromExecutionResult(executionResult);

    expect(jobResult).toEqual({ summary: "Hi there!", provider: "ollama", model: "llama3.2" });
  });

  it("does not carry durationMs — a Job has no single meaningful duration", () => {
    const executionResult = createExecutionResult("Hi there!", { durationMs: 42 });
    const jobResult = jobResultFromExecutionResult(executionResult);
    expect(jobResult).not.toHaveProperty("durationMs");
  });

  it("omits provider and model when the ExecutionResult doesn't have them", () => {
    const executionResult = createExecutionResult("Hi there!");
    const jobResult = jobResultFromExecutionResult(executionResult);
    expect(jobResult).toEqual({ summary: "Hi there!" });
  });
});
