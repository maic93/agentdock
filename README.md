# AgentDock

**AgentDock is a self-hostable, provider-agnostic AI orchestration platform.**
You describe a goal; AgentDock plans it, routes each step to the right model
or tool (local-first whenever that's sufficient), executes it, and hands you
the result — without you choosing a model, a search engine, or a provider.

## Status

Early, working, and narrow. As of this milestone, AgentDock can take a real
HTTP request, plan it, run it against a real locally-running Ollama model,
and return the result — for exactly one scenario: a conversational goal
routed to text generation. See
[docs/architecture/004-execution-pipeline.md](./docs/architecture/004-execution-pipeline.md)
for what that pipeline actually does, and Known Limitations below for the
short version. There's no auth, no multi-provider routing, no plugin
system, and no UI yet — what exists is a real, tested, end-to-end vertical
slice that every future feature builds on top of.

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
curl -X POST http://localhost:3000/execute \
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

**A goal AgentDock can't classify** (only conversational goals resolve to a
capability today — see Known Limitations):

```bash
curl -X POST http://localhost:3000/execute \
  -H "content-type: application/json" \
  -d '{"goal": "Build me a web application"}'
```

```json
{
  "executionId": "9c1a4b2d-...",
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
  "executionId": "...",
  "status": "failed",
  "error": {
    "category": "routing",
    "message": "No healthy provider is available for capability \"text-generation\"."
  }
}
```

_(HTTP 502)_

**Retrieving a stored execution:**

```bash
curl http://localhost:3000/executions/3fa2e1c0-...
```

```json
{
  "id": "3fa2e1c0-...",
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
  "metadata": { "createdAt": "2026-07-05T12:00:00.000Z", "updatedAt": "2026-07-05T12:00:00.842Z" }
}
```

**Unknown execution id** returns HTTP 404 with
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

## Architecture of the Execution Pipeline

```
POST /execute {"goal": "Hello"}
        v
Execution.create(goal)              [Created]
        v
planner.plan(execution)             [Analyzing -> Planning -> Routing, or -> Failed]
        v
executor.execute(planned)           [-> Executing -> Completed, or -> Failed]
        v (via the Router, selecting a healthy provider by capability)
provider.execute(...)               [a real HTTP call to Ollama]
        v
200 { executionId, status, response, provider, model, durationMs }
```

Every stage is persisted to the `ExecutionStore` as it completes. Full
design rationale — why each package owns the piece it owns, why the
Executor never throws, why `apps/api` is allowed to import a concrete
plugin — is in
[docs/architecture/004-execution-pipeline.md](./docs/architecture/004-execution-pipeline.md).

## Known Limitations

- **One provider, one capability.** Only Ollama, only `text-generation`,
  only conversational goals resolve to it. Anything else fails planning
  with a 422.
- **Single-node graphs only, in practice.** The Executor can run a real
  multi-node DAG, but nothing produces one yet.
- **No streaming.** `POST /execute` blocks until Ollama's full response is
  ready.
- **No auth, no persistence across restarts, no plugin system yet.** The
  Execution store is in-memory; the Ollama provider is wired in by a
  composition root, not discovered dynamically (see
  [ADR 0004](./docs/adr/0004-apps-may-depend-on-plugins.md)).

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
