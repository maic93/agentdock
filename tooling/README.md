# tooling/

Shared build/lint/tsconfig configuration, not runtime code.

## Current status

Empty for now. The repository's shared ESLint config
([eslint.config.js](../eslint.config.js)) and shared TypeScript config
([tsconfig.base.json](../tsconfig.base.json)) currently live at the
workspace root rather than as separate `tooling/*` packages, because a
single root config is sufficient while there is exactly one flavor of
package in the workspace (Node/TypeScript libraries — no separate
React/browser lint or tsconfig profile is needed yet, since `apps/web`
isn't implemented).

## When this directory gets populated

Once `apps/web` exists and needs a meaningfully different lint/tsconfig
profile (e.g. React-specific ESLint rules, a `dom` lib target) from the
Node-only packages, that profile should be extracted into
`tooling/eslint-config` and `tooling/typescript-config` as real,
independently versioned packages that the root config and `apps/web`'s
local config both extend — rather than duplicating rules by hand across
multiple flat-config files. Until then, adding empty placeholder packages
here would be exactly the kind of premature scaffolding this repository
foundation phase is meant to avoid.
