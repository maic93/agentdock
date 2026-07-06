import { describe, expect, it } from "vitest";
import { createExecutionId } from "./execution-id.js";
import { createGoal } from "./goal.js";
import { createExecutionError } from "./execution-error.js";
import { Job } from "./job.js";
import { JobStatus } from "./job-status.js";
import { summarizeJob } from "./job-summary.js";

describe("summarizeJob", () => {
  it("summarizes a freshly-created Job with no executionId or response", () => {
    const job = Job.create(createGoal("Hello"));
    const summary = summarizeJob(job);
    expect(summary).toEqual({ jobId: job.id, status: JobStatus.Created });
  });

  it("includes the latest executionId once the Job is executing", () => {
    const executionId = createExecutionId();
    const job = Job.create(createGoal("Hello")).startPlanning().beginExecution(executionId);
    const summary = summarizeJob(job);
    expect(summary.executionId).toBe(executionId);
  });

  it("includes the response once the Job has completed", () => {
    const job = Job.create(createGoal("Hello"))
      .startPlanning()
      .beginExecution(createExecutionId())
      .complete({ summary: "Hi there!" });
    const summary = summarizeJob(job);
    expect(summary.response).toBe("Hi there!");
  });

  it("does not include a response for a failed Job", () => {
    const job = Job.create(createGoal("Hello")).fail(createExecutionError("boom", "X"));
    const summary = summarizeJob(job);
    expect(summary.response).toBeUndefined();
    expect(summary.status).toBe(JobStatus.Failed);
  });
});
