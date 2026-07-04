# RFC 0000: Title

**Status:** Draft | In Discussion | Accepted | Rejected | Withdrawn
**Author(s):** @handle
**Discussion:** link to the PR or Discussion thread once opened

## Summary

One paragraph: what is being proposed, in plain terms.

## Motivation

What problem does this solve? Who is affected by not having it? Why now?

## Detailed design

The actual proposal. For a new/changed public package API: describe the
interface. For a dependency-rule change: describe the new rule and which
existing code (if any) it would affect. For a governance change: describe
the new process precisely enough that someone could follow it without
asking clarifying questions.

## Drawbacks

Why might this be a bad idea? Be genuinely critical here — a strong RFC
argues against itself before someone else has to.

## Alternatives

What other designs were considered, and why is this one preferred?

## Impact on existing code and dependency rules

Does this require changes to `eslint.config.mjs` boundary constraints? Does
it introduce a new package, and if so under which layer (`kernel/`,
`foundation/`, `shared/`, etc.) per the repository blueprint?

## Unresolved questions

What parts of the design are still undecided, and are expected to be
resolved during implementation or through further discussion?

## Approval

Requires sign-off from the core team per the governance model in
[docs/architecture/002-repository-foundation.md](../architecture/002-repository-foundation.md#11-open-source-governance)
before implementation begins. Once accepted, a corresponding ADR should be
opened in `docs/adr/` to record the decision.
