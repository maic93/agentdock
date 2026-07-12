# AgentDock

**AgentDock is a self-hostable, provider-agnostic AI orchestration platform.**
You describe a goal; AgentDock plans it, routes each step to the right model
or tool (local-first whenever that's sufficient), executes it, and hands you
the result — without you choosing a model, a search engine, or a provider.

## Status

Early, working, and narrow. AgentDock can take a real HTTP request, turn it
into a `Job`, plan and run one `Execution` for it against a real
locally-running Ollama model, and return the result — for exactly one
scenario: a conversational goal routed to text generation. See
[docs/architecture/005-job-domain.md](./docs/architecture/005-job-domain.md)
for what `Job` and `Execution` each are and why they're separate, and Known
Limitations below for the short version. There's no auth, no
multi-Execution planning, no plugin system, and no UI yet — what exists is
a real, tested, end-to-end vertical slice that every future feature builds
on top of.

## Quick Start

You need [Ollama](https://ollama.com) installed and a model pulled.

```bash
# 1. Install and start Ollama (see "Run Ollama locally" below), then:
ollama pull llama3.2

# 2. Clone and set up AgentDock
git clone https://github.com/maic93/agentdock.git
cd agentdock
cp .env.example .env
pnpm install

# 3. Build and run the API
pnpm --filter @agentdock/api build
node apps/api/dist/main.js
# -> AgentDock API listening on port 3000
```

In another terminal:

```bash
curl -X POST http://localhost:3000/jobs \
  -H "content-type: application/json" \
  -d '{"goal": "Hello"}'
```

See Example API Requests below for the full set of responses, including
failure cases.

### Run Ollama locally

AgentDock talks to Ollama over HTTP; it doesn't bundle or manage an Ollama
installation itself.

```bash
# macOS / Linux — see https://ollama.com/download for other platforms
curl -fsSL https://ollama.com/install.sh | sh
ollama serve            # starts Ollama on http://localhost:11434 (often already running as a service)
ollama pull llama3.2    # or any model — just make OLLAMA_MODEL below match what you pulled
```

`GET /health` will tell you whether AgentDock can currently reach Ollama.

## Environment Variables

Copy [.env.example](./.env.example) to `.env` and adjust as needed. These
four are read by `@agentdock/foundation-config` and validated at startup —
AgentDock fails fast with a clear error if any is missing or malformed,
rather than failing confusingly on the first request:

| Variable             | Required | Example                  | Notes                                                                        |
| -------------------- | -------- | ------------------------ | ---------------------------------------------------------------------------- |
| `OLLAMA_BASE_URL`    | Yes      | `http://localhost:11434` | Must be a valid URL.                                                         |
| `OLLAMA_MODEL`       | Yes      | `llama3.2`               | The model used unless a request overrides it. Never hardcoded — must be set. |
| `REQUEST_TIMEOUT_MS` | Yes      | `30000`                  | Positive integer. How long AgentDock waits for Ollama before giving up.      |
| `PORT`               | Yes      | `3000`                   | Positive integer. What port the API listens on.                              |

## Example API Requests

**A successful request:**

```bash
curl -X POST http://localhost:3000/jobs \
  -H "content-type: application/json" \
  -d '{"goal": "Hello"}'
```

```json
{
  "jobId": "8f2b1a90-...",
  "status": "completed",
  "executionId": "3fa2e1c0-...",
  "response": "Hello! How can I help you today?"
}
```

**A goal AgentDock can't classify** (only conversational goals resolve to a
capability today — see Known Limitations):

```bash
curl -X POST http://localhost:3000/jobs \
  -H "content-type: application/json" \
  -d '{"goal": "Build me a web application"}'
```

```json
{
  "jobId": "9c1a4b2d-...",
  "status": "failed",
  "error": {
    "category": "planning",
    "message": "No capabilities are available to satisfy intent \"unknown\"."
  }
}
```

_(HTTP 422)_

**Ollama unreachable or unhealthy:**

```json
{
  "jobId": "...",
  "status": "failed",
  "error": {
    "category": "routing",
    "message": "No healthy provider is available for capability \"text-generation\"."
  }
}
```

_(HTTP 502)_

**Retrieving a Job:**

```bash
curl http://localhost:3000/jobs/8f2b1a90-...
```

```json
{
  "id": "8f2b1a90-...",
  "goal": { "text": "Hello" },
  "status": "completed",
  "priority": "normal",
  "executionIds": ["3fa2e1c0-..."],
  "result": {
    "summary": "Hello! How can I help you today?",
    "provider": "ollama",
    "model": "llama3.2"
  },
  "metadata": { "createdAt": "2026-07-06T12:00:00.000Z", "updatedAt": "2026-07-06T12:00:00.842Z" }
}
```

**The Job's Execution(s):**

```bash
curl http://localhost:3000/jobs/8f2b1a90-.../executions
```

```json
{
  "executions": [
    {
      "id": "3fa2e1c0-...",
      "jobId": "8f2b1a90-...",
      "goal": { "text": "Hello" },
      "status": "completed",
      "intent": {
        "category": "conversation",
        "confidence": 0.7,
        "reasoning": "Matched conversational keyword(s): hello."
      },
      "capabilities": ["text-generation"],
      "graph": {
        "nodes": [
          {
            "id": "...",
            "objective": "Hello",
            "capability": "text-generation",
            "dependencies": [],
            "status": "pending"
          }
        ]
      },
      "result": {
        "summary": "Hello! How can I help you today?",
        "provider": "ollama",
        "model": "llama3.2",
        "durationMs": 842
      },
      "metadata": {
        "createdAt": "2026-07-06T12:00:00.000Z",
        "updatedAt": "2026-07-06T12:00:00.842Z"
      }
    }
  ]
}
```

**Unknown job or execution id** returns HTTP 404 with
`{"error": {"category": "not_found", "message": "..."}}`.

**Health check:**

```bash
curl http://localhost:3000/health
```

```json
{
  "status": "healthy",
  "components": {
    "api": { "status": "ok" },
    "planner": { "status": "ok" },
    "router": { "status": "ok" },
    "executor": { "status": "ok" },
    "ollamaProvider": { "status": "ok" }
  }
}
```

### `POST /execute` (deprecated)

Still works, unchanged request/response shape, now implemented by
delegating to the same `JobService` that powers `/jobs` internally.
Responses carry a `Deprecation: true` header. New integrations should use
`POST /jobs` instead.

```bash
curl -X POST http://localhost:3000/execute \
  -H "content-type: application/json" \
  -d '{"goal": "Hello"}'
```

```json
{
  "executionId": "3fa2e1c0-...",
  "status": "completed",
  "response": "Hello! How can I help you today?",
  "provider": "ollama",
  "model": "llama3.2",
  "durationMs": 842
}
```

## Job vs. Execution vs. ExecutionGraph vs. ExecutionNode

- **Job** — the user's requested _outcome_ ("Hello", eventually things like
  "build a SaaS"). Has its own lifecycle (Created → Planning → Executing →
  Completed/Failed) and owns one or more Executions.
- **Execution** — one _unit of work_ created to help satisfy a Job. Has its
  own, more granular lifecycle (Created → Analyzing → Planning → Routing →
  Executing → Completed/Failed) and belongs to exactly one Job.
- **ExecutionGraph** — the validated plan _for one Execution_: an acyclic
  set of nodes, produced once that Execution's Planning stage completes.
- **ExecutionNode** — one step within that plan: one capability, run
  against one provider.

Today, every Job creates exactly one Execution, whose graph always has
exactly one node — so these four concepts collapse to a 1:1:1:1
relationship in practice. They're modeled as four separate types anyway,
because a Job that eventually needs several Executions (each with their
own multi-node graphs) shouldn't require re-modeling any of this — see
[docs/architecture/005-job-domain.md](./docs/architecture/005-job-domain.md)
for the full reasoning and sequence diagrams.

## Architecture of the Pipeline

```
POST /jobs {"goal": "Hello"}
        v
Job.create(goal)                    [Created]
        v
job.startPlanning()                 [Planning]
        v
Execution.createForJob(job.id, ...) [Created]
        v
planner.plan(execution)             [Analyzing -> Planning -> Routing, or -> Failed]
        v
job.beginExecution(execution.id)    [Executing]
        v
executor.execute(planned)           [-> Executing -> Completed, or -> Failed]
        v (via the Router, selecting a healthy provider by capability)
provider.execute(...)               [a real HTTP call to Ollama]
        v
job.complete(jobResult)              [Completed]
        v
200 { jobId, status, executionId, response }
```

Every stage is persisted (to the `JobRepository` and the `ExecutionStore`)
as it completes. Full design rationale — why Job and Execution are
separate, why `JobService` orchestrates rather than replaces the existing
Planner and Executor, why `POST /execute` still works — is in
[docs/architecture/005-job-domain.md](./docs/architecture/005-job-domain.md)
(building on
[004 — The End-to-End Execution Pipeline](./docs/architecture/004-execution-pipeline.md)).
As of milestone 007, the Router selects a provider by **score** (not just
health) and the Executor builds a real, composed prompt before calling the
provider — see [Provider Routing & Prompts](#provider-routing--prompts)
below.

## Provider Routing & Prompts

Providers are held in a `ProviderRegistry` (register/unregister at
runtime) and described by structured `ProviderMetadata` — the Router never
inspects a provider's id or name, only its metadata. `ScoringRouter`
(the default) scores every capable, healthy candidate on
`priority`/`latencyTier`/`costTier`, deterministically, with ties broken
by priority then provider id.

Before calling a provider, the Executor now builds a real prompt via
`PromptBuilder`: a data-driven template (system/developer/user/
output-format sections) plus whatever context/memory/tool instructions are
available — composed into one finished prompt, never a raw goal string
sent as-is. See
[docs/architecture/006-provider-routing.md](./docs/architecture/006-provider-routing.md)
for the full design, including why only one of the seven shipped templates
is reachable today.

```bash
curl http://localhost:3000/providers
```

```json
{
  "providers": [
    {
      "metadata": {
        "id": "ollama",
        "displayName": "Ollama",
        "providerType": "local",
        "capabilities": ["text-generation"],
        "priority": 100,
        "costTier": "free",
        "latencyTier": "medium"
      },
      "health": { "healthy": true }
    }
  ]
}
```

```bash
curl "http://localhost:3000/routing?capability=text-generation"
```

```json
{
  "capability": "text-generation",
  "selectedProviderId": "ollama",
  "scores": [
    {
      "providerId": "ollama",
      "eligible": true,
      "score": 105,
      "breakdown": { "priority": 100, "latency": 2, "cost": 3 }
    }
  ],
  "reason": "Highest-scoring eligible provider (score 105).",
  "selectionDurationMs": 1
}
```

`GET /providers/:id` and `GET /providers/health` are also available — see
[docs/architecture/006-provider-routing.md](./docs/architecture/006-provider-routing.md)
for the full endpoint list.

## Known Limitations

- **One Execution per Job, always.** There is no multi-Execution planning
  yet — every Job creates exactly one Execution.
- **Still one real provider.** The registry and scoring router support
  many; only Ollama is registered. Scoring weights are untested against a
  genuine multi-provider choice.
- **Six of seven prompt templates are unreachable in practice.** Only
  conversational goals classify to a capability today.
- **No Artifact model.** Referenced in the long-term architecture, not yet
  implemented.
- **No streaming.** Both `POST /jobs` and `POST /execute` block until
  Ollama's full response is ready.
- **No auth, no persistence across restarts, no dynamic plugin loading.**
  Both stores are in-memory; providers are registered by a composition
  root, not discovered from a real plugin marketplace (see
  [ADR 0004](./docs/adr/0004-apps-may-depend-on-plugins.md)) — though they
  _are_ now held in a registry that supports runtime
  register/unregister (see
  [ADR 0006](./docs/adr/0006-provider-registry.md)).

## Repository layout

```
apps/            deployable interfaces (web, api, cli) — thin, no business logic
packages/kernel/      orchestration core (planner, workflow engine, ai router, ...)
packages/foundation/  infrastructure services (memory, db, auth, scheduler, ...)
packages/providers/   the provider abstraction contract
plugins/         first-party provider/tool plugins (provider-ollama is implemented)
packages/shared/      cross-cutting types (the Execution domain lives here), plugin SDK
tooling/         shared build/lint/tsconfig configuration, not runtime code
docs/            architecture records, ADRs, RFCs, plugin & contribution guides
examples/        runnable, deletable demonstrations
tests/e2e|contract/  cross-package tests that don't belong to a single package
infra/           deployment definitions (Docker Compose, Helm, Terraform)
```

Every one of these directories has its own `README.md` explaining what
belongs there and what doesn't — read the local one before adding a file if
you're unsure.

## Why the structure looks like this

These design documents are the source of truth and are linked, not
restated, from this README:

- [001 — System Architecture](./docs/architecture/001-system-architecture.md)
  — what AgentDock is, its module boundaries, and its AI-routing/local-first
  philosophy.
- [002 — Repository Foundation](./docs/architecture/002-repository-foundation.md)
  — the monorepo tooling choice (pnpm + Nx), dependency rules, and why
  they're mechanically enforced rather than just documented.
- [003 — The Execution Domain](./docs/architecture/003-execution-domain.md)
  — the `Execution` aggregate and its lifecycle.
- [004 — The End-to-End Execution Pipeline](./docs/architecture/004-execution-pipeline.md)
  — connecting Execution to a real provider (Ollama).
- [005 — The Job Domain](./docs/architecture/005-job-domain.md) — `Job`
  above `Execution`.
- [006 — Provider Registry, Scoring, and Prompt Composition](./docs/architecture/006-provider-routing.md)
  — this milestone.

## Contributing

Start with [CONTRIBUTING.md](./CONTRIBUTING.md). Good first issues are
labeled `good-first-issue`. Anything touching a public package API or a
dependency rule needs an RFC first — see
[docs/rfcs/0000-template.md](./docs/rfcs/0000-template.md).

## Security

Please do not open a public issue for security vulnerabilities. See
[SECURITY.md](./SECURITY.md) for the disclosure process.

## License

[MIT](./LICENSE) — see the license file for the full text.
