# 0006. Provider Registry, scoring-based routing, and dynamic provider discovery

**Status:** Accepted
**Date:** 2026-07-11
**Deciders:** @agentdock/core-team

## Context

Through milestone 006, AgentDock's Router held a fixed array of providers,
handed to it once at construction by `apps/api`'s composition root, and
selected the first healthy one supporting a capability. This worked with
exactly one provider (Ollama) but didn't reflect the platform's stated
goal — provider-agnostic, dynamic model selection — in its actual design:
nothing about "first healthy in a fixed array" scales to choosing _well_
among several real candidates, and nothing allowed a provider to be
registered or removed without reconstructing the Router itself.

## Decision 1: `ProviderRegistry` holds providers; routers query it

`packages/kernel/provider-registry` is new. It holds registered providers
behind `register`/`unregister`/`getProvider`/`listProviders`/
`listProvidersByCapability`/`getMetadata`/`getHealth`/`isAvailable`, and
imports only `@agentdock/provider-abstraction` types — never a concrete
plugin, by construction (verified directly: a deliberate attempt to import
`OllamaProvider` from this package was made during implementation and
confirmed to fail lint via the existing `enforce-module-boundaries` rule,
then reverted).

Both `CapabilityMatchingRouter` and `ScoringRouter` (Decision 2) now take a
`ProviderRegistry` in their constructor instead of a fixed `Provider[]`.
This is what makes discovery "dynamic": a provider registered after the
Router is constructed is visible on the very next routing decision, with
no Router reconstruction needed.

**This changes both routers' constructor signatures**, which is a real,
disclosed break to internal (not externally published) code, updated at
every call site in this repository (`apps/api`'s composition root and
tests, `kernel-job-service`'s tests, `kernel-ai-router`'s own tests). No
external consumer of these packages exists yet, so "do not break public
APIs" is respected in the sense that matters — nothing outside this
monorepo depends on a Router's constructor shape — while the milestone's
explicit dynamic-discovery requirement is met for real, not simulated.

## Decision 2: `ScoringRouter` is the new default; `CapabilityMatchingRouter` is kept, not deleted

`ScoringRouter` scores every capable, healthy candidate on
`ProviderMetadata.priority`, `latencyTier`, and `costTier`, and is now what
`apps/api`'s composition root wires up. Capability support and health
remain hard eligibility gates (an incapable or unhealthy provider cannot
win regardless of score), matching `CapabilityMatchingRouter`'s existing,
tested behavior — the scoring is a refinement of _which eligible provider
wins_, not a change to _what counts as eligible_.

**Why the router "must never inspect provider names":** scoring reads only
`ProviderMetadata` — structured facts every provider is required to
expose — never `provider.id` or a display name. This is what makes
`ScoringRouter` genuinely provider-agnostic rather than agnostic in name
only: a new provider with the right metadata slots into the existing
scoring logic with zero changes to the Router.

**Determinism:** the score is a pure function of unchanging metadata plus
one health check per candidate. Ties are broken first by `priority`
(descending), then by `providerId` (ascending, lexicographic) — verified
directly with a test asserting a fully-tied pair resolves to the
lexicographically-first id across repeated calls.

**Why `CapabilityMatchingRouter` wasn't deleted:** it's simpler, has no
scoring behavior to reason about, and nothing in this milestone's
instructions asked for it to be removed — only for the scoring system to
"replace" it as the _operative_ strategy, which happens at the composition
root, not by deleting the alternative. Both now implement the same
`Router` interface, including the new diagnostics method (Decision 3), so
they remain interchangeable.

## Decision 3: `Router.selectProviderWithDiagnostics` is additive; `RoutingDiagnostics` lives in `shared/types`

`selectProvider` (throws `NoProviderAvailableError` on failure) is
unchanged in behavior for every existing caller. A new
`selectProviderWithDiagnostics` method — implemented by both routers —
never throws, returning `{ provider?, diagnostics }` instead, so a caller
that wants the full picture (including every rejected candidate and why)
doesn't have to catch an exception to get it.

`RoutingDiagnostics` and `ProviderScore` are defined in
`packages/shared/types`, not in `kernel/ai-router` where the algorithm that
produces them actually lives. This was necessary, not a style preference:
`ExecutionResult` and `ExecutionError` both gained an optional
`diagnostics: RoutingDiagnostics` field this milestone (a routing or
provider failure is exactly when "why" matters most), and `shared/types`
must never depend on `kernel/ai-router` per the approved dependency
rules — so the type has to live where `Execution` already lives, with
`kernel/ai-router` producing values of it, not owning its definition.
`ProviderScore.providerId` is a plain `string`, not the branded
`ProviderId` from `provider-abstraction`, for the identical reason:
`shared/types` cannot depend on that package either.

## Decision 4: the Prompt Builder is a new kernel package, integrated into the Executor as an optional dependency

`packages/kernel/prompt-builder` composes a `BuiltPrompt` from a
data-driven `PromptTemplate` plus whatever runtime `context`/`memory`/
`tools` a caller supplies (see docs/architecture/006-provider-routing.md
for the composition ordering and why unavailable sections are omitted
rather than faked).

The `Executor` (`kernel/workflow-engine`) now calls `PromptBuilder.build`
before calling `provider.execute`, sending the fully-composed prompt text
instead of the raw goal string. `PromptBuilder` was added as a new,
**optional** third constructor parameter defaulting to
`new PromptBuilder()` (the standard template set) — every existing 1- or
2-argument `new Executor(router)` / `new Executor(router, clock)` call
site keeps working unchanged; only `apps/api`'s composition root passes one
explicitly.

## Consequences

Positive: routing is genuinely metadata-driven and dynamically discoverable
now, not just described that way; prompts are genuinely composed from data
rather than any string ever appearing inline in the Router or Executor
(verified directly — neither file contains a prompt string literal);
diagnostics attach to both successful and failed Executions, not only
successful ones.

Negative: every fake/stub `Provider` implementation across the test suite
needed a `metadata` field added, since `Provider.metadata` is now a
required interface member — a real, disclosed ripple effect from widening
a central interface, fixed at every call site (four files) rather than
worked around.

## Revisit when

A second real provider exists — `ScoringRouter`'s scoring weights
(currently an unweighted sum of priority + latency + cost) have never been
validated against more than one real candidate, and may need tuning or a
configurable weighting scheme once there's a genuine choice to make.
