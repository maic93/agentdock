# @agentdock/kernel-prompt-builder

**Purpose:** Assemble model-specific prompts from task context. Decouples
"what context is needed" from "how to phrase it for a specific model."

**Public API (once implemented):** `buildPrompt(task, modelHandle, context) -> Prompt`.

**May depend on:** `@agentdock/shared-types`, `@agentdock/foundation-memory`
(read-only), `@agentdock/foundation-knowledge-base` (read-only).

**Must never depend on:** `apps/*`, `@agentdock/foundation-db` directly
(must go through the memory/knowledge-base service interfaces).

**Must remain internal:** per-model prompt templates and heuristics.

**Status:** Not implemented.
