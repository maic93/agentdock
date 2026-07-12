import type {
  Capability,
  Execution,
  Goal,
  Intent,
  IntentCategory,
  Job,
} from "@agentdock/shared-types";
import type { ProviderMetadata } from "@agentdock/provider-abstraction";
import { UnknownPromptTemplateError } from "./errors.js";
import { type PromptSection, type PromptTemplate, renderTemplateText } from "./prompt-template.js";
import { DEFAULT_TEMPLATES } from "./templates/default-templates.js";

/**
 * Everything the PromptBuilder needs to produce a finished prompt.
 *
 * `execution` and `job` are accepted now — per this milestone's
 * requirement that the builder "receives" both — even though nothing here
 * yet derives a template variable or section from either one beyond what
 * `goal`/`intent`/`providerMetadata` already provide. This mirrors an
 * established pattern in this codebase (`ExecutionNode.estimatedCostUsd`,
 * `JobPriority`): the data is threaded through now specifically so that
 * per-execution or per-job prompt customization (e.g. scoping memory to a
 * Job, or adjusting verbosity by `JobPriority`) is an additive change to
 * `build`'s body later, not a signature change to every caller.
 *
 * `job` is optional because the Executor (the only caller today — see
 * packages/kernel/workflow-engine) only has an `Execution`, not the full
 * `Job` that owns it; it doesn't hold a `JobRepository` dependency to look
 * one up.
 */
export interface PromptBuildInput {
  readonly goal: Goal;
  readonly intent: Intent;
  readonly capability: Capability;
  readonly execution: Execution;
  readonly job?: Job;
  readonly providerMetadata: ProviderMetadata;
  /** Overrides automatic template selection (by `intent.category`). */
  readonly templateId?: string;
  /** Extra template variables beyond the ones derived automatically (`goal`, `provider`, `date`) — this is where a caller supplies `language` for the coding/translation templates, for instance. */
  readonly variables?: Readonly<Record<string, string>>;
  /** Freeform context to inject as its own section (e.g. retrieved documents). Nothing in AgentDock produces this yet — no knowledge base exists — so it's simply omitted when absent, never faked. */
  readonly context?: string;
  /** Prior conversation/session memory to inject as its own section. Nothing produces this yet — no memory module exists. */
  readonly memory?: string;
  /** Available tool instructions to inject as their own section. Nothing produces this yet — no tool registry integration exists. */
  readonly tools?: string;
}

export interface BuiltPrompt {
  readonly templateId: string;
  readonly sections: readonly PromptSection[];
  /** Every section's content, joined in composition order — what's actually sent to the provider. */
  readonly text: string;
  readonly buildDurationMs: number;
}

/**
 * Maps an {@link IntentCategory} to the template used for it, when no
 * explicit `templateId` is given. Only "conversation" is populated because
 * only "conversation" is an intent AgentDock's Intent Analyzer currently
 * produces (see packages/kernel/planner) — the other six default templates
 * exist and are individually tested, but nothing routes to them
 * automatically yet. Adding a row here is the entire integration cost once
 * a second intent category exists.
 */
const INTENT_TEMPLATE_MAP: Readonly<Partial<Record<IntentCategory, string>>> = {
  conversation: "conversation",
};

const FALLBACK_TEMPLATE_ID = "conversation";

/**
 * Builds a finished, provider-ready prompt from a Goal/Intent/Capability
 * and whatever runtime context is available, using a data-driven
 * {@link PromptTemplate} rather than any string built inline in the
 * Router or Executor — see docs/architecture/006-provider-routing.md for
 * why that separation matters.
 */
export class PromptBuilder {
  private readonly templatesById: ReadonlyMap<string, PromptTemplate>;

  constructor(templates: readonly PromptTemplate[] = DEFAULT_TEMPLATES) {
    this.templatesById = new Map(templates.map((template) => [template.id, template]));
  }

  /** The template registered under `id`, or `undefined` if none is. */
  getTemplate(id: string): PromptTemplate | undefined {
    return this.templatesById.get(id);
  }

  /** Every registered template. */
  listTemplates(): readonly PromptTemplate[] {
    return Array.from(this.templatesById.values());
  }

  build(input: PromptBuildInput): BuiltPrompt {
    const startedAt = Date.now();
    const templateId =
      input.templateId ?? INTENT_TEMPLATE_MAP[input.intent.category] ?? FALLBACK_TEMPLATE_ID;
    const template = this.templatesById.get(templateId);
    if (!template) {
      throw new UnknownPromptTemplateError(templateId);
    }

    const variables: Record<string, string> = {
      goal: input.goal.text,
      provider: input.providerMetadata.displayName,
      date: new Date().toISOString().slice(0, 10),
      ...input.variables,
    };

    const sections: PromptSection[] = [
      { kind: "system", content: renderTemplateText(template.system, variables, template.id) },
    ];

    if (template.developer) {
      sections.push({
        kind: "developer",
        content: renderTemplateText(template.developer, variables, template.id),
      });
    }
    if (input.context) {
      sections.push({ kind: "context", content: input.context });
    }
    if (input.memory) {
      sections.push({ kind: "memory", content: input.memory });
    }
    if (input.tools) {
      sections.push({ kind: "tools", content: input.tools });
    }

    sections.push({
      kind: "user",
      content: renderTemplateText(template.userPrompt, variables, template.id),
    });

    if (template.outputFormat) {
      sections.push({
        kind: "output-format",
        content: renderTemplateText(template.outputFormat, variables, template.id),
      });
    }

    const text = sections.map((section) => section.content).join("\n\n");
    return {
      templateId: template.id,
      sections,
      text,
      buildDurationMs: Date.now() - startedAt,
    };
  }
}
