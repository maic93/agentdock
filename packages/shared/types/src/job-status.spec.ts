import { describe, expect, it } from "vitest";
import {
  assertJobTransition,
  canTransitionJob,
  isTerminalJobStatus,
  JobStatus,
} from "./job-status.js";
import { InvalidJobTransitionError } from "./errors.js";

describe("canTransitionJob", () => {
  it("allows every forward step in the lifecycle", () => {
    expect(canTransitionJob(JobStatus.Created, JobStatus.Planning)).toBe(true);
    expect(canTransitionJob(JobStatus.Planning, JobStatus.Executing)).toBe(true);
    expect(canTransitionJob(JobStatus.Executing, JobStatus.Completed)).toBe(true);
  });

  it("allows failing from every non-terminal status", () => {
    expect(canTransitionJob(JobStatus.Created, JobStatus.Failed)).toBe(true);
    expect(canTransitionJob(JobStatus.Planning, JobStatus.Failed)).toBe(true);
    expect(canTransitionJob(JobStatus.Executing, JobStatus.Failed)).toBe(true);
  });

  it("disallows skipping stages", () => {
    expect(canTransitionJob(JobStatus.Created, JobStatus.Executing)).toBe(false);
    expect(canTransitionJob(JobStatus.Created, JobStatus.Completed)).toBe(false);
  });

  it("disallows moving backward", () => {
    expect(canTransitionJob(JobStatus.Executing, JobStatus.Planning)).toBe(false);
    expect(canTransitionJob(JobStatus.Planning, JobStatus.Created)).toBe(false);
  });

  it("disallows any transition out of a terminal status", () => {
    expect(canTransitionJob(JobStatus.Completed, JobStatus.Executing)).toBe(false);
    expect(canTransitionJob(JobStatus.Failed, JobStatus.Planning)).toBe(false);
  });
});

describe("assertJobTransition", () => {
  it("does not throw for a legal transition", () => {
    expect(() => assertJobTransition(JobStatus.Created, JobStatus.Planning)).not.toThrow();
  });

  it("throws InvalidJobTransitionError for an illegal transition, with the offending statuses attached", () => {
    try {
      assertJobTransition(JobStatus.Completed, JobStatus.Executing);
      expect.unreachable("assertJobTransition should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidJobTransitionError);
      const transitionError = error as InvalidJobTransitionError;
      expect(transitionError.from).toBe(JobStatus.Completed);
      expect(transitionError.to).toBe(JobStatus.Executing);
    }
  });
});

describe("isTerminalJobStatus", () => {
  it("treats Completed and Failed as terminal", () => {
    expect(isTerminalJobStatus(JobStatus.Completed)).toBe(true);
    expect(isTerminalJobStatus(JobStatus.Failed)).toBe(true);
  });

  it("treats every other status as non-terminal", () => {
    expect(isTerminalJobStatus(JobStatus.Created)).toBe(false);
    expect(isTerminalJobStatus(JobStatus.Planning)).toBe(false);
    expect(isTerminalJobStatus(JobStatus.Executing)).toBe(false);
  });
});
