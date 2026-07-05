# 004. The End-to-End Execution Pipeline

**Status:** Implemented (first real provider, first working request)
**Depends on:** 001-system-architecture.md, 002-repository-foundation.md, 003-execution-domain.md

This document explains the second functional milestone: connecting the
Execution domain and Planner (003) to a real AI model, end to end, through
a minimal HTTP API.

## What changed since 003-execution-domain.md

Milestone 003 took an Execution as far as the Planner's responsibility
goes: `Created -> Analyzing -> Planning -> Routing`. This milestone adds
everything downstream of that:

- **`packages/providers/provider-abstraction`** — the `Provider` contract
  (`checkHealth`, `listModels`, `execute`) every concrete provider
  implements.
- **`plugins/provider-ollama`** — the first concrete provider: a client for
  a running Ollama instance, implementing `Provider` via Ollama's
  `/api/generate` and `/api/tags` endpoints.
- **`packages/foundation/config`** — `loadConfig`, the one place that reads
  `process.env`, validating `OLLAMA_BASE_URL`, `OLLAMA_MODEL`,
  `REQUEST_TIMEOUT_MS`, and `PORT` and failing fast on anything missing or
  malformed.
- **`packages/kernel/ai-router`** — `CapabilityMatchingRouter`, selecting
  the first healthy provider whose capabilities include the one requested.
- **`packages/kernel/workflow-engine`** — `Executor`, which takes a
  `Routing`-status Execution, runs its graph against a provider (via the
  Router), and drives it to `Completed` or `Failed`.
- **`apps/api`** — the HTTP surface: `POST /execute`, `GET
/executions/:id`, `GET /health`, and the composition root that wires a
  real `OllamaProvider` into the pipeline.

No new package was introduced outside what the repository foundation had
already reserved for these responsibilities.

## The full pipeline

```
POST /execute {"goal": "Hello"}
        │
        ▼
Execution.create(goal)          [Created]
        │
        ▼
store.create(execution)          — persisted immediately, before planning
        │
        ▼
planner.plan(execution)          [Analyzing → Planning → Routing, or → Failed]
        │
        ▼
store.update(planned)
        │
        ▼
executor.execute(planned)        [→ Executing → Completed, or → Failed]
        │           │
        │           ▼
        │     router.selectProvider({ capability })
        │           │
        │           ▼
        │     provider.execute({ objective, capability })
        │           │
        │           ▼
        │     (a real HTTP call to Ollama's /api/generate)
        │
        ▼
store.update(executed)
        │
        ▼
200 { executionId, status: "completed", response, provider, model, durationMs }
```

Every stage is persisted via `ExecutionStore` immediately after it
completes — not batched at the end — so `GET /executions/:id` reflects
real, current progress even while a request is still in flight.

## Design decisions worth calling out

**The Executor never throws; it always returns a terminal-or-failed
Execution.** Consistent with the Planner (003): a provider timing out, a
provider being unreachable, or no provider being available are all
first-class `Failed` outcomes with a categorized error code
(`PROVIDER_ERROR`, `ROUTING_ERROR`, `EXECUTION_FAILED`), not exceptions the
API layer has to catch and reinterpret.

**`ExecutionResult` grew three optional fields** (`provider`, `model`,
`durationMs`) rather than becoming a different type or living somewhere
else. This is additive and backward-compatible — every existing caller from
milestone 003 that only provides a `summary` is still valid — and it's
where the API's required response shape (`response`, `provider`, `model`,
`durationMs`) actually comes from.

**The Ollama provider never reads `process.env`.** It receives
`OllamaProviderConfig` (baseUrl, model, timeoutMs) from its constructor,
supplied by `apps/api`'s composition root using `foundation-config`'s
`loadConfig()`. This keeps the provider trivially testable (inject
config, inject a fake `fetch`) and keeps environment-variable reading
concentrated in exactly one package, per the repository's layered
configuration design.

**`apps/api` is allowed to import the concrete Ollama plugin — and only
there.** This is a deliberate, narrow exception to the approved dependency
rules, made necessary by this milestone excluding a real Plugin System
from scope. See [ADR 0004](../adr/0004-apps-may-depend-on-plugins.md) for
the full reasoning and what should change once a real Plugin System
exists.

**The HTTP server uses `node:http` directly, no framework.** Three routes
don't need one, and every dependency added is a dependency that can break
in a version-specific way this project has already been burned by more
than once (see ADR 0002's `@nrwl/js` incident and ADR 0003's `@nx/eslint`
`.mjs` gap). A raw `createServer` callback with a regex-matched path and a
tiny JSON-body reader was less code and less risk than adopting and pinning
a framework for this scope.

## Known limitations of this milestone

- **Single provider, single model per request.** The Router's design
  supports multiple providers, but only one (Ollama) is registered. There
  is no cost- or latency-aware selection yet — "first healthy capable
  provider" is the entire strategy.
- **Single-node graphs only, in practice.** The Executor's loop is written
  to handle a real multi-node DAG, but the Planner (003) never produces
  more than one node today, so this is untested against an actual
  multi-node case — it's structurally ready, not proven.
- **No streaming.** `POST /execute` blocks until Ollama's full response is
  ready; there is no partial-response or streaming API, by explicit scope
  exclusion for this milestone.
- **No authentication, no persistence beyond the process's lifetime.** The
  `ExecutionStore` is still the in-memory implementation from milestone
  003 — every execution is lost on restart.
- **Health check is coarse.** `GET /health` reports the Ollama provider as
  a single up/down signal from `/api/tags`; it doesn't verify the specific
  configured model is actually pulled and ready.
