# tests/

Cross-package tests that don't belong to any single package. Unit and
integration tests live _colocated_ with the source they test, inside each
package (e.g. `packages/kernel/planner/src/*.spec.ts`) — not here.

## Subdirectories

- `e2e/` — full goal-in → artifact-out scenario tests across the whole
  system.
- `contract/` — verifies provider/tool plugins correctly implement
  `@agentdock/provider-abstraction` interfaces; run against every
  first-party plugin, and offered as a CLI check for third-party plugin
  authors.

## Status

Empty. Both categories require a working kernel and at least one real
provider/tool plugin to test against — writing these tests now would mean
testing code that doesn't exist.
