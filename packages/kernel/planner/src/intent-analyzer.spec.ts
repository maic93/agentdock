import { describe, expect, it } from "vitest";
import { createGoal } from "@agentdock/shared-types";
import {
  CompositeIntentAnalyzer,
  KeywordIntentAnalyzer,
  type IntentAnalyzer,
} from "./intent-analyzer.js";

describe("KeywordIntentAnalyzer", () => {
  const analyzer = new KeywordIntentAnalyzer();

  it('classifies "Hello" as conversation', () => {
    const result = analyzer.analyze(createGoal("Hello"));
    expect(result.intent.category).toBe("conversation");
  });

  it("returns a confidence score for a matched keyword", () => {
    const result = analyzer.analyze(createGoal("Hello"));
    expect(result.intent.confidence).toBeGreaterThan(0);
    expect(result.intent.confidence).toBeLessThanOrEqual(1);
  });

  it("includes reasoning that names the matched keyword", () => {
    const result = analyzer.analyze(createGoal("Hello"));
    expect(result.intent.reasoning).toContain("hello");
  });

  it("is case-insensitive", () => {
    const result = analyzer.analyze(createGoal("HELLO there"));
    expect(result.intent.category).toBe("conversation");
  });

  it("raises confidence when multiple keywords match", () => {
    const single = analyzer.analyze(createGoal("Hello"));
    const multiple = analyzer.analyze(createGoal("Hello, thank you"));
    expect(multiple.intent.confidence).toBeGreaterThan(single.intent.confidence);
  });

  it('classifies unrecognized text as "unknown" with zero confidence', () => {
    const result = analyzer.analyze(createGoal("Build me a web application"));
    expect(result.intent.category).toBe("unknown");
    expect(result.intent.confidence).toBe(0);
  });
});

describe("CompositeIntentAnalyzer", () => {
  it("returns the first analyzer's result if it meets the confidence threshold", () => {
    const confident: IntentAnalyzer = {
      name: "confident",
      analyze: () => ({ intent: { category: "conversation", confidence: 0.9, reasoning: "stub" } }),
    };
    const unreached: IntentAnalyzer = {
      name: "unreached",
      analyze: () => {
        throw new Error("should not be called");
      },
    };

    const composite = new CompositeIntentAnalyzer([confident, unreached]);
    const result = composite.analyze(createGoal("Hello"));
    expect(result.intent.category).toBe("conversation");
  });

  it("falls through to the next analyzer if the first is not confident enough", () => {
    const unconfident: IntentAnalyzer = {
      name: "unconfident",
      analyze: () => ({ intent: { category: "unknown", confidence: 0.1, reasoning: "stub" } }),
    };
    const confident: IntentAnalyzer = {
      name: "confident",
      analyze: () => ({ intent: { category: "conversation", confidence: 0.9, reasoning: "stub" } }),
    };

    const composite = new CompositeIntentAnalyzer([unconfident, confident]);
    const result = composite.analyze(createGoal("Hello"));
    expect(result.intent.category).toBe("conversation");
  });

  it("returns the most confident result if none meet the threshold", () => {
    const low: IntentAnalyzer = {
      name: "low",
      analyze: () => ({ intent: { category: "unknown", confidence: 0.1, reasoning: "low" } }),
    };
    const slightlyHigher: IntentAnalyzer = {
      name: "slightly-higher",
      analyze: () => ({ intent: { category: "unknown", confidence: 0.3, reasoning: "higher" } }),
    };

    const composite = new CompositeIntentAnalyzer([low, slightlyHigher], 0.5);
    const result = composite.analyze(createGoal("???"));
    expect(result.intent.reasoning).toBe("higher");
  });

  it("throws if constructed with no analyzers", () => {
    expect(() => new CompositeIntentAnalyzer([])).toThrow();
  });
});
