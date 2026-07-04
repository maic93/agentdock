import { describe, expect, it } from "vitest";
import type { Intent } from "@agentdock/shared-types";
import { StaticCapabilityResolver } from "./capability-resolver.js";

function intent(category: Intent["category"]): Intent {
  return { category, confidence: 1, reasoning: "test fixture" };
}

describe("StaticCapabilityResolver", () => {
  const resolver = new StaticCapabilityResolver();

  it("resolves conversation to text-generation", () => {
    expect(resolver.resolve(intent("conversation"))).toEqual(["text-generation"]);
  });

  it("resolves unknown to no capabilities", () => {
    expect(resolver.resolve(intent("unknown"))).toEqual([]);
  });
});
