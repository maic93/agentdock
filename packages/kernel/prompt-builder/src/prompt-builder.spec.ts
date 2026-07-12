import { describe, expect, it } from "vitest";
import { createGoal, Execution } from "@agentdock/shared-types";
import { createProviderId, type ProviderMetadata } from "@agentdock/provider-abstraction";
import { UnknownPromptTemplateError } from "./errors.js";
import { PromptBuilder, type PromptBuildInput } from "./prompt-builder.js";

const PROVIDER_METADATA: ProviderMetadata = {
  id: createProviderId("ollama"),
  displayName: "Ollama",
  providerType: "local",
  version: "0.1.0",
  capabilities: ["text-generation"],
  supportsStreaming: false,
  supportsVision: false,
  supportsTools: false,
  supportsJSON: false,
  supportsFunctionCalling: false,
  contextWindow: 4096,
  maxOutputTokens: 2048,
  priority: 100,
  costTier: "free",
  latencyTier: "medium",
};

function baseInput(overrides: Partial<PromptBuildInput> = {}): PromptBuildInput {
  const goal = createGoal("Hello");
  return {
    goal,
    intent: { category: "conversation", confidence: 0.9, reasoning: "test" },
    capability: "text-generation",
    execution: Execution.create(goal),
    providerMetadata: PROVIDER_METADATA,
    ...overrides,
  };
}

describe("PromptBuilder.build", () => {
  it('selects the "conversation" template for a conversation intent', () => {
    const builder = new PromptBuilder();
    const result = builder.build(baseInput());
    expect(result.templateId).toBe("conversation");
  });

  it("includes a system section and a user section by default", () => {
    const builder = new PromptBuilder();
    const result = builder.build(baseInput());
    expect(result.sections.map((section) => section.kind)).toEqual(["system", "user"]);
  });

  it("substitutes {{goal}} into the user section", () => {
    const builder = new PromptBuilder();
    const result = builder.build(baseInput());
    const userSection = result.sections.find((section) => section.kind === "user");
    expect(userSection?.content).toBe("Hello");
  });

  it("substitutes {{provider}} from providerMetadata.displayName", () => {
    const builder = new PromptBuilder([
      {
        id: "conversation",
        displayName: "Conversation",
        system: "Provider: {{provider}}",
        userPrompt: "{{goal}}",
      },
    ]);
    const result = builder.build(baseInput());
    const systemSection = result.sections.find((section) => section.kind === "system");
    expect(systemSection?.content).toBe("Provider: Ollama");
  });

  it("joins every section's content into `text`, separated by blank lines", () => {
    const builder = new PromptBuilder();
    const result = builder.build(baseInput());
    expect(result.text).toContain("Hello");
    expect(result.text.split("\n\n").length).toBe(result.sections.length);
  });

  it("reports a non-negative buildDurationMs", () => {
    const builder = new PromptBuilder();
    const result = builder.build(baseInput());
    expect(result.buildDurationMs).toBeGreaterThanOrEqual(0);
  });

  it("respects an explicit templateId override", () => {
    const builder = new PromptBuilder();
    const result = builder.build(
      baseInput({ templateId: "coding", variables: { language: "TypeScript" } }),
    );
    expect(result.templateId).toBe("coding");
  });

  it("throws UnknownPromptTemplateError for an unregistered templateId", () => {
    const builder = new PromptBuilder();
    expect(() => builder.build(baseInput({ templateId: "does-not-exist" }))).toThrow(
      UnknownPromptTemplateError,
    );
  });

  it("adds a context section only when context is provided", () => {
    const builder = new PromptBuilder();
    const without = builder.build(baseInput());
    expect(without.sections.some((section) => section.kind === "context")).toBe(false);

    const withContext = builder.build(baseInput({ context: "some retrieved text" }));
    const contextSection = withContext.sections.find((section) => section.kind === "context");
    expect(contextSection?.content).toBe("some retrieved text");
  });

  it("adds memory and tools sections only when provided, in context/memory/tools order before the user section", () => {
    const builder = new PromptBuilder();
    const result = builder.build(
      baseInput({ context: "ctx", memory: "mem", tools: "tool instructions" }),
    );
    const kinds = result.sections.map((section) => section.kind);
    expect(kinds).toEqual(["system", "context", "memory", "tools", "user"]);
  });

  it("falls back to the conversation template for an unmapped intent category", () => {
    const builder = new PromptBuilder();
    const result = builder.build(
      baseInput({ intent: { category: "unknown", confidence: 0, reasoning: "test" } }),
    );
    expect(result.templateId).toBe("conversation");
  });
});
