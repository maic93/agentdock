# @agentdock/foundation-knowledge-base

**Purpose:** Durable, explicitly curated or ingested domain knowledge,
queryable via retrieval (RAG-style) — long-lived, unlike `foundation-memory`.

**Public API (once implemented):** a `KnowledgeBase` service interface
(ingest, query).

**May depend on:** `@agentdock/shared-types`, `@agentdock/foundation-db`,
`@agentdock/foundation-config`.

**Must never depend on:** `packages/kernel/*`, `apps/*`, `plugins/*`.

**Status:** Not implemented.
