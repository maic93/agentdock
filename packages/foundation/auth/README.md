# @agentdock/foundation-auth

**Purpose:** Identity, sessions, and role-based access control (RBAC).

**Public API (once implemented):** an `AuthService` interface (authenticate,
authorize, session management).

**May depend on:** `@agentdock/shared-types`, `@agentdock/foundation-db`,
`@agentdock/foundation-config`.

**Must never depend on:** `packages/kernel/*`, `apps/*`, `plugins/*`.

**Must remain internal:** credential hashing/storage implementation
details, session token internals.

**Status:** Not implemented.
