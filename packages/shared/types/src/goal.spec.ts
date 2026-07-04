import { describe, expect, it } from "vitest";
import { createGoal } from "./goal.js";
import { InvalidGoalError } from "./errors.js";

describe("createGoal", () => {
  it("creates a Goal from non-empty text", () => {
    const goal = createGoal("Hello");
    expect(goal.text).toBe("Hello");
  });

  it("trims surrounding whitespace", () => {
    const goal = createGoal("  Hello  ");
    expect(goal.text).toBe("Hello");
  });

  it("rejects empty text", () => {
    expect(() => createGoal("")).toThrow(InvalidGoalError);
  });

  it("rejects text that is only whitespace", () => {
    expect(() => createGoal("   ")).toThrow(InvalidGoalError);
  });
});
