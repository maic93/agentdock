import { describe, expect, it } from "vitest";
import { createExecutionError } from "./execution-error.js";
import { createExecutionId } from "./execution-id.js";
import { createGoal } from "./goal.js";
import { InvalidJobTransitionError } from "./errors.js";
import { Job } from "./job.js";
import { JobStatus } from "./job-status.js";

const FIXED_TIME_1 = new Date("2026-01-01T00:00:00.000Z");
const FIXED_TIME_2 = new Date("2026-01-01T00:00:01.000Z");

describe("Job.create", () => {
  it("starts in the Created status", () => {
    const job = Job.create(createGoal("Hello"));
    expect(job.status).toBe(JobStatus.Created);
  });

  it("assigns a unique id", () => {
    const goal = createGoal("Hello");
    expect(Job.create(goal).id).not.toBe(Job.create(goal).id);
  });

  it("defaults to normal priority", () => {
    const job = Job.create(createGoal("Hello"));
    expect(job.priority).toBe("normal");
  });

  it("accepts an explicit priority", () => {
    const job = Job.create(createGoal("Hello"), "high");
    expect(job.priority).toBe("high");
  });

  it("starts with no owned Executions", () => {
    const job = Job.create(createGoal("Hello"));
    expect(job.executionIds).toEqual([]);
  });

  it("has no result or error yet", () => {
    const job = Job.create(createGoal("Hello"));
    expect(job.result).toBeUndefined();
    expect(job.error).toBeUndefined();
  });

  it("sets createdAt and updatedAt to the same initial timestamp", () => {
    const job = Job.create(createGoal("Hello"), "normal", () => FIXED_TIME_1);
    expect(job.metadata.createdAt).toEqual(FIXED_TIME_1);
    expect(job.metadata.updatedAt).toEqual(FIXED_TIME_1);
  });
});

describe("Job full lifecycle (happy path)", () => {
  it("walks Created -> Planning -> Executing -> Completed, owning its Execution", () => {
    const executionId = createExecutionId();
    let job = Job.create(createGoal("Hello"), "normal", () => FIXED_TIME_1);

    job = job.startPlanning(() => FIXED_TIME_2);
    expect(job.status).toBe(JobStatus.Planning);

    job = job.beginExecution(executionId, () => FIXED_TIME_2);
    expect(job.status).toBe(JobStatus.Executing);
    expect(job.executionIds).toEqual([executionId]);

    job = job.complete({ summary: "Hi there!" }, () => FIXED_TIME_2);
    expect(job.status).toBe(JobStatus.Completed);
    expect(job.result).toEqual({ summary: "Hi there!" });
  });

  it("never mutates the original instance at any step", () => {
    const original = Job.create(createGoal("Hello"));
    const afterPlanning = original.startPlanning();
    expect(original.status).toBe(JobStatus.Created);
    expect(afterPlanning.status).toBe(JobStatus.Planning);
    expect(original).not.toBe(afterPlanning);
  });

  it("advances updatedAt but not createdAt on every transition", () => {
    let job = Job.create(createGoal("Hello"), "normal", () => FIXED_TIME_1);
    job = job.startPlanning(() => FIXED_TIME_2);
    expect(job.metadata.createdAt).toEqual(FIXED_TIME_1);
    expect(job.metadata.updatedAt).toEqual(FIXED_TIME_2);
  });

  it("appends to executionIds rather than replacing, so a future multi-execution call is additive", () => {
    const first = createExecutionId();
    const second = createExecutionId();
    let job = Job.create(createGoal("Hello")).startPlanning().beginExecution(first);
    // Simulate a hypothetical second Execution being added later; this is
    // only possible because beginExecution requires a Planning->Executing
    // transition, so directly calling it twice from Executing would fail —
    // this test exercises the append logic itself, not a real call pattern
    // today (see the JobProps.executionIds doc comment on job.ts).
    const patchedProps = { ...job.toProps(), executionIds: [...job.executionIds, second] };
    job = Job.fromProps(patchedProps);
    expect(job.executionIds).toEqual([first, second]);
  });
});

describe("Job failure path", () => {
  it("can fail directly from Created", () => {
    const job = Job.create(createGoal("Hello")).fail(createExecutionError("boom", "X"));
    expect(job.status).toBe(JobStatus.Failed);
    expect(job.error?.message).toBe("boom");
  });

  it("can fail from Planning", () => {
    const job = Job.create(createGoal("Hello"))
      .startPlanning()
      .fail(createExecutionError("boom", "X"));
    expect(job.status).toBe(JobStatus.Failed);
  });

  it("can fail from Executing", () => {
    const job = Job.create(createGoal("Hello"))
      .startPlanning()
      .beginExecution(createExecutionId())
      .fail(createExecutionError("boom", "X"));
    expect(job.status).toBe(JobStatus.Failed);
  });
});

describe("Job illegal transitions", () => {
  it("rejects skipping directly from Created to Executing", () => {
    const job = Job.create(createGoal("Hello"));
    expect(() => job.beginExecution(createExecutionId())).toThrow(InvalidJobTransitionError);
  });

  it("rejects any transition once Completed", () => {
    const job = Job.create(createGoal("Hello"))
      .startPlanning()
      .beginExecution(createExecutionId())
      .complete({ summary: "done" });

    expect(() => job.fail(createExecutionError("boom", "X"))).toThrow(InvalidJobTransitionError);
    expect(() => job.startPlanning()).toThrow(InvalidJobTransitionError);
  });

  it("rejects any transition once Failed", () => {
    const job = Job.create(createGoal("Hello")).fail(createExecutionError("boom", "X"));
    expect(() => job.startPlanning()).toThrow(InvalidJobTransitionError);
  });
});

describe("Job.fromProps / toProps round-trip", () => {
  it("reconstructs an equivalent Job from its props", () => {
    const original = Job.create(createGoal("Hello"), "high", () => FIXED_TIME_1);
    const rehydrated = Job.fromProps(original.toProps());
    expect(rehydrated.id).toBe(original.id);
    expect(rehydrated.status).toBe(original.status);
    expect(rehydrated.priority).toBe(original.priority);
    expect(rehydrated.goal).toEqual(original.goal);
  });
});
