// Shared, repo-wide ESLint configuration.
//
// This file is the mechanical enforcement of the dependency rules approved in
// docs/architecture/002-repository-foundation.md (Section 4). Individual
// packages must NOT define their own conflicting rule sets for these
// boundaries — that would let the rules erode quietly, one package at a
// time, which is exactly the failure mode this config exists to prevent.
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import nxEslintPlugin from "@nx/eslint-plugin";
import prettierConfig from "eslint-config-prettier";
import globals from "globals";

export default tseslint.config(
  {
    ignores: ["**/dist/**", "**/node_modules/**", "**/coverage/**", "**/.nx/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettierConfig,
  {
    // Root-level tooling config files are plain CommonJS, not TypeScript —
    // without this, `module`/`require` trip the no-undef rule since the
    // base config above assumes ES module scope.
    files: ["**/*.cjs"],
    languageOptions: {
      sourceType: "commonjs",
      globals: globals.node,
    },
  },
  {
    plugins: {
      "@nx": nxEslintPlugin,
    },
    rules: {
      // The single highest-leverage rule in this file: it turns the
      // dependency-direction diagram from Prompt 002 into a build-breaking
      // lint error instead of a convention reviewers have to remember to
      // check by hand.
      "@nx/enforce-module-boundaries": [
        "error",
        {
          enforceBuildableLibDependency: true,
          allow: [],
          depConstraints: [
            {
              sourceTag: "scope:app",
              onlyDependOnLibsWithTags: [
                "scope:kernel",
                "scope:foundation",
                "scope:shared",
                "scope:provider-abstraction",
                // Composition-root exception (ADR 0004): until a real,
                // dynamic Plugin System exists, an app is the one place
                // allowed to import a concrete plugin directly, to wire it
                // up. kernel/foundation/shared still never get this.
                "type:plugin",
              ],
            },
            {
              sourceTag: "scope:kernel",
              onlyDependOnLibsWithTags: [
                "scope:kernel",
                "scope:shared",
                "scope:provider-abstraction",
                // Closes a latent gap (ADR 0005): 002-repository-foundation.md,
                // Section 3 already approved kernel-workflow-engine depending
                // on foundation-artifact-manager/foundation-db; this rule had
                // just never been updated to actually allow it.
                "scope:foundation",
              ],
            },
            {
              sourceTag: "scope:foundation",
              onlyDependOnLibsWithTags: ["scope:foundation", "scope:shared"],
            },
            {
              sourceTag: "scope:provider-abstraction",
              onlyDependOnLibsWithTags: ["scope:shared"],
            },
            {
              sourceTag: "scope:shared",
              onlyDependOnLibsWithTags: ["scope:shared"],
            },
            {
              sourceTag: "type:plugin",
              onlyDependOnLibsWithTags: ["scope:shared", "scope:provider-abstraction"],
            },
          ],
        },
      ],

      // No deep-importing another package's internals — every package has
      // exactly one public entry point (its index).
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@agentdock/*/src/*", "!@agentdock/*/src/index"],
              message:
                "Import from a package's public entry point only (its index export), not its internal src paths.",
            },
          ],
        },
      ],

      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
  {
    // Every package's vitest.config.ts intentionally reaches into the
    // workspace-root vitest.config.base.ts by relative path, mirroring how
    // every tsconfig.json already extends ../../../tsconfig.base.json. This
    // is a shared build-tooling convention, not a dependency between
    // packages, so it's exempted from the boundary rule rather than
    // reported as a violation.
    files: ["**/vitest.config.ts"],
    rules: {
      "@nx/enforce-module-boundaries": "off",
    },
  },
);
