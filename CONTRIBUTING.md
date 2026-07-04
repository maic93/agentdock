# Contributing to AgentDock

Thank you for considering a contribution. This document covers the practical
mechanics of contributing. For _why_ the repository is shaped the way it is,
read [docs/architecture](./docs/architecture/README.md) first — most "why
can't I just do X" questions are answered there.

## Before you write code

- **Small fix or bug?** Just open a PR.
- **New feature within an existing package?** Open an issue first so the
  relevant area maintainer (see [CODEOWNERS](./CODEOWNERS)) can weigh in
  before you invest time.
- **New public API, new package, or a change to a dependency rule?** This
  requires an RFC. Copy [docs/rfcs/0000-template.md](./docs/rfcs/0000-template.md)
  into a new file under `docs/rfcs/` and open a PR with just the RFC for
  discussion before implementing anything.

## Setup

```bash
git clone https://github.com/<your-fork>/agentdock.git
cd agentdock
cp .env.example .env
pnpm install
```

Requirements: Node.js as pinned in [.nvmrc](./.nvmrc) (use `nvm use`), pnpm
9+, Docker (for local service dependencies once they exist).

**Node.js version policy:** this repository tracks the current Active LTS
line (see [ADR 0002](./docs/adr/0002-node-version-policy.md) for why). The
version in `.nvmrc` and `.node-version` must always match exactly, and CI
(`.github/workflows/ci.yml`) and the dev container
(`.devcontainer/devcontainer.json`) must always match the same major
version. `scripts/setup/bootstrap.sh` checks this for you locally and fails
loudly on a mismatch rather than letting it surface later as a confusing
`pnpm install` error.

## Development loop

```bash
pnpm nx serve <project>          # run a project with hot reload
pnpm nx test <project>           # unit/integration tests for one project
pnpm nx affected --target=test   # only run tests impacted by your change
pnpm lint                        # repo-wide lint, including dependency-boundary checks
pnpm typecheck                   # repo-wide strict TypeScript check
pnpm format                      # apply Prettier formatting
```

`pnpm nx graph` opens a visual dependency graph of the workspace — useful
for understanding what depends on what before you add a new import.

## Commit messages

This repository uses [Conventional Commits](https://www.conventionalcommits.org/),
enforced by commitlint on every commit via a Husky hook:

```
<type>(<optional scope>): <description>

feat(kernel-planner): support re-planning on task failure
fix(foundation-db): correct connection pool leak on shutdown
docs(readme): clarify quickstart steps
```

Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`,
`build`, `ci`, `chore`, `revert`. A `BREAKING CHANGE:` footer is required for
any breaking change to a public package API.

## Adding a changeset

Any change to a publishable package (anything under `packages/` or
`plugins/`) needs a changeset describing the version bump and what changed:

```bash
pnpm changeset
```

This opens an interactive prompt; the resulting file goes in `.changeset/`
and is committed as part of your PR. See [.changeset/README.md](./.changeset/README.md)
for why this project uses Changesets rather than a single repo-wide version.

## Pull requests

- Fill out the PR template completely, including the testing notes section —
  "how did you verify this" is not optional.
- Keep PRs scoped to one logical change. A PR that mixes an unrelated
  refactor with a feature is harder to review and will likely be asked to
  split.
- CI must pass: lint (including dependency-boundary rules), typecheck,
  affected tests, and a changeset-presence check for publishable packages.
- At least one reviewer from the relevant `CODEOWNERS` entry must approve.

## Code style

The linter and Prettier config are the source of truth, not this document —
if you disagree with a formatting rule, propose a change to
[eslint.config.js](./eslint.config.js) or [.prettierrc.json](./.prettierrc.json)
via RFC rather than working around it locally.

## Building a plugin

See the [Plugin Development Guide](./docs/plugin-guide/README.md) and start
from [templates/plugin-template](./templates/plugin-template/README.md).
Most plugins should live in their own repository, not in `plugins/` — that
directory holds first-party reference plugins only.

## Where things live

If you're unsure where a new file belongs, read the `README.md` in the
directory you're considering — every directory in this repository explains
its own purpose and boundaries.
