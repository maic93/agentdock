# AgentDock — Technical Design Document

**Version:** 0.1 (Pre-Implementation Draft)
**Status:** Design Phase — No code written
**Audience:** Founding contributors, early adopters, architecture reviewers

---

## 1. Project Understanding

AgentDock is conceived as an **AI Operating System** rather than an application. The distinction matters architecturally: an application solves one workflow well; an operating system provides the substrate (process management, resource abstraction, scheduling, security boundaries) on top of which many workflows can be composed, run, and extended by third parties.

Concretely, AgentDock accepts a **goal** expressed in natural language, decomposes it into an executable plan, selects the right combination of AI models and tools to satisfy each step, executes that plan with validation and retry logic, and returns a result — without the user ever choosing a model, tool, or provider.

This is a request-driven, plugin-extensible orchestration platform, not a chatbot with extra buttons.

---

## 2. Mission Statement

> Enable anyone to accomplish complex, multi-step digital work by describing what they want — not how to get it — while giving technical users full control, transparency, and extensibility over how that work actually happens.

---

## 3. Vision

In three to five years, AgentDock should be to AI agents what Kubernetes became to container orchestration, or what an operating system kernel is to application software: an unglamorous, trusted, extensible substrate that most users never think about directly, but that a large ecosystem of plugins, providers, and downstream products is built on.

Success looks like:
- A self-hostable core that runs on a laptop or a homelab with zero cloud dependency.
- A plugin ecosystem where adding a new model provider, tool, or workflow template is a well-documented, low-friction contribution.
- A routing layer trusted enough that power users leave it in "automatic" mode rather than pinning models manually.

---

## 4. Scope

**In scope (v1 architecture target):**
- Goal intake, intent classification, task decomposition, planning.
- Multi-model routing across local and remote providers.
- Tool/plugin execution framework with sandboxing.
- Artifact management (files, images, code, documents produced by tasks).
- Memory/knowledge base for context persistence across sessions.
- Scheduling for recurring/background jobs.
- Web UI and API as two first-class, equally-capable interfaces.
- Self-hosted deployment via containers, on Linux/macOS/Windows.

**Explicitly out of scope for v1:**
- Training or fine-tuning models.
- Being a general-purpose consumer chat app (chat is one interface, not the product).
- Multi-tenant SaaS billing/metering infrastructure (may come later as an optional hosted layer, architecturally decoupled from core).
- Mobile native apps (API-first means these can come later without core changes).

---

## 5. Non-Goals

Explicitly stating what AgentDock will **not** try to be avoids scope creep that kills open-source infrastructure projects:

- Not a model provider itself — it orchestrates providers, never trains or serves foundation models.
- Not a replacement for provider-specific power tools (e.g., it won't try to out-IDE a dedicated coding IDE; it will delegate to coding-capable agents/models instead).
- Not opinionated about a single "best" LLM — the AI Router's job is comparative, not evangelistic.
- Not a walled garden — no architectural lock-in that prevents users from exporting data, workflows, or switching providers.

---

## 6. User Personas

1. **The Self-Hoster / Privacy-Conscious Power User** — runs Ollama locally, wants goals executed without data leaving their machine when possible, comfortable editing YAML/config.
2. **The Builder / Indie Developer** — wants to compose custom agents and workflows via the plugin system, contributes tools back to the ecosystem.
3. **The Non-Technical End User** — just wants to type "make me a landing page for my bakery" and get a result, never touches configuration.
4. **The Contributor / OSS Maintainer** — cares about clean module boundaries, test coverage, and predictable extension points more than end-user UX.
5. **The Enterprise Evaluator** — wants to self-host on-prem, needs auditability, RBAC, and the ability to disable/allowlist specific providers for compliance reasons.

---

## 7. Primary Use Cases

- "Build a complete web application" → multi-step: plan → scaffold → code → test → deploy artifact.
- "Debug this project" → repo analysis → root-cause hypothesis → patch proposal → validation.
- "Generate and edit an image" → prompt refinement → image model selection → generation → iterative edit loop.
- "Research X and summarize" → search → source evaluation → synthesis → cited report artifact.
- "Every Monday, summarize my GitHub notifications" → scheduled recurring job registered with the Scheduler, using stored credentials/connectors.
- "Turn this repo into documentation" → repo analysis → doc generation → artifact delivery.

---

## 8. Functional Requirements

- FR1: Accept natural-language goals via UI and API.
- FR2: Classify intent and decompose goals into a directed task graph.
- FR3: Select models/tools per task based on capability, cost, latency, and availability — automatically, with manual override available.
- FR4: Execute tasks with defined timeouts, retries, and fallback providers.
- FR5: Validate outputs against task-specific success criteria before marking complete.
- FR6: Persist artifacts (files, code, images, docs) with versioning.
- FR7: Maintain per-user and per-project memory/context retrievable across sessions.
- FR8: Support long-running and scheduled/recurring jobs.
- FR9: Allow third-party plugins to register new tools, providers, and workflow templates without modifying core.
- FR10: Provide full execution transparency (what ran, which model, why, at what cost).
- FR11: Support authentication, per-user isolation, and role-based access control.

---

## 9. Non-Functional Requirements

- **Reliability:** partial failures in one task must not corrupt the overall plan state; plans must be resumable.
- **Security:** tool execution must be sandboxed; secrets never logged; plugins run with least-privilege by default.
- **Performance:** routing decisions should add negligible latency (target: <200ms overhead) relative to model inference time.
- **Portability:** must run identically via containers on Linux, macOS, and Windows (WSL2 acceptable for Windows).
- **Observability:** every plan execution must be traceable end-to-end (structured logs + metrics + optional tracing).
- **Extensibility:** adding a provider or tool should require no core code changes — only a new plugin package.
- **Data ownership:** users can export/delete all their data and artifacts at will.
- **Cost-awareness:** routing should expose and optionally optimize for cost, not just quality.

---

## 10. High-Level Architecture

AgentDock is best modeled as a **layered, event-driven system** with a strict separation between orchestration (the "kernel") and capability (providers, tools, plugins — the "userland").

```
┌─────────────────────────────────────────────────────────┐
│                     Interfaces Layer                     │
│              Web UI        API        CLI (future)       │
└───────────────────────────┬───────────────────────────────┘
                             │
┌───────────────────────────▼───────────────────────────────┐
│                  Orchestration Kernel                      │
│  Task Planner → Workflow Engine → AI Router → Tool Registry│
│         Event Bus (backbone connecting all of the above)   │
└───────────────────────────┬───────────────────────────────┘
                             │
┌───────────────────────────▼───────────────────────────────┐
│                  Capability Layer (Plugins)                │
│  Model Providers | Tools | Connectors | Workflow Templates │
└───────────────────────────┬───────────────────────────────┘
                             │
┌───────────────────────────▼───────────────────────────────┐
│                    Foundation Layer                        │
│  Memory | Knowledge Base | Artifact Store | DB | Auth |     │
│  Scheduler | Config | Logging/Monitoring                   │
└─────────────────────────────────────────────────────────────┘
```

Key architectural decision: **the kernel never imports a specific provider or tool directly.** All capability is registered through the Provider Abstraction and Tool Registry interfaces at runtime. This is what makes "local-first, provider-agnostic" enforceable rather than aspirational.

---

## 11. Core Modules

| Module | Purpose |
|---|---|
| Web UI | Human-facing goal intake, plan visualization, artifact review |
| API | Programmatic goal intake, same capabilities as UI, auth-gated |
| Agent Runtime | Executes individual task steps, manages tool-call loops |
| Task Planner | Converts a goal into a task graph (DAG) with dependencies |
| Workflow Engine | Executes the task graph, handles retries/branching/parallelism |
| AI Router | Chooses the best model per task given constraints |
| Prompt Builder | Assembles context-aware prompts per model/task type |
| Model Registry | Catalog of available models with capability metadata |
| Provider Abstraction | Uniform interface over Ollama, OpenAI, Anthropic, Google, OpenRouter, etc. |
| Tool Registry | Catalog of available tools/plugins with capability metadata |
| Memory | Short/long-term contextual memory per user/project |
| Knowledge Base | Durable, queryable domain knowledge (RAG-style) |
| Search | Web/document search abstraction, provider-agnostic |
| File Manager | Reads/writes files within sandboxed workspaces |
| Artifact Manager | Versioned storage/retrieval of task outputs |
| Scheduler | Cron-like and event-triggered recurring job execution |
| Authentication | Identity, sessions, RBAC |
| Plugin System | Discovery, sandboxing, lifecycle of third-party extensions |
| Event Bus | Async pub/sub backbone connecting all modules |
| Logging | Structured, queryable execution logs |
| Monitoring | Metrics, health checks, cost/usage tracking |
| Configuration | Layered config (defaults → file → env → runtime override) |
| Database Layer | Persistence abstraction (plans, artifacts, memory metadata) |

---

## 12. Responsibilities of Each Module

**Task Planner** — Owns intent classification and decomposition only. It does not execute anything; it emits a task graph (nodes = tasks with required capabilities, edges = dependencies) to the Workflow Engine. Should be swappable (e.g., a simpler heuristic planner vs. an LLM-driven planner) behind one interface.

**Workflow Engine** — Owns execution order, parallelism, retries, and state persistence of the task graph. It is a state machine, not a planner — it never decides *what* to do, only *when and how* to run what the Planner produced.

**AI Router** — Given a task's declared capability requirement (e.g., "code generation," "image generation," "fast reasoning"), and constraints (cost ceiling, latency budget, local-only flag, privacy tier), selects a specific model from the Model Registry. Falls back automatically on provider failure.

**Prompt Builder** — Model-specific prompt assembly (different models need different system prompt conventions, context windows, and tool-calling formats). Decouples "what context is needed" from "how to phrase it for model X."

**Tool Registry / Plugin System** — Tools are plugins; the registry is metadata (capability tags, required permissions, sandbox profile) while the Plugin System handles discovery, versioning, and sandboxed execution.

**Memory / Knowledge Base** — Memory is conversational/session continuity (short-lived, per-interaction); Knowledge Base is durable, explicitly curated or ingested domain knowledge (long-lived, queryable via retrieval). Keeping these as separate modules avoids the common failure mode of conflating "what was said" with "what is true/known."

**Artifact Manager** — Every file, image, doc, or code output a task produces is an artifact with lineage (which plan/task produced it, from which inputs). This is what makes retries and audits possible.

**Scheduler** — Turns a goal or workflow template into a recurring trigger (cron expression or event condition), re-invoking the Task Planner/Workflow Engine at trigger time rather than persisting a single static plan.

**Event Bus** — The nervous system: task-started, task-completed, task-failed, artifact-created, etc. All modules publish/subscribe rather than calling each other directly, which keeps coupling low and makes the system observable by construction.

---

## 13. Module Interaction Flow (Typical Request)

1. User submits a goal via Web UI or API.
2. API validates auth, publishes `goal.submitted` event.
3. Task Planner consumes the event, produces a task graph, publishes `plan.created`.
4. Workflow Engine consumes the plan, begins executing ready tasks (no unmet dependencies).
5. For each task, Workflow Engine asks AI Router for a model (if the task needs one) and/or Tool Registry for a tool.
6. Prompt Builder assembles the model-specific prompt using Memory/Knowledge Base context.
7. Agent Runtime executes the task (model call and/or tool call), streaming progress via the Event Bus.
8. Output is validated against the task's success criteria; on failure, Workflow Engine retries (possibly routing to a different model/tool) up to a configured limit.
9. Successful outputs are persisted via Artifact Manager.
10. When all tasks complete, Workflow Engine publishes `plan.completed`; UI/API surfaces the final result and artifacts to the user.

Scheduled goals follow the same flow, just triggered by the Scheduler instead of a live user submission.

---

## 14. Data Flow

- **Control-plane data** (plans, task states, routing decisions) lives in the Database Layer (relational store recommended — this data is highly relational: plans → tasks → attempts → artifacts).
- **Content-plane data** (actual file bytes, generated images, large documents) lives in the Artifact Manager, backed by object storage (local filesystem in self-hosted mode, S3-compatible in cloud mode) — never inline in the relational DB.
- **Context data** (memory, knowledge base embeddings) lives in a vector-capable store, referenced by ID from the control plane, not duplicated into it.
- **Events** flow through the Event Bus and are optionally persisted to an append-only log for replay/audit, separate from the queryable control-plane DB.

This three-way split (control plane / content plane / context plane) is deliberate: it lets each be scaled, backed up, and swapped independently.

---

## 15. AI Routing Philosophy

1. **Capability-first, brand-agnostic.** Tasks declare required capabilities ("code-gen," "long-context-reasoning," "image-gen," "fast-cheap-edit"), never a specific model name, by default.
2. **Local-first when sufficient.** If a local model meets the declared quality bar for a task, prefer it before considering a remote/paid provider. "Sufficient" is a configurable threshold, not a hardcoded rule.
3. **Multi-model collaboration is normal, not exceptional.** A single goal routinely spans several models — this must be a first-class pattern in the Router's API, not a special case bolted on later.
4. **Deterministic fallback chains.** Every capability should map to an ordered list of candidate providers, not a single point of failure.
5. **Transparency over magic.** Users can always inspect (and override) why a given model was chosen for a given task.
6. **Cost and latency are routing inputs, not afterthoughts.** The Router should accept constraints like "optimize for cost" or "optimize for speed" per goal or globally.

---

## 16. Task Planning Philosophy

- Plans are **directed acyclic graphs**, not linear scripts — this is what enables parallel execution of independent subtasks (e.g., generating an image and writing copy simultaneously).
- Plans are **re-plannable mid-execution**: if a task fails in a way that invalidates downstream assumptions, the Planner can be re-invoked with the updated state rather than the whole workflow failing outright.
- Planning granularity is a tunable: trivial goals should skip elaborate planning entirely (a single-task "plan" is valid and common), avoiding unnecessary overhead for simple requests.
- Task success criteria should be **explicit and checkable** wherever possible (schema validation, test execution, output format checks) rather than relying solely on a model's self-assessment.

---

## 17. Plugin Philosophy

- A plugin can register one or more of: a **model provider**, a **tool**, a **workflow template**, or a **connector** (e.g., GitHub, Slack).
- Plugins declare a manifest (capabilities provided, permissions required, sandbox profile) — the core never trusts a plugin's runtime behavior implicitly.
- Plugins are versioned and independently installable/removable without core redeploys — this is the primary lever for community growth.
- A reference plugin (e.g., an Ollama provider plugin and a web-search tool plugin) should ship with core as documentation-by-example, not as special-cased core code.

---

## 18. Security Philosophy

- **Sandboxed execution by default** for any tool that touches the filesystem, network, or shell — containerized or process-isolated, with explicit, minimal permission grants per plugin.
- **Secrets management** is centralized (never stored in plaintext config, never logged, never passed through the Event Bus in cleartext).
- **Least privilege for plugins**: a plugin declares exactly what it needs (network egress, filesystem paths, specific env vars) and is denied everything else by default.
- **Auditability**: every tool call and model call is logged with inputs/outputs (with configurable redaction for sensitive data) for post-hoc review.
- **RBAC at the API boundary**: multi-user deployments must be able to restrict which providers, tools, and data a given user/role can access.
- **Supply-chain caution for plugins**: a plugin signing/verification mechanism should be part of the v1 design even if enforcement is opt-in initially.

---

## 19. Local-First Philosophy

- Local providers (starting with Ollama) are peers to remote providers in the Provider Abstraction, not a secondary/fallback tier bolted on.
- A "privacy tier" flag should be attachable to any goal or task, forcing local-only execution regardless of quality trade-offs, for privacy-sensitive workloads.
- The core system (planning, routing logic, workflow state) must function with zero network access beyond the local machine — remote providers are optional capability, not a hard dependency.
- Default configuration out-of-the-box should work entirely offline with a local model, even if the experience is more limited than with cloud models — "it works with nothing configured" is a strong onboarding requirement.

---

## 20. Technology Recommendations (With Reasoning)

These are recommendations for the design phase, not commitments — they should be validated against contributor familiarity and prototyping before being locked in.

- **Backend language:** A statically-typed language (e.g., TypeScript/Node or Go) for the orchestration kernel — both have mature async ecosystems, strong container tooling, and lower the barrier for OSS contributors compared to more niche choices. Go is attractive for the Workflow Engine specifically (strong concurrency primitives, single static binary simplifies self-hosting); TypeScript is attractive if the Web UI and API should share types end-to-end.
- **Database:** PostgreSQL for the control plane — relational integrity for plans/tasks/artifacts metadata, mature, self-hostable, and has a good extension ecosystem (e.g., pgvector) which could reduce the number of moving parts for the context plane too.
- **Vector/context store:** Start with pgvector (fewer moving parts for self-hosters) with the Knowledge Base module abstracted so a dedicated vector DB (Qdrant, etc.) can be swapped in later for scale.
- **Object storage:** Local filesystem adapter by default, S3-compatible interface (MinIO-compatible) for cloud/scale deployments, behind one Artifact Manager interface.
- **Event Bus:** An embeddable option (e.g., NATS) that can run as a single self-hosted binary for small deployments but scales horizontally for larger ones — avoids forcing a heavyweight Kafka dependency on a self-hoster running on a laptop.
- **Containerization:** Docker Compose as the default self-hosting path; Helm charts as a later addition for Kubernetes-based cloud deployments.
- **Frontend:** A component framework with strong ecosystem support (React or similar) for the Web UI, communicating with the API exclusively over documented public endpoints (dogfooding the API ensures it stays genuinely first-class rather than an afterthought).

---

## 21. Monorepo vs. Polyrepo Recommendation

**Recommendation: Monorepo for core, polyrepo for the plugin ecosystem.**

Reasoning:
- The Orchestration Kernel's modules (Planner, Workflow Engine, Router, Registries, Event Bus) are tightly interdependent during this early design phase where interfaces are still being discovered — a monorepo lets those interfaces evolve together with atomic commits, which is much harder across repo boundaries.
- Plugins (providers, tools, connectors) are, by design, meant to be independently developed and versioned by third parties — forcing them into the core monorepo would contradict the "plugins without core changes" goal. These belong in their own repos (community-owned or under an `agentdock-plugins` org), discovered via a registry/manifest system rather than repo co-location.
- A monorepo for core also simplifies CI, versioning, and cross-module refactors during the pre-1.0 phase when internal interfaces are still shifting; splitting too early tends to fossilize interfaces before they're proven.

---

## 22. Suggested Repository Structure

*(Structure only — no actual files/configs are being generated per the design-only constraint.)*

```
agentdock/
├── apps/
│   ├── web/                 # Web UI application
│   └── api/                 # API application (public surface)
├── packages/
│   ├── kernel/
│   │   ├── planner/
│   │   ├── workflow-engine/
│   │   ├── ai-router/
│   │   ├── prompt-builder/
│   │   ├── model-registry/
│   │   ├── tool-registry/
│   │   └── event-bus/
│   ├── providers/
│   │   └── provider-abstraction/     # interfaces only; concrete providers are plugins
│   ├── foundation/
│   │   ├── memory/
│   │   ├── knowledge-base/
│   │   ├── artifact-manager/
│   │   ├── scheduler/
│   │   ├── auth/
│   │   ├── config/
│   │   └── db/
│   └── shared/
│       ├── types/
│       └── sdk/               # plugin-authoring SDK
├── plugins/                   # first-party reference plugins only (ollama, web-search, filesystem tool)
├── docs/
│   ├── architecture/
│   ├── plugin-guide/
│   └── adr/                   # architecture decision records
└── examples/
    └── workflow-templates/
```

Third-party plugins live outside this repo entirely, published to a package registry and discovered at runtime via the Plugin System.

---

## 23. Risks and Trade-Offs

| Risk | Trade-off / Mitigation |
|---|---|
| Over-engineering the kernel before any real usage validates the abstractions | Build a thin vertical slice (one goal type, one provider, one tool) end-to-end before generalizing further |
| Routing complexity balloons (too many constraints/heuristics) | Start with a simple rule-based router; defer learned/adaptive routing to a later version |
| Plugin sandboxing adds significant engineering cost early | Ship a coarse-grained sandbox (container-per-tool-call) first; refine isolation granularity later |
| "Automatic everything" frustrates power users who want control | Every automatic decision must have an explicit, discoverable override — this is a hard requirement, not a nice-to-have |
| Local-first commitment limits quality on constrained hardware | Make the quality/local trade-off a visible, configurable dial rather than a hidden default |
| Monorepo for core could slow contributor onboarding if tooling is heavy | Invest early in fast, well-documented local dev setup (this is often the actual onboarding blocker, not repo shape) |
| Event Bus becomes a hidden coupling point if event schemas aren't versioned | Treat event schemas as a public contract with the same rigor as API endpoints |
| Cost of supporting "any provider" indefinitely | Define a minimal Provider Abstraction interface early and resist provider-specific leakage into the kernel |

---

## 24. Future Roadmap (Indicative, Post-Core)

- **Phase 0:** Kernel + one local provider (Ollama) + one remote provider + minimal tool set (file, search) + Docker Compose self-host. Prove the end-to-end loop.
- **Phase 1:** Plugin SDK + plugin discovery/registry + first community-contributed plugins.
- **Phase 2:** Scheduler + recurring workflows + connectors (GitHub, Slack, email).
- **Phase 3:** Knowledge Base/RAG maturity, multi-project memory isolation, RBAC for multi-user self-hosted deployments.
- **Phase 4:** Optional hosted/cloud offering built strictly on top of the same public API (no architectural divergence from the self-hosted core).
- **Phase 5:** Learned/adaptive routing (informed by real usage data on cost/quality/latency trade-offs per task type).

---

## 25. Open Questions to Resolve Before Implementation

1. What is the minimal viable task-success-validation mechanism for the first release — schema checks only, or something richer (test execution, model-graded validation)?
2. How opinionated should default workflow templates be for common goals (e.g., "build a web app") versus leaving that entirely to the Planner at runtime?
3. What's the concurrency/isolation model for a single user running multiple goals simultaneously — shared workspace or fully isolated per-goal sandboxes?
4. Should Memory and Knowledge Base share a storage backend in v1 for simplicity, accepting the conflation risk, or be separate from day one?
5. What's the plugin trust model at launch — fully open install, or a curated/reviewed registry initially with open publishing later?
6. How is cost attribution/tracking handled when a single goal spans multiple paid providers — per-task, per-plan, or both?
7. What's the minimum viable RBAC model for self-hosted multi-user setups — is single-tenant-per-instance acceptable for v1, deferring true multi-tenancy?
8. Should the Workflow Engine support human-in-the-loop approval steps (pause plan, wait for user confirmation) in v1, given how central this is to trust for higher-stakes goals (e.g., code deployment, sending emails)?

---

## Self-Critique

**Strengths of this design:**
- The kernel/capability/foundation layering and the "core never imports a specific provider" rule are the load-bearing decisions — they're what actually make "local-first, provider-agnostic, plugin-based" enforceable rather than marketing language.
- Separating control-plane, content-plane, and context-plane data early avoids a common failure mode in agent frameworks where everything ends up crammed into one relational schema and becomes unmaintainable as artifact/context volume grows.
- Treating plans as DAGs rather than linear scripts from day one avoids a costly rewrite later, since parallelism and re-planning are hard to retrofit onto a linear execution model.

**Weaknesses and honest trade-offs:**
- This design is **ambitious relative to a genuinely empty repository**. The gap between "AI Operating System with 22 modules" and a first working vertical slice is large; the biggest execution risk isn't the architecture, it's the discipline to *not* build all 22 modules before validating the core loop with one provider and one tool.
- The routing philosophy (capability-first, cost/latency-aware, local-preferred) is well-reasoned but genuinely hard to implement well — real-world routing quality depends on capability metadata that's tedious to keep accurate as models change weekly. This will likely need more iteration than any other subsystem, and the document may be understating that cost.
- The plugin sandboxing/security model is described at the philosophy level but sandboxing arbitrary third-party tool code safely and *conveniently* (without making every plugin author fight the sandbox) is a genuinely hard, unsolved-in-general problem — this deserves its own dedicated design pass, likely informed by prior art (e.g., how VS Code, Obsidian, or browser extension platforms handle it), before implementation.
- The monorepo recommendation optimizes for pre-1.0 velocity but under-specifies how/when core modules would eventually be allowed to split out (if ever) — that transition criterion should probably be an explicit ADR rather than left implicit.
- "Automatic everything, with override always available" is stated as a hard requirement but isn't yet reflected in a concrete UX or API contract — this needs to be a first-class design artifact of its own (not just a principle) before implementation starts, or it will get quietly dropped under time pressure.
