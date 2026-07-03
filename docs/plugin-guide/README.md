# Plugin Development Guide

This guide will cover building, testing, and publishing an AgentDock plugin
against `packages/shared/sdk` and `packages/providers/provider-abstraction`.

**Current status:** the plugin SDK and provider abstraction contracts
referenced by this guide are not implemented yet in this repository (see
`docs/architecture/001-system-architecture.md`, Section 17, for the approved
plugin philosophy). This guide will be written alongside the SDK's first
implementation so that it documents a real, working interface rather than a
speculative one — writing plugin documentation against an interface that
doesn't exist yet would produce docs that mislead the first plugin authors.

## What will live here once the SDK exists

- The plugin manifest schema and lifecycle hooks.
- How sandboxing and permission declarations work from a plugin author's
  perspective.
- How to scaffold a plugin from `templates/plugin-template`.
- How to run the contract test suite locally (`agentdock plugin test`) before
  submitting for verification.
- The plugin verification process (see
  `docs/architecture/002-repository-foundation.md`, Section 11).

## In the meantime

If you're interested in contributing to the plugin system itself (the SDK,
the sandboxing model, the registry), see
[CONTRIBUTING.md](../../CONTRIBUTING.md) and open an RFC — that's exactly
the kind of foundational work this repository is currently focused on.
