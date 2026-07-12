import { describe, expect, it } from "vitest";
import { renderTemplateText } from "./prompt-template.js";
import { MissingPromptVariableError } from "./errors.js";

describe("renderTemplateText", () => {
  it("substitutes a single variable", () => {
    expect(renderTemplateText("Hello, {{goal}}!", { goal: "world" }, "test")).toBe("Hello, world!");
  });

  it("substitutes multiple distinct variables", () => {
    const result = renderTemplateText(
      "{{greeting}}, {{name}}!",
      { greeting: "Hi", name: "Ada" },
      "test",
    );
    expect(result).toBe("Hi, Ada!");
  });

  it("substitutes the same variable used more than once", () => {
    const result = renderTemplateText("{{goal}} and again: {{goal}}", { goal: "x" }, "test");
    expect(result).toBe("x and again: x");
  });

  it("leaves text with no placeholders unchanged", () => {
    expect(renderTemplateText("no placeholders here", {}, "test")).toBe("no placeholders here");
  });

  it("throws MissingPromptVariableError for a referenced-but-absent variable", () => {
    expect(() => renderTemplateText("Hello, {{name}}!", {}, "test-template")).toThrow(
      MissingPromptVariableError,
    );
  });

  it("names the missing variable and the template on the thrown error", () => {
    try {
      renderTemplateText("{{missing}}", {}, "my-template");
      expect.unreachable("renderTemplateText should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(MissingPromptVariableError);
      const typed = error as MissingPromptVariableError;
      expect(typed.variableName).toBe("missing");
      expect(typed.templateId).toBe("my-template");
    }
  });

  it("does not substitute an empty-string variable value as if it were missing", () => {
    expect(renderTemplateText("[{{goal}}]", { goal: "" }, "test")).toBe("[]");
  });
});
