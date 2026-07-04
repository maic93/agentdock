# AgentDock

**AgentDock is a self-hostable, provider-agnostic AI orchestration platform.**
You describe a goal; AgentDock plans it, routes each step to the right model
or tool (local-first whenever that's sufficient), executes it, and hands you
the result — without you choosing a model, a search engine, or a provider.

This repository does not yet contain the orchestration engine itself. It
currently contains the **repository foundation**: the workspace tooling,
dependency-boundary enforcement, and contribution scaffolding that every
future feature will be built on top of. See
[docs/architecture](./docs/architecture/README.md) for why it's built this
way before deciding whether it's the right foundation to build on.

## Status

Pre-alpha. Architecture and repository foundation approved; core orchestration
modules (Planner, Workflow Engine, AI Router, and friends) are not yet
implemented. If you're looking for a working product today, this isn't it
yet — if you want to help build the foundation for one, you're in the right
place.

## Quickstart (run it locally)

```bash
git clone https://github.com/agentdock/agentdock.git
cd agentdock
cp .env.example .env
pnpm install
pnpm nx graph   # visualize the workspace dependency graph
```

There is no `docker compose up` step yet with real services behind it — the
Docker Compose file in `infra/docker/` currently only provisions the
development network and volumes future services will attach to. See
[infra/docker/README.md](./infra/docker/README.md) for what exists today.

## Repository layout

```
apps/            deployable interfaces (web, api, cli) — thin, no business logic
packages/kernel/      orchestration core (planner, workflow engine, ai router, ...)
packages/foundation/  infrastructure services (memory, db, auth, scheduler, ...)
packages/providers/   the provider abstraction contract (no concrete providers)
packages/shared/      cross-cutting types, the plugin SDK, shared utilities
plugins/         first-party REFERENCE plugins only — most plugins live outside this repo
tooling/         shared build/lint/tsconfig configuration, not runtime code
docs/            architecture records, ADRs, RFCs, plugin & contribution guides
examples/        runnable, deletable demonstrations
tests/e2e|contract/  cross-package tests that don't belong to a single package
infra/           deployment definitions (Docker Compose, Helm, Terraform)
```

Every one of these directories has its own `README.md` explaining what
belongs there and what doesn't — read the local one before adding a file if
you're unsure.

## Why the structure looks like this

Two design documents are the source of truth and are linked, not restated,
from this README:

- [Architecture](./docs/architecture/README.md) — what AgentDock is, its
  module boundaries, and its AI-routing/local-first philosophy.
- [Repository foundation](./docs/architecture/README.md#repository-foundation)
  — the monorepo tooling choice (pnpm + Nx), dependency rules, and why
  they're mechanically enforced rather than just documented.

## Contributing

Start with [CONTRIBUTING.md](./CONTRIBUTING.md). Good first issues are
labeled `good-first-issue`. Anything touching a public package API or a
dependency rule needs an RFC first — see
[docs/rfcs/0000-template.md](./docs/rfcs/0000-template.md).

## Security

Please do not open a public issue for security vulnerabilities. See
[SECURITY.md](./SECURITY.md) for the disclosure process.

## License

[MIT](./LICENSE) — see the license file for the full text.
