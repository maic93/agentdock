# Architecture

This directory is the canonical source of truth for AgentDock's system
architecture and repository foundation. Two decisions have been formally
approved and everything in this repository is built to be consistent with
them:

1. **[001 — System Architecture](./001-system-architecture.md)** — what
   AgentDock is (an AI orchestration platform, not a chat app), its module
   boundaries (kernel / foundation / providers / shared), its AI-routing and
   local-first philosophy, and its plugin model.
2. **[002 — Repository Foundation](./002-repository-foundation.md)** — the
   monorepo tooling choice (pnpm workspaces + Nx), the mechanically enforced
   dependency-boundary rules between those modules, naming standards, and
   governance model.

## Repository foundation

The tooling and files in this repository (workspace config, lint rules,
CI, contribution scaffolding) are the direct implementation of document 002.
If you're wondering why a rule exists — e.g. why plugins can't import kernel
internals, or why packages version independently — the answer is in that
document, not restated here.

## Changing an architectural decision

Architecture and repository-foundation decisions are not changed by editing
these files directly. Propose a change via an RFC
([docs/rfcs/0000-template.md](../rfcs/0000-template.md)); once accepted, the
decision is recorded as a new ADR ([docs/adr/](../adr/README.md)) and _then_
these documents are updated to reflect the new approved state.
