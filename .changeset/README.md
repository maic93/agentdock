# Changesets

This directory is managed by [Changesets](https://github.com/changesets/changesets).
Run `pnpm changeset` after making a change to a publishable package and
follow the prompts — it generates a markdown file here describing the change
and its semver impact, which is committed alongside your PR.

## Why Changesets (and not a single repo-wide version)

The approved repository foundation calls for **independent semantic
versioning per publishable package**, not one monorepo-wide version number —
a fix in `packages/kernel/planner` should not force a version bump in
`packages/foundation/scheduler` that never changed.

Changesets was chosen over the alternatives considered:

- **Lerna's `independent` mode** — capable of the same independent-versioning
  outcome, but Changesets' PR-based accumulation workflow (each PR
  contributes a small changeset file, later batched into a single "Version
  Packages" release PR) produces a much more reviewable changelog and
  version-bump history than Lerna's more implicit versioning inference.
- **Nx's built-in release versioning alone** — Nx does support conventional-
  commit-driven versioning (and this workspace's `nx.json` does enable
  `conventionalCommits: true` as a complementary signal), but Changesets
  gives contributors an explicit, human-authored description of *what
  changed and why it matters to consumers*, rather than relying solely on
  commit message parsing to infer a changelog entry. For a project aiming
  for a large, distributed contributor base, an explicit changeset is a
  better artifact for less experienced contributors to get right than a
  perfectly-formatted commit message.
- **Manual version bumps** — rejected outright; not viable at the target
  scale of 1000+ contributors and 500+ plugins.

Nx and Changesets are complementary here, not competing: Nx's `affected`
graph determines *what* needs to be built/tested/released, and Changesets
determines *what version number* a released package gets and why.
