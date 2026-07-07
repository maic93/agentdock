import { describe, expect, it } from "vitest";
import { createJobId } from "./job-id.js";

describe("createJobId", () => {
  it("generates a string id", () => {
    const id = createJobId();
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
  });

  it("generates unique ids across calls", () => {
    expect(createJobId()).not.toBe(createJobId());
  });
});
