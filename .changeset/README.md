# Changesets

This directory is managed by [Changesets](https://github.com/changesets/changesets).
Run `pnpm changeset` after making a change to a publishable package and
follow the prompts — it generates a markdown file here describing the change
and its semver impact, which is committed alongside your PR.

> **Note:** `config.json`'s `ignore` list (for unpublished apps like
> `@agentdock/web`/`@agentdock/api`/`@agentdock/cli`) is currently empty
> because Changesets validates that every entry in `ignore` corresponds to a
> real package in the workspace — since those apps don't exist yet, listing
> them fails validation outright (this previously broke `changeset status`
> in CI). Add each app back to `ignore` in the same PR that creates it.

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
  gives contributors an explicit, human-authored description of _what
  changed and why it matters to consumers_, rather than relying solely on
  commit message parsing to infer a changelog entry. For a project aiming
  for a large, distributed contributor base, an explicit changeset is a
  better artifact for less experienced contributors to get right than a
  perfectly-formatted commit message.
- **Manual version bumps** — rejected outright; not viable at the target
  scale of 1000+ contributors and 500+ plugins.

Nx and Changesets are complementary here, not competing: Nx's `affected`
graph determines _what_ needs to be built/tested/released, and Changesets
determines _what version number_ a released package gets and why.
