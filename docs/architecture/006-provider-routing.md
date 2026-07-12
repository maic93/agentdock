# 006. Provider Registry, Scoring, and Prompt Composition

**Status:** Implemented
**Depends on:** 001-005, and ADR 0006 (docs/adr/0006-provider-registry.md)

This document explains the fourth functional milestone: turning
AgentDock's single hardcoded provider into a registry of metadata-described
providers, replacing "first healthy" routing with a deterministic score,
and replacing the raw goal text sent to a provider with a composed,
template-driven prompt.

## Why provider metadata exists

Before this milestone, "provider-agnostic" meant, concretely, "there
happens to be an interface, and there happens to be one implementation of
it." Nothing about the Router's logic would have changed if a second
provider were registered — "first healthy capable provider" doesn't
distinguish between two healthy, capable candidates at all.

`ProviderMetadata` (displayName, providerType, version, the five
`supports*` capability flags, contextWindow, maxOutputTokens, priority,
costTier, latencyTier) exists so a routing decision has something real to
discriminate on. The stronger requirement — the Router "must never inspect
provider names" — is what makes this matter architecturally, not just
descriptively: if `ScoringRouter` ever branched on `provider.id ===
"ollama"`, every claim about provider-agnosticism would be false. It
doesn't; it reads only metadata. A new provider that fills in honest
metadata participates in routing correctly with zero Router changes.

**Metadata honesty:** every field on `OllamaProvider.metadata` documents
what it actually reflects. `supportsStreaming`/`supportsVision`/
`supportsTools`/`supportsJSON`/`supportsFunctionCalling` are all `false`
because this _adapter_ doesn't implement them yet, not because Ollama
itself can't. `contextWindow`/`maxOutputTokens` are conservative, commonly
-safe defaults, not introspected per-model values (Ollama's `/api/show`
could provide those; calling it isn't implemented this milestone). This is
stated directly in code comments rather than left to look like measured
data.

## Why routing became score-based

`ScoringRouter` scores every capable, healthy candidate:

```
score = metadata.priority + LATENCY_SCORE[metadata.latencyTier] + COST_SCORE[metadata.costTier]

LATENCY_SCORE = { fast: 3, medium: 2, slow: 1 }
COST_SCORE    = { free: 3, low: 2, medium: 1, high: 0 }
```

Capability support and health are **eligibility gates**, not scored
inputs — an incapable or unhealthy provider cannot win no matter how
favorable its other metadata, exactly matching the previous
`CapabilityMatchingRouter`'s behavior for those two dimensions. Scoring
only decides _which eligible provider_ wins, when there's more than one.

**Determinism and tie-breaking:** the score is a pure function of metadata
that doesn't change during a routing decision, plus one health check per
candidate. Ties are broken by `priority` (descending, in case two
providers score equally via different component combinations), then by
`providerId` (ascending, lexicographic) as the final, always-different
tiebreaker. This is directly tested, including a same-priority,
same-latency, same-cost pair resolving deterministically to the
lexicographically-first id across repeated calls.

**`CapabilityMatchingRouter` was not deleted.** Both routers now implement
one `Router` interface (including diagnostics — see below), so either can
be the one `apps/api`'s composition root wires up. See ADR 0006 for the
reasoning.

## Why prompts became composable

Before this milestone, `Executor` sent `node.objective` — the raw goal
text — directly to `provider.execute`. There was no prompt in any real
sense: no system instructions, no way to adapt phrasing to a provider or
task type, and any future need for one would have meant string-building
inline in the Executor, which is exactly the "hardcoded prompt strings
inside router or executor" this milestone's requirements rule out.

`PromptBuilder` composes a `BuiltPrompt` from an ordered list of sections:

```
system → developer → context → memory → tools → user → output-format
```

`system`/`developer`/`user`/`output-format` come from a data-driven
`PromptTemplate` (see `templates/default-templates.ts`) — plain data, no
code, selected by `intent.category` (today: only `"conversation"` maps to
anything, since that's the only intent AgentDock's Intent Analyzer
produces). `context`/`memory`/`tools` are only added when a caller
actually supplies them — nothing fabricates placeholder context or memory
content when none exists, because nothing in AgentDock produces real
context or memory yet (no knowledge base, no memory module). The mechanism
is real and tested; the _sources_ that would populate those sections are
future work.

**Variables and validation:** a template's text may reference
`{{variableName}}` placeholders. `renderTemplateText` scans for every
placeholder actually present and requires a matching entry in the supplied
variables map, throwing `MissingPromptVariableError` — a typed error, not
a silent empty substitution — if one is missing. There's no separate
schema declaring which variables a template "requires": the template's own
text _is_ the requirement, so the two can't drift apart.

**Seven templates ship, one is reachable.** `conversation`, `coding`,
`summarization`, `image-generation`, `planning`, `research`, and
`translation` are all real, fully-defined, individually-tested templates.
Only `conversation` is reachable through the live pipeline today, because
`IntentAnalyzer`/`CapabilityResolver` (milestone 006) only ever produce the
`"conversation"` intent and `"text-generation"` capability. The other six
exist now so that adding a new intent category later is a data change (one
row in `INTENT_TEMPLATE_MAP`) plus whatever real classification logic
produces that intent — not a prompt-authoring exercise done under pressure
once it's needed.

## Routing diagnostics

Every routing decision produces a `RoutingDiagnostics` record:

```
capability, selectedProviderId?, scores[] (every candidate, selected or rejected,
with a rejectionReason when applicable), reason, selectionDurationMs,
promptTemplateId?, promptBuildDurationMs?
```

The Executor attaches this to `ExecutionResult.diagnostics` on success and
to `ExecutionError.diagnostics` on failure — both optional, additive
fields (see ADR 0006, Decision 3, for why `RoutingDiagnostics` had to be
defined in `shared/types` rather than in `kernel/ai-router` where the
scoring algorithm actually lives). Diagnostics are immutable: every field
on `RoutingDiagnostics` and `ProviderScore` is `readonly`, and a
`RoutingDiagnostics` value, once returned, is never mutated in place —
the Executor merges routing and prompt-build diagnostics into a **new**
object rather than modifying the one the Router returned.

## API surface added

| Endpoint                                  | Returns                                                                                                                                                                                                                   |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /providers`                          | Every registered provider's `metadata` and current `health`.                                                                                                                                                              |
| `GET /providers/:id`                      | One provider's `metadata` and `health`. 404 if unregistered.                                                                                                                                                              |
| `GET /providers/health`                   | Every provider's `id` and `health` only (a lighter payload than the full listing).                                                                                                                                        |
| `GET /routing?capability=text-generation` | A **live** routing decision against the current registry — not a cached "last decision." Selecting a provider has no side effects, so recomputing on every call is safe and always reflects the registry's current state. |

`GET /health` (from milestone 005) is unchanged in shape — it still
reports `ollamaProvider` specifically, by name, for backward compatibility.
The new `/providers*` endpoints are the generalized, multi-provider
successors.

## Future provider ecosystem

What this milestone puts in place for a real multi-provider future,
without yet having a second provider to prove it against:

- `ProviderRegistry.register`/`unregister` support adding and removing
  providers at runtime — nothing assumes a fixed set decided at startup.
- `ScoringRouter` reads only metadata, so a second provider with different
  `costTier`/`latencyTier`/`priority` immediately participates in real
  competitive scoring, not just capability filtering.
- `PromptBuilder` accepts `providerMetadata` and substitutes
  `{{provider}}` — a template can already phrase itself differently per
  provider if a future template chooses to.
- Six of seven shipped templates are waiting for intent categories that
  don't exist yet, at zero marginal template-authoring cost when they do.

## Known limitations, stated honestly

- **Still one real provider.** Every scoring/tie-break claim above is
  tested with multiple _fake_ providers with controlled metadata — never
  validated against two real, different AI backends competing for the same
  request. The weighting (`priority + latency + cost`, unweighted, summed)
  has not been tuned against real-world tradeoffs.
- **`ScoringRouter`'s scoring is a flat sum, not configurable.** There's no
  way to weight cost over latency or vice versa without changing code.
- **Six of seven prompt templates are unreachable in practice** — real,
  tested, but not selectable through the live pipeline until intent
  classification recognizes more than "conversation."
- **`contextWindow`/`maxOutputTokens` on `OllamaProvider` are defaults, not
  measured per-model values.** A model with a genuinely smaller or larger
  context window than the default would report inaccurate metadata.
- **`GET /routing` previews routing, it doesn't reflect a specific past
  execution's actual decision.** For that, `GET /executions/:id` includes
  the real diagnostics attached when that Execution ran.

## Bugs found during implementation, and how they were caught

1. **`exactOptionalPropertyTypes` violations** in `handleGetRouting`'s
   underlying router return paths (`capability-matching-router.ts`) —
   assigning a possibly-`undefined` `Provider` directly into an optional
   `provider?:` field. Caught by `pnpm run build` failing, not by
   inspection; fixed using the same conditional-spread pattern already
   established elsewhere in this codebase (from milestone 005's
   `exactOptionalPropertyTypes` incident in the health handler).
2. **A test's own missing template variable.** `default-templates.spec.ts`
   originally supplied `goal`/`language`/`context` but not `date`, which
   two of the seven default templates (`conversation`, `planning`)
   reference — the test suite itself failed with
   `MissingPromptVariableError` until fixed. This is arguably the most
   reassuring bug of this milestone: it's exactly the failure mode the
   variable-validation requirement exists to catch, and it caught it on
   the very first real use.
3. **Widening `Provider` with a required `metadata` field broke every fake
   provider fixture across the test suite** (four files: `ai-router`,
   `workflow-engine`, `job-service`, `apps/api`). This was anticipated
   before writing the change, not a surprise found after — but confirming
   it required actually running `pnpm run typecheck` and fixing each one,
   not assuming the change was self-contained.

All three were caught by actually running the build/typecheck/test
pipeline against real code, consistent with this project's established
practice across every prior milestone.
