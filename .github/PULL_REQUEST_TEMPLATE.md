## Summary

<!-- What does this PR do, and why? Link the issue or RFC it addresses. -->

Closes #

## Type of change

- [ ] `feat` — new functionality
- [ ] `fix` — bug fix
- [ ] `docs` — documentation only
- [ ] `refactor` — no functional change
- [ ] `chore` / `ci` / `build` — tooling
- [ ] Breaking change (public package API, dependency rule, or governance)

## Testing notes

<!-- How did you verify this works? Be specific — "tested locally" is not
     sufficient. Include commands run, scenarios covered, and anything
     intentionally NOT covered and why. -->

## Checklist

- [ ] I read [CONTRIBUTING.md](../CONTRIBUTING.md).
- [ ] `pnpm lint`, `pnpm typecheck`, and relevant `pnpm nx test <project>` pass locally.
- [ ] I added or updated tests for the change.
- [ ] I added a changeset (`pnpm changeset`) if this touches a publishable package.
- [ ] I updated relevant documentation in the same PR (not a follow-up).
- [ ] This PR does not introduce a new dependency-boundary violation (`pnpm lint` checks this).
- [ ] If this is a breaking change, I added a migration note.
