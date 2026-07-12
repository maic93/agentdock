import { MissingPromptVariableError } from "./errors.js";

/**
 * A single named section of a prompt. `kind` describes its role, matching
 * the section types this milestone requires prompts to compose from —
 * see docs/architecture/006-provider-routing.md for why sections are
 * modeled explicitly rather than concatenated into one opaque string
 * before this point.
 */
export type PromptSectionKind =
  | "system"
  | "developer"
  | "user"
  | "context"
  | "memory"
  | "tools"
  | "output-format";

export interface PromptSection {
  readonly kind: PromptSectionKind;
  readonly content: string;
}

/**
 * A reusable, data-driven prompt definition. Every field may contain
 * `{{variableName}}` placeholders, rendered by {@link renderTemplateText}.
 * Templates are plain data — registering a new one (see
 * templates/default-templates.ts) never requires touching the Router or
 * Executor, which is the point: "no hardcoded prompt strings inside router
 * or executor," per this milestone's requirement.
 */
export interface PromptTemplate {
  readonly id: string;
  readonly displayName: string;
  readonly system: string;
  readonly developer?: string;
  /** The user-facing prompt text. Typically just `{{goal}}`, but templates may add framing text around it. */
  readonly userPrompt: string;
  readonly outputFormat?: string;
}

/**
 * Renders `text`, substituting every `{{name}}` placeholder with
 * `variables[name]`. Throws {@link MissingPromptVariableError} — a typed
 * error, not a silently-empty substitution — if `text` references a
 * variable that isn't present in `variables`, per this milestone's
 * "Missing required variables must produce typed errors" requirement.
 * There is no separate schema declaring which variables a template
 * "requires": whatever placeholders actually appear in its text *are* the
 * requirement, which is what keeps the template itself the single source
 * of truth instead of two things (the text and a schema) that could drift
 * apart.
 */
export function renderTemplateText(
  text: string,
  variables: Readonly<Record<string, string>>,
  templateId: string,
): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_match, name: string) => {
    if (!Object.prototype.hasOwnProperty.call(variables, name)) {
      throw new MissingPromptVariableError(name, templateId);
    }
    return variables[name] as string;
  });
}
