import { describe, expect, it } from "vitest";
import { renderTemplateText } from "../prompt-template.js";
import { DEFAULT_TEMPLATES } from "./default-templates.js";

const REQUIRED_TEMPLATE_IDS = [
  "conversation",
  "coding",
  "summarization",
  "image-generation",
  "planning",
  "research",
  "translation",
];

describe("DEFAULT_TEMPLATES", () => {
  it("includes every required template id, exactly once each", () => {
    const ids = DEFAULT_TEMPLATES.map((template) => template.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const requiredId of REQUIRED_TEMPLATE_IDS) {
      expect(ids).toContain(requiredId);
    }
  });

  it("has a non-empty system section for every template", () => {
    for (const template of DEFAULT_TEMPLATES) {
      expect(template.system.trim().length).toBeGreaterThan(0);
    }
  });

  it.each(DEFAULT_TEMPLATES.map((template) => [template.id, template] as const))(
    'renders "%s" without throwing, given every variable it references',
    (_id, template) => {
      const variables = {
        goal: "test goal",
        language: "TypeScript",
        context: "test context",
        date: "2026-07-10",
      };
      expect(() => renderTemplateText(template.system, variables, template.id)).not.toThrow();
      if (template.developer) {
        expect(() => renderTemplateText(template.developer!, variables, template.id)).not.toThrow();
      }
      expect(() => renderTemplateText(template.userPrompt, variables, template.id)).not.toThrow();
      if (template.outputFormat) {
        expect(() =>
          renderTemplateText(template.outputFormat!, variables, template.id),
        ).not.toThrow();
      }
    },
  );

  it('the "coding" template requires a language variable', () => {
    const coding = DEFAULT_TEMPLATES.find((template) => template.id === "coding");
    expect(coding).toBeDefined();
    expect(() => renderTemplateText(coding!.system, { goal: "x" }, "coding")).toThrow();
  });
});
