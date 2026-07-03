# @agentdock/shared-testing-utils

**Purpose:** Shared test fixtures, mocks, and assertion helpers used across
multiple packages' test suites (e.g., a mock `ModelProvider` implementation
for testing the AI Router without a real provider).

**May depend on:** `@agentdock/shared-types`, `@agentdock/provider-abstraction`.

**Must never depend on:** any package's *implementation* — only its public
types/interfaces, to avoid this package accidentally becoming a hidden
runtime dependency of production code.

**Status:** Not implemented.
