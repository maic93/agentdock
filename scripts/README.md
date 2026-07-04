# scripts/

Centralized automation, so it's discoverable rather than scattered as
one-off shell snippets in random package folders. If a script grows real
business rules, that logic should move into a proper package with the
script reduced to just invoking it.

## Subdirectories

- `setup/` — local dev environment bootstrap.
- `release/` — release automation (works alongside Changesets, see
  `.changeset/README.md`).
- `ci/` — helper scripts invoked from `.github/workflows/ci.yml`, kept
  separate from inline workflow YAML so they're runnable and testable
  locally too.
