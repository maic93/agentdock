# @agentdock/shared-ui-kit

**Purpose:** The design system consumed by `apps/web` — shared components,
tokens, and styling primitives.

**May depend on:** `@agentdock/shared-types`.

**Must never depend on:** `packages/kernel/*`, `packages/foundation/*`,
`packages/providers/*` — a UI kit having any orchestration-layer dependency
is a strong signal of a layering mistake.

**Who may import it:** `apps/web` only, for now.

**Status:** Not implemented.
