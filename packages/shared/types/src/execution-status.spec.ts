import { describe, expect, it } from "vitest";
import {
  assertTransition,
  canTransition,
  ExecutionStatus,
  isTerminalStatus,
} from "./execution-status.js";
import { InvalidExecutionTransitionError } from "./errors.js";

describe("canTransition", () => {
  it("allows every forward step in the lifecycle", () => {
    expect(canTransition(ExecutionStatus.Created, ExecutionStatus.Analyzing)).toBe(true);
    expect(canTransition(ExecutionStatus.Analyzing, ExecutionStatus.Planning)).toBe(true);
    expect(canTransition(ExecutionStatus.Planning, ExecutionStatus.Routing)).toBe(true);
    expect(canTransition(ExecutionStatus.Routing, ExecutionStatus.Executing)).toBe(true);
    expect(canTransition(ExecutionStatus.Executing, ExecutionStatus.Completed)).toBe(true);
  });

  it("allows failing from every non-terminal status", () => {
    expect(canTransition(ExecutionStatus.Created, ExecutionStatus.Failed)).toBe(true);
    expect(canTransition(ExecutionStatus.Analyzing, ExecutionStatus.Failed)).toBe(true);
    expect(canTransition(ExecutionStatus.Planning, ExecutionStatus.Failed)).toBe(true);
    expect(canTransition(ExecutionStatus.Routing, ExecutionStatus.Failed)).toBe(true);
    expect(canTransition(ExecutionStatus.Executing, ExecutionStatus.Failed)).toBe(true);
  });

  it("disallows skipping stages", () => {
    expect(canTransition(ExecutionStatus.Created, ExecutionStatus.Planning)).toBe(false);
    expect(canTransition(ExecutionStatus.Created, ExecutionStatus.Executing)).toBe(false);
    expect(canTransition(ExecutionStatus.Analyzing, ExecutionStatus.Routing)).toBe(false);
  });

  it("disallows moving backward", () => {
    expect(canTransition(ExecutionStatus.Planning, ExecutionStatus.Analyzing)).toBe(false);
    expect(canTransition(ExecutionStatus.Executing, ExecutionStatus.Created)).toBe(false);
  });

  it("disallows any transition out of a terminal status", () => {
    expect(canTransition(ExecutionStatus.Completed, ExecutionStatus.Executing)).toBe(false);
    expect(canTransition(ExecutionStatus.Completed, ExecutionStatus.Failed)).toBe(false);
    expect(canTransition(ExecutionStatus.Failed, ExecutionStatus.Analyzing)).toBe(false);
  });
});

describe("assertTransition", () => {
  it("does not throw for a legal transition", () => {
    expect(() =>
      assertTransition(ExecutionStatus.Created, ExecutionStatus.Analyzing),
    ).not.toThrow();
  });

  it("throws InvalidExecutionTransitionError for an illegal transition", () => {
    expect(() => assertTransition(ExecutionStatus.Created, ExecutionStatus.Executing)).toThrow(
      InvalidExecutionTransitionError,
    );
  });

  it("includes the offending statuses on the thrown error", () => {
    try {
      assertTransition(ExecutionStatus.Completed, ExecutionStatus.Executing);
      expect.unreachable("assertTransition should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidExecutionTransitionError);
      const transitionError = error as InvalidExecutionTransitionError;
      expect(transitionError.from).toBe(ExecutionStatus.Completed);
      expect(transitionError.to).toBe(ExecutionStatus.Executing);
    }
  });
});

describe("isTerminalStatus", () => {
  it("treats Completed and Failed as terminal", () => {
    expect(isTerminalStatus(ExecutionStatus.Completed)).toBe(true);
    expect(isTerminalStatus(ExecutionStatus.Failed)).toBe(true);
  });

  it("treats every other status as non-terminal", () => {
    expect(isTerminalStatus(ExecutionStatus.Created)).toBe(false);
    expect(isTerminalStatus(ExecutionStatus.Analyzing)).toBe(false);
    expect(isTerminalStatus(ExecutionStatus.Planning)).toBe(false);
    expect(isTerminalStatus(ExecutionStatus.Routing)).toBe(false);
    expect(isTerminalStatus(ExecutionStatus.Executing)).toBe(false);
  });
});
