# 0003. Vitest as the test runner; cross-package types resolve through built output, not source paths

**Status:** Accepted
**Date:** 2026-07-04
**Deciders:** @agentdock/core-team

## Context

Implementing the first real packages (the Execution domain in
`shared/types`, the Planner, and the in-memory Execution Store) required
choosing a test runner for the first time, and surfaced a real defect in
the repository foundation's TypeScript configuration that only becomes
visible once cross-package imports actually exist.

## Decision 1: Vitest as the test runner

Vitest (pinned to the exact version `4.1.9`, matching this repo's
exact-pin convention for tooling — see ADR 0002) is the workspace's test
runner, configured via a shared `vitest.config.base.ts` at the workspace
root that each package's own `vitest.config.ts` extends, mirroring how
every package's `tsconfig.json` already extends `tsconfig.base.json`.

**Alternatives considered:** Jest was the obvious alternative and remains a
perfectly reasonable choice. Vitest was preferred specifically because it
requires no separate transform configuration for native ESM and
`moduleResolution: NodeNext` — both already established, non-negotiable
choices in `tsconfig.base.json` — whereas Jest's ESM support still requires
more manual configuration to avoid CJS/ESM interop friction. For a
greenfield project with no existing test suite to migrate, this tipped the
choice toward Vitest rather than being a close call requiring its own
extended debate.

## Decision 2: Cross-package types resolve through built output, not tsconfig `paths`

`tsconfig.base.json`, written during the repository foundation phase
(before any package had real code), included a `paths` mapping that
resolved every `@agentdock/*` package specifier directly to that package's
`src/index.ts` source file. This was a reasonable-looking convenience at
the time, but actually running `tsc` against real cross-package imports
(once `kernel-planner` and `foundation-db` imported from `shared-types`)
surfaced two concrete failures:

1. **`TS6059` rootDir violations.** Resolving straight to another package's
   source pulls that foreign source into the consuming package's own
   compiled program, which then violates that package's own
   `rootDir: "./src"` constraint — because TypeScript's `rootDir` check
   applies to every file in the program, including ones a `paths` mapping
   pulled in from elsewhere, not only files the package itself owns.
2. **Missing ambient types for a dependency the consumer never declared.**
   `shared-types` internally imports `node:crypto`; pulling its raw source
   into `kernel-planner`'s compilation required `@types/node` to be visible
   there too, even though `kernel-planner` has no actual runtime dependency
   on Node's crypto module — only `shared-types`' internal implementation
   does.

**Decision:** the `paths` mapping was removed from `tsconfig.base.json`.
Cross-package imports now resolve the way they will once these packages are
actually published: through the real `node_modules` symlink pnpm creates
for a `workspace:*` dependency, reading that package's compiled
`dist/index.d.ts` — which, being a type declaration, doesn't carry
`node:crypto`'s import along with it, since declaration emission strips
implementation details and keeps only the public type surface.

This requires a dependency's `build` target to run before a consumer's
`build` or `typecheck` target. `build` and `test` already had
`dependsOn: ["^build"]` in `nx.json`'s target defaults from the repository
foundation phase; `typecheck` did not, and was missing exactly this
ordering guarantee. `typecheck`'s target default now also declares
`dependsOn: ["^build"]`.

**Alternative considered:** keeping the `paths` mapping for editor
ergonomics (jump-to-definition across packages without a build step) while
finding some way to exempt `tsc` CLI runs from it. Rejected: TypeScript has
no supported way to make `paths` apply only to an editor's language service
and not to `tsc -p`, so there is no way to keep the convenience without
also keeping the bug. Editors resolve the real `node_modules` symlinks
natively, so jump-to-definition still works after a package has been built
at least once — which is an acceptable trade-off against a resolution
strategy that was demonstrably broken for actual compilation.

## Decision 3 (discovered during the same work): ESLint config filename

While verifying that `nx run-many --target=lint --all` actually produces
lint targets for the new packages (not just that `eslint` itself runs
cleanly), we found that the pinned `@nx/eslint` plugin version (`19.8.14`)
does not recognize `eslint.config.mjs` for target inference at all — its
own source contains the comment `// todo: add support for eslint.config.mjs`.
Only `eslint.config.js` and `eslint.config.cjs` are recognized.

**Decision:** the root config was renamed from `eslint.config.mjs` to
`eslint.config.js`, and the root `package.json` now declares
`"type": "module"` so the renamed file (whose ESM `import`/`export default`
content is otherwise unchanged) is still interpreted correctly. This was
verified by confirming `nx show project` lists a `lint` target
post-rename, and by deliberately introducing a forbidden `foundation ->
kernel` import and confirming the boundary rule actually rejects it before
reverting the test change.

## Consequences

Positive: every one of these was caught by actually running the commands
against real cross-package code, not by reasoning about the config in the
abstract — consistent with this project's established practice (see the CI
stabilization history in earlier milestones) of verifying rather than
assuming. The dependency-boundary rule from the repository foundation phase
is now confirmed to actually function against real tagged projects, not
merely configured to look like it would.

Negative: cross-package "jump to definition" in an editor now requires that
package to have been built at least once; this is a minor, disclosed
trade-off, not a silent one.

## Revisit when

Decision 2 should be revisited if a future Nx/TypeScript version adds a
supported way to scope `paths` mappings to the editor language service only
without affecting `tsc` CLI compilation. Decision 3 should be revisited when
the pinned `@nx/eslint` version is upgraded past whichever release adds
`.mjs` support (tracked informally; check the plugin's own source for the
`// todo` comment referenced above being resolved).
