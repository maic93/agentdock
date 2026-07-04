import { describe, expect, it } from "vitest";
import { createExecutionId } from "./execution-id.js";

describe("createExecutionId", () => {
  it("generates a string id", () => {
    const id = createExecutionId();
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
  });

  it("generates unique ids across calls", () => {
    const first = createExecutionId();
    const second = createExecutionId();
    expect(first).not.toBe(second);
  });
});
