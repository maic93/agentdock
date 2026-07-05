# @agentdock/kernel-ai-router

**Purpose:** Select a concrete model for a task given its declared
capability requirement and constraints (cost ceiling, latency budget,
local-only/privacy-tier flag). Falls back automatically on provider
failure. See the AI routing philosophy in
`docs/architecture/001-system-architecture.md`, Section 15.

**Public API (implemented):** `Router` (the interface the Executor depends
on), `RoutingRequest`, `NoProviderAvailableError`, and
`CapabilityMatchingRouter` — the first (and, for now, only) strategy:
filter registered providers by capability, then return the first one that
reports healthy. With a single provider registered, this always evaluates
that one candidate, but the selection is expressed as a filter over a list,
not a hardcoded check for "ollama" — registering a second provider changes
nothing about how selection works, only what's in the list.

**May depend on:** `@agentdock/kernel-model-registry`,
`@agentdock/provider-abstraction`, `@agentdock/shared-types`.

**Must never depend on:** any concrete provider plugin package by static
import (must resolve dynamically through the registry), `apps/*`.

**Must remain internal:** routing heuristics/weightings, fallback-chain
ordering logic.

**Status:** Implemented (capability + health-based selection only — no
cost/latency-aware routing yet; there's only one provider to route to).
