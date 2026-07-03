# @agentdock/kernel-ai-router

**Purpose:** Select a concrete model for a task given its declared
capability requirement and constraints (cost ceiling, latency budget,
local-only/privacy-tier flag). Falls back automatically on provider
failure. See the AI routing philosophy in
`docs/architecture/001-system-architecture.md`, Section 15.

**Public API (once implemented):** `selectModel(capability, constraints) -> ModelHandle`.

**May depend on:** `@agentdock/kernel-model-registry`,
`@agentdock/provider-abstraction`, `@agentdock/shared-types`.

**Must never depend on:** any concrete provider plugin package by static
import (must resolve dynamically through the registry), `apps/*`.

**Must remain internal:** routing heuristics/weightings, fallback-chain
ordering logic.

**Status:** Not implemented.
