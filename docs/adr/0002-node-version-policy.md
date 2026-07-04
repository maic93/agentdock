# 0002. Standardize on Node.js 24 (Active LTS), not Node.js 20

**Status:** Accepted
**Date:** 2026-07-04
**Deciders:** @agentdock/core-team

## Context

CI began failing `pnpm install --frozen-lockfile` with
`ERR_PNPM_UNSUPPORTED_ENGINE`: a transitive dependency
(`@eslint/plugin-kit@0.7.2`) declares
`engines.node: "^20.19.0 || ^22.13.0 || >=24"`, which the repo's pinned CI
Node version (`20.11.0`, from `.nvmrc` at the time) does not satisfy. This is
`pnpm`'s `engine-strict=true` setting working as intended — it is a real,
correct rejection of a genuinely incompatible engine, not a flaky failure.

Separately, and more importantly: **Node.js 20 reached its official
end-of-life on April 30, 2026.** As of this decision (July 2026), Node 20
has been unsupported for over two months — it receives no further security
patches from the Node.js project, for any newly disclosed CVE, ever. The
immediate engine-mismatch error is a symptom; continuing to pin an EOL
runtime at all is the underlying problem.

At the time of this decision, the supported lines are:

- **Node.js 22** — Maintenance LTS, EOL April 30, 2027.
- **Node.js 24** — Active LTS, EOL April 30, 2028.
- **Node.js 26** — Current (pre-LTS), not yet recommended for production.

## Decision

Standardize the entire repository on **Node.js 24 (Active LTS)**, pinned to
`24.18.0` in `.nvmrc` and `.node-version`, with `engines.node: ">=24.0.0"`
in `package.json`. This applies uniformly to CI, the dev container, local
development, and documentation — there is exactly one supported Node
version, recorded in exactly one place (`.nvmrc`), that everything else
derives from or is checked against.

## Alternatives considered

- **Bump only to the minimum patch that satisfies the immediate error**
  (e.g. `20.19.0`, staying on the Node 20 line). Rejected: Node 20 is
  already EOL regardless of patch version — this would fix today's CI error
  while leaving the project on an unsupported, unpatchable runtime, which is
  a worse outcome than the error itself. This was explicitly the kind of
  narrow, symptom-level fix this decision is trying to avoid.
- **Node.js 22 (Maintenance LTS).** A legitimate, currently-supported
  choice, and the lower-risk jump for a codebase with existing production
  dependencies on Node 20. Rejected specifically _for this project_, because
  AgentDock has no implemented code yet (per the repository's current
  pre-alpha status) — there is no migration cost to weigh, so there is no
  reason to start a greenfield project on a line that is already in
  Maintenance (i.e., already past its own peak support window) rather than
  the line that's currently Active LTS with a full support runway.
- **Node.js 26 (Current).** Rejected: not yet LTS (promotion expected
  October 2026); using a pre-LTS line as the project's baseline would be
  premature for a project explicitly prioritizing stability.

## Consequences

Positive: the repository is on a fully supported runtime with the longest
currently-available LTS runway (through April 2028), and the `.nvmrc` /
`.node-version` / `engines` / dev container / CI alignment established here
prevents the specific failure mode that triggered this ADR — a drift between
what CI actually runs and what the dependency tree requires. The bootstrap
script (`scripts/setup/bootstrap.sh`) was also hardened to actually verify a
contributor's local Node major version matches `.nvmrc`, rather than merely
checking that `node` exists at all.

Negative: none of AgentDock's own code exists yet, so this decision carries
no real migration cost today — but it does mean contributors need Node 24
specifically installed, which is a marginally less common default on
existing developer machines in mid-2026 than Node 20 was.

## Revisit when

Node.js 26 (or its successor) is promoted to Active LTS and offers
meaningfully longer runway than Node 24's April 2028 EOL — expected around
October 2026 at the earliest, per the Node.js release schedule. Revisit via
a new ADR, not by editing this one.
