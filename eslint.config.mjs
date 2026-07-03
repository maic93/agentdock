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

export default tseslint.config(
  {
    ignores: ["**/dist/**", "**/node_modules/**", "**/coverage/**", "**/.nx/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettierConfig,
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
              ],
            },
            {
              sourceTag: "scope:kernel",
              onlyDependOnLibsWithTags: [
                "scope:kernel",
                "scope:shared",
                "scope:provider-abstraction",
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
);
