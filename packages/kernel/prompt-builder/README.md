# @agentdock/kernel-prompt-builder

**Purpose:** Composes a finished, provider-ready prompt from a
data-driven `PromptTemplate` plus whatever runtime context is available —
so no prompt string ever appears inline in the Router or Executor. See
[docs/architecture/006-provider-routing.md](../../../docs/architecture/006-provider-routing.md).

**Public API (implemented):** `PromptBuilder.build(input): BuiltPrompt`
— composes `system → developer → context → memory → tools → user →
output-format` sections, selecting a template by `intent.category` (or an
explicit override). `renderTemplateText` validates every `{{variable}}` a
template references is supplied, throwing `MissingPromptVariableError`
otherwise. `DEFAULT_TEMPLATES` ships seven templates (conversation,
coding, summarization, image-generation, planning, research, translation)
— only `conversation` is reachable through the live pipeline today, since
that's the only intent category AgentDock currently classifies goals into.

**May depend on:** `@agentdock/provider-abstraction`, `@agentdock/shared-types`.

**Must never depend on:** `apps/*`, `plugins/*`.

**Status:** Implemented. Integrated into `@agentdock/kernel-workflow-engine`'s
`Executor` as an optional, defaulted constructor parameter (additive —
every existing caller is unaffected).
