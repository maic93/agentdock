# Dependency update tooling: Dependabot, not Renovate

This isn't a full ADR (the decision is reversible at low cost and doesn't
affect public APIs or dependency-boundary rules), but it's documented here
since the choice was explicitly evaluated rather than defaulted into.

## Decision

Use **GitHub-native Dependabot** (`.github/dependabot.yml`) for automated
dependency updates. Do not adopt Renovate at this stage.

## Reasoning

**Renovate's advantages** (acknowledged, not dismissed):

- Far more configurable grouping, scheduling, and auto-merge rules.
- Better native monorepo awareness in some edge cases (e.g., internal
  workspace package version bump propagation).
- A single unified dashboard issue instead of one PR per group.

**Why Dependabot wins for AgentDock at this stage anyway:**

1. **Zero external setup.** Dependabot is built into GitHub with no app
   installation, no separate hosted/self-hosted bot infrastructure, and no
   additional account for new maintainers to reason about. For a project
   explicitly optimizing for low-friction contributor and maintainer
   onboarding, this matters more than Renovate's extra configurability.
2. **Native security-advisory integration.** Dependabot alerts and
   Dependabot version-update PRs share the same GitHub-native vulnerability
   database and UI that maintainers already use for `SECURITY.md`-driven
   triage — one less system to correlate manually.
3. **Sufficient for current scale.** The grouping rules in
   `dependabot.yml` (by ecosystem: TS tooling, Nx, testing) address the main
   practical pain point (PR-count noise) that usually motivates a Renovate
   migration. Renovate's superior configurability is more valuable once the
   dependency surface is much larger (many plugin repositories, complex
   internal version-propagation needs) — which is a real possibility at the
   project's target scale, but not the current one.

## Revisit when

- The number of weekly dependency-update PRs becomes unmanageable even with
  grouping, or
- The plugin ecosystem grows large enough that Renovate's cross-repository
  dashboard becomes meaningful, or
- A maintainer volunteers to own the Renovate configuration and hosting.

This should be revisited via a short RFC, not silently swapped.
