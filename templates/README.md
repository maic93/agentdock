# templates/

Scaffolding contributors copy from when creating a new plugin or workflow
template. Intended to eventually be wired to an `nx generate` command so
scaffolding is one command rather than manual copy-paste, once the
underlying SDK/workflow-template format exists to scaffold against.

## Subdirectories

- `plugin-template/` — minimal starter structure for a new plugin.
- `workflow-template-template/` — minimal starter structure for a new
  workflow template.

## What never belongs here

Anything actually used at runtime by core — these are copy-from starting
points, not workspace packages the build graph manages (this directory is
intentionally excluded from `pnpm-workspace.yaml`).
