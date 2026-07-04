# @agentdock/shared-sdk

**Purpose:** The plugin-authoring SDK: manifest schema, lifecycle hooks,
sandboxing helpers. This is the primary public contract for third-party
plugin developers, and needs the strictest backward-compatibility
discipline of any package in the repository.

**Public API:** everything required for a plugin author to build, test, and
package a plugin — intentionally the widest public surface in the
workspace.

**May depend on:** `@agentdock/shared-types`, `@agentdock/provider-abstraction`.

**Must never depend on:** any `packages/kernel/*` or `packages/foundation/*`
internals — the SDK must not leak core internals to plugin authors, since
doing so would make every internal refactor a potential breaking change for
the entire plugin ecosystem.

**Who may import it:** all `plugins/*`, all external plugins.

**Status:** Not implemented.
