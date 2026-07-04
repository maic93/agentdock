import { defineConfig } from "vitest/config";

/**
 * Shared Vitest defaults, extended by each package's own vitest.config.ts
 * the same way every package's tsconfig.json extends tsconfig.base.json.
 * Kept minimal: no DOM environment (nothing here runs in a browser), no
 * globals (tests import `describe`/`it`/`expect` explicitly, consistent
 * with the codebase's general preference for explicit imports).
 */
export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    include: ["src/**/*.spec.ts"],
    watch: false,
  },
});
