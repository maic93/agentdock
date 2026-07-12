/** Thrown when rendering a template whose text references a variable not present in the supplied variables map. */
export class MissingPromptVariableError extends Error {
  constructor(
    public readonly variableName: string,
    public readonly templateId: string,
  ) {
    super(
      `Template "${templateId}" requires variable "{{${variableName}}}", which was not provided.`,
    );
    this.name = "MissingPromptVariableError";
  }
}

/** Thrown when asked to build a prompt from a template id that isn't registered. */
export class UnknownPromptTemplateError extends Error {
  constructor(public readonly templateId: string) {
    super(`No prompt template is registered with id "${templateId}".`);
    this.name = "UnknownPromptTemplateError";
  }
}
