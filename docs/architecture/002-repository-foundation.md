# AgentDock — Repository Foundation Design Document

**Version:** 0.1 (Pre-Implementation Draft)
**Status:** Design Phase — No code, configs, or folders generated
**Depends on:** AgentDock Technical Design Document v0.1 (Prompt 001, approved)
**Scope of this document:** Repository structure, tooling, standards, and governance only. No architectural decisions from the approved design are revisited.

---

## 1. Repository Blueprint

The repository is organized around the layering established in the approved architecture: **apps** (interfaces), **kernel** (orchestration), **foundation** (infrastructure services), **providers** (abstraction only — concrete providers are external plugins), **shared** (cross-cutting contracts), and **first-party reference plugins**. Everything else (docs, examples, tooling, infra, tests) surrounds this core.

```
agentdock/
├── apps/
│   ├── web/
│   ├── api/
│   └── cli/                        # future, stubbed early for interface parity
│
├── packages/
│   ├── kernel/
│   │   ├── planner/
│   │   ├── workflow-engine/
│   │   ├── ai-router/
│   │   ├── prompt-builder/
│   │   ├── model-registry/
│   │   ├── tool-registry/
│   │   └── event-bus/
│   │
│   ├── foundation/
│   │   ├── memory/
│   │   ├── knowledge-base/
│   │   ├── artifact-manager/
│   │   ├── scheduler/
│   │   ├── auth/
│   │   ├── config/
│   │   ├── db/
│   │   └── observability/          # logging + monitoring, split from kernel per SRP
│   │
│   ├── providers/
│   │   └── provider-abstraction/
│   │
│   └── shared/
│       ├── types/
│       ├── sdk/                    # plugin-authoring SDK
│       ├── testing-utils/
│       └── ui-kit/                 # design system, consumed only by apps/web
│
├── plugins/                        # first-party REFERENCE plugins only
│   ├── provider-ollama/
│   ├── provider-openai/
│   ├── provider-anthropic/
│   ├── tool-web-search/
│   └── tool-filesystem/
│
├── docs/
│   ├── architecture/
│   ├── adr/
│   ├── rfcs/
│   ├── plugin-guide/
│   ├── contributing/
│   ├── api-reference/              # generated, not hand-written
│   └── tutorials/
│
├── examples/
│   ├── workflow-templates/
│   └── sample-plugins/
│
├── scripts/
│   ├── setup/
│   ├── release/
│   └── ci/
│
├── infra/
│   ├── docker/                     # compose files for self-hosting
│   ├── helm/                       # future, k8s deployment
│   └── terraform/                  # future, optional hosted-cloud reference infra
│
├── tests/
│   ├── e2e/
│   └── contract/
│
├── templates/
│   ├── plugin-template/
│   └── workflow-template-template/
│
└── .github/
    ├── ISSUE_TEMPLATE/
    ├── PULL_REQUEST_TEMPLATE.md
    └── workflows/
```

### Directory-by-directory rationale

**`apps/`**

- _Why it exists:_ Houses deployable, user-facing programs. Nothing in here is importable by anything outside itself.
- _What belongs:_ `web` (UI), `api` (public HTTP/gRPC surface), `cli` (future).
- _What never belongs:_ Business logic. Apps compose kernel/foundation packages and render/expose them; they do not implement orchestration logic themselves. An app with a "planner" file inside it is a boundary violation.

**`packages/kernel/`**

- _Why it exists:_ The orchestration brain, as defined in the approved architecture. Grouped together because these modules evolve in lockstep during pre-1.0.
- _What belongs:_ Planner, Workflow Engine, AI Router, Prompt Builder, Model Registry, Tool Registry, Event Bus.
- _What never belongs:_ Any concrete provider or tool implementation. Kernel code may depend on `provider-abstraction`'s interfaces, never on `plugins/provider-openai` or similar.

**`packages/foundation/`**

- _Why it exists:_ Infrastructure-facing services the kernel and apps both need, but which are not orchestration logic themselves.
- _What belongs:_ Memory, Knowledge Base, Artifact Manager, Scheduler, Auth, Config, DB access layer, Observability.
- _What never belongs:_ Task-graph or routing logic — foundation packages are consumed by the kernel, they don't contain kernel decisions.

**`packages/providers/provider-abstraction/`**

- _Why it exists:_ A single, minimal, stable interface that all model/search/tool providers implement. Kept separate from `foundation` because it's a contract, not a service.
- _What belongs:_ Interfaces, type definitions, provider capability schemas, a provider test-conformance kit.
- _What never belongs:_ Any concrete provider implementation (those are plugins, deliberately outside `packages/`).

**`packages/shared/`**

- _Why it exists:_ Cross-cutting code with no home in kernel/foundation, needed by multiple apps or packages.
- _What belongs:_ Shared TypeScript types/schemas, the plugin-authoring SDK, shared testing utilities, the UI design system.
- _What never belongs:_ Anything with orchestration or business logic — if it has a decision to make, it's not "shared," it belongs in kernel or foundation.

**`plugins/`**

- _Why it exists:_ Proves the plugin system works, and gives contributors copyable reference implementations. Deliberately kept minimal.
- _What belongs:_ A small number of first-party provider and tool plugins, built strictly against the public plugin SDK — no special internal access.
- _What never belongs:_ The bulk of the plugin ecosystem. Third-party and most community plugins live in **separate repositories** and are discovered via the plugin registry at runtime, not committed here. This directory must never become a dumping ground for "just one more provider," or it silently defeats the plugin architecture's purpose.

**`docs/`**

- _Why it exists:_ Documentation is a first-class deliverable for a project targeting 1000+ contributors, not an afterthought.
- _What belongs:_ Architecture docs, ADRs, RFCs, plugin guides, contribution guides, generated API reference, tutorials.
- _What never belongs:_ Docs that only make sense next to one specific package's code (those live as a `README.md` inside that package instead, and are aggregated into `docs/` by tooling, not duplicated by hand).

**`examples/`**

- _Why it exists:_ Working, runnable demonstrations, distinct from documentation prose.
- _What belongs:_ Sample workflow templates, sample plugins built from `templates/`.
- _What never belongs:_ Anything the core system depends on at runtime. Examples must be safely deletable without breaking a build.

**`scripts/`**

- _Why it exists:_ Centralizes automation so it's discoverable rather than scattered as one-off shell snippets in random package folders.
- _What belongs:_ Setup/bootstrap scripts, release automation, CI helper scripts.
- _What never belongs:_ Application or library logic. If a script grows business rules, that logic should move into a proper package and the script should just invoke it.

**`infra/`**

- _Why it exists:_ Deployment/infrastructure definitions, kept separate from application code so infra changes don't require touching (or reviewing against) app code ownership rules.
- _What belongs:_ Docker Compose files for self-hosting, Helm charts (future), optional Terraform reference configs (future).
- _What never belongs:_ Application configuration defaults (those live in `packages/foundation/config`) — infra provisions _where_ things run, not _how they behave_.

**`tests/e2e` and `tests/contract`**

- _Why it exists:_ Cross-package tests that don't belong to any single package (unit/integration tests live alongside the code they test, inside each package).
- _What belongs:_ Full end-to-end scenario tests (goal-in, artifact-out), and contract tests that verify plugins/providers conform to `provider-abstraction` interfaces.
- _What never belongs:_ Unit tests for a single module — those stay colocated with their source.

**`templates/`**

- _Why it exists:_ Scaffolding for contributors creating new plugins or workflow templates, generated via CLI tooling.
- _What belongs:_ Minimal, well-commented starter code structures.
- _What never belongs:_ Anything actually used at runtime by core.

---

## 2. Monorepo Tooling Recommendation

### Comparison

| Tool                        | Advantages                                                                                                                                                                                                                                                               | Disadvantages                                                                                                                                                                                                  |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **pnpm workspaces (alone)** | Fast, disk-efficient installs; strict dependency isolation (no phantom deps) by default; simple mental model; minimal config surface                                                                                                                                     | No built-in task orchestration, caching, or affected-package detection — you'd hand-roll CI logic                                                                                                              |
| **Yarn workspaces (alone)** | Mature, widely known                                                                                                                                                                                                                                                     | Similar gaps to pnpm-alone; less strict dependency isolation than pnpm by default (more prone to phantom dependency bugs at scale)                                                                             |
| **Turborepo**               | Very fast incremental builds via content-based caching (local + remote); simple config (`turbo.json`); low learning curve; works on top of pnpm/Yarn/npm workspaces rather than replacing them                                                                           | Less built-in tooling for code generation, dependency-graph linting, and enforced module boundaries compared to Nx; younger plugin ecosystem                                                                   |
| **Nx**                      | Strong built-in dependency-graph visualization and **enforced module boundary rules** (directly relevant to the Dependency Rules section below); powerful code generators; mature plugin ecosystem; scales well to very large monorepos (proven at that scale elsewhere) | Steeper learning curve; more configuration surface; can feel heavyweight for contributors used to plain package managers; some "magic" that can obscure what's actually happening under the hood for newcomers |
| **Bazel**                   | Best-in-class build correctness/hermeticity and scale (Google-proven at extreme scale)                                                                                                                                                                                   | Very steep learning curve, poor fit for a JS/TS-centric OSS project with a broad, mixed-experience contributor base; would actively hurt onboarding, contradicting a stated project goal                       |

### Recommendation: **pnpm workspaces + Nx**

**Justification:**

1. **Nx's enforced module boundaries directly solve the "prevent architecture erosion" requirement.** Nx supports tagging packages (e.g., `scope:kernel`, `scope:foundation`, `scope:apps`) and defining lint rules that make it a build-time error for a forbidden import to exist (e.g., `apps` importing a `kernel`-internal module directly, or a plugin importing kernel internals). This is not a convention enforced by documentation and code review alone — it's mechanically enforced. Given the target scale (1000+ contributors, 500+ plugins), relying on code review alone to catch boundary violations will fail; this needs to be caught in CI automatically.
2. **pnpm as the underlying package manager** for its strict, non-phantom dependency resolution and disk/install-speed efficiency — Nx is package-manager-agnostic and works well layered on top of pnpm workspaces rather than needing Yarn or npm.
3. **Turborepo was the closest alternative** and is genuinely excellent for caching/build speed, but it does not provide enforced dependency-graph boundary rules out of the box — that gap would have to be filled with custom ESLint import rules maintained by hand, which is exactly the kind of erosion risk this project needs to design against from day one, not patch in later.
4. Nx's code generators also directly support the "contributor onboarding" and "naming standards" goals below — `nx generate plugin` (as a project-authored generator, not code Claude is producing here) can scaffold a compliant plugin from `templates/` automatically, reducing the chance of naming/structure drift as the plugin count grows.

**Trade-off accepted:** Nx has a steeper learning curve than plain pnpm workspaces. This is mitigated by strong "Getting Started" documentation (Section 4) and by the fact that most day-to-day contributors interact with a handful of simple Nx commands (`nx serve`, `nx test`, `nx build`), not its advanced configuration.

---

## 3. Package Boundaries

For each package: purpose, public API surface, allowed/forbidden dependencies, who may import it, and what must stay internal.

### `packages/kernel/planner`

- **Purpose:** Convert a goal into a task graph (DAG).
- **Public API:** `planGoal(goal, context) -> TaskGraph`; task graph type definitions (re-exported from `shared/types`).
- **Dependencies allowed:** `shared/types`, `foundation/knowledge-base` (read-only, for context retrieval), `providers/provider-abstraction` (to query model capabilities, not to call models directly for non-planning purposes).
- **Dependencies forbidden:** `workflow-engine`, `ai-router`, any concrete provider or tool plugin, any `apps/*` package.
- **Who may import it:** `apps/api`, `kernel/workflow-engine` (to re-plan mid-execution), tests.
- **Must remain internal:** Internal heuristics/prompt strategies used to decompose goals; only the `TaskGraph` output shape is a public contract.

### `packages/kernel/workflow-engine`

- **Purpose:** Execute a task graph: ordering, parallelism, retries, state persistence.
- **Public API:** `executePlan(taskGraph) -> ExecutionHandle`; execution state/event types.
- **Dependencies allowed:** `shared/types`, `kernel/ai-router`, `kernel/tool-registry`, `kernel/event-bus`, `foundation/artifact-manager`, `foundation/db`.
- **Dependencies forbidden:** `apps/*`, `plugins/*` directly (must go through `tool-registry`/`ai-router`), `kernel/planner` internals (only its public `TaskGraph` output type).
- **Who may import it:** `apps/api`, `foundation/scheduler` (to trigger scheduled plan executions).
- **Must remain internal:** Retry/backoff internals, execution state machine implementation details.

### `packages/kernel/ai-router`

- **Purpose:** Select a concrete model for a task given declared capability + constraints.
- **Public API:** `selectModel(capability, constraints) -> ModelHandle`.
- **Dependencies allowed:** `kernel/model-registry`, `providers/provider-abstraction`, `shared/types`.
- **Dependencies forbidden:** Any concrete provider plugin package by name (must resolve dynamically through the registry, never a static import of e.g. `plugins/provider-openai`), `apps/*`.
- **Who may import it:** `kernel/workflow-engine`, `kernel/prompt-builder`.
- **Must remain internal:** Routing heuristics/weightings, fallback-chain ordering logic.

### `packages/kernel/tool-registry`

- **Purpose:** Catalog and resolve available tools for task execution.
- **Public API:** `resolveTool(capability) -> ToolHandle`; tool metadata schema.
- **Dependencies allowed:** `shared/types`, `shared/sdk` (to validate plugin manifests).
- **Dependencies forbidden:** Concrete tool plugins by static import, `apps/*`.
- **Who may import it:** `kernel/workflow-engine`.
- **Must remain internal:** Plugin discovery/loading mechanics.

### `packages/kernel/prompt-builder`

- **Purpose:** Assemble model-specific prompts from task context.
- **Public API:** `buildPrompt(task, modelHandle, context) -> Prompt`.
- **Dependencies allowed:** `shared/types`, `foundation/memory` (read-only), `foundation/knowledge-base` (read-only).
- **Dependencies forbidden:** `apps/*`, `foundation/db` directly (must go through `memory`/`knowledge-base` interfaces, not raw queries).
- **Who may import it:** `kernel/workflow-engine`, `kernel/ai-router` (for capability-aware prompt shaping).
- **Must remain internal:** Per-model prompt templates/heuristics.

### `packages/kernel/model-registry` and `kernel/event-bus`

- **Purpose:** Model metadata catalog; async pub/sub backbone, respectively.
- **Public API:** `registerModel`/`queryModels`; `publish`/`subscribe` with typed event schemas.
- **Dependencies allowed:** `shared/types` only.
- **Dependencies forbidden:** Everything else in `kernel/foundation` (these two are meant to be the most dependency-free packages in the system, since nearly everything depends on them).
- **Who may import it:** Broadly importable across `kernel/*` and `foundation/*`.
- **Must remain internal:** N/A — these are thin, mostly-public-surface packages by design.

### `packages/foundation/*` (memory, knowledge-base, artifact-manager, scheduler, auth, config, db, observability)

- **Purpose:** Infrastructure services consumed by the kernel and apps.
- **Public API:** One typed service interface per package (e.g., `MemoryStore`, `ArtifactManager`), never raw DB access exposed outward.
- **Dependencies allowed:** `shared/types`, `foundation/db` (for packages that need persistence), `foundation/config`.
- **Dependencies forbidden:** `kernel/*` (foundation must never depend upward on kernel — this is one of the most important dependency-direction rules, see Section 4), `apps/*`, `plugins/*`.
- **Who may import it:** `kernel/*`, `apps/*`.
- **Must remain internal:** Storage schema details, migration internals — only the service interface is public.

### `packages/providers/provider-abstraction`

- **Purpose:** The contract every model/search/tool provider implements.
- **Public API:** `ModelProvider`, `SearchProvider`, `ToolProvider` interfaces; a conformance test kit for plugin authors.
- **Dependencies allowed:** `shared/types` only.
- **Dependencies forbidden:** Everything else — this package must be the most stable, least-dependent package in the repo, since hundreds of external plugins depend on it.
- **Who may import it:** `kernel/*`, all `plugins/*`, all external community plugins.
- **Must remain internal:** Nothing — this is intentionally the most public package in the system.

### `packages/shared/sdk`

- **Purpose:** Plugin-authoring SDK (manifest schema, lifecycle hooks, sandboxing helpers).
- **Public API:** Everything in it, by definition — this is the primary contract for third-party developers.
- **Dependencies allowed:** `shared/types`, `providers/provider-abstraction`.
- **Dependencies forbidden:** `kernel/*` internals, `foundation/*` internals (the SDK must not leak core internals to plugin authors).
- **Who may import it:** All `plugins/*`, all external plugins.
- **Must remain internal:** N/A, public by design; must be held to the strictest backward-compatibility/semver discipline in the repo since it's the most widely depended-upon external contract.

### `plugins/*`

- **Purpose:** Concrete, sandboxed implementations of providers/tools.
- **Public API:** Whatever `shared/sdk` requires them to expose (manifest + capability implementation).
- **Dependencies allowed:** `shared/sdk`, `providers/provider-abstraction`, `shared/types`, third-party libraries specific to that plugin's integration.
- **Dependencies forbidden:** `kernel/*` (any layer), `foundation/*` (any layer), other plugins directly, `apps/*`. This is the single most important forbidden-dependency rule in the whole repo.
- **Who may import it:** Nothing within the repo statically imports a plugin — plugins are loaded dynamically at runtime via `tool-registry`/`ai-router` resolution.
- **Must remain internal:** Everything not exposed through the SDK-mandated interface.

### `apps/web`, `apps/api`

- **Purpose:** User-facing interfaces.
- **Public API:** N/A (apps are leaves in the dependency graph; nothing imports them).
- **Dependencies allowed:** `kernel/*` (through their public APIs only), `foundation/*` (through their public APIs only), `shared/*`.
- **Dependencies forbidden:** `plugins/*` directly, any package's internal (non-exported) modules, `foundation/db` raw access.
- **Who may import it:** No other package should ever import an app.
- **Must remain internal:** Everything — apps have no consumers within the monorepo.

---

## 4. Dependency Rules

The core invariant: **dependencies flow inward and downward, never outward or upward, and never sideways across plugin boundaries.**

```
apps/*  ──depends on──▶  kernel/* , foundation/*  ──depends on──▶  shared/*
   │                                                                  ▲
   └────────────────────── never the reverse ────────────────────────┘

kernel/*      ──depends on──▶  providers/provider-abstraction , shared/*
foundation/*  ──depends on──▶  shared/*                (never kernel/*)
plugins/*     ──depends on──▶  shared/sdk , providers/provider-abstraction , shared/types
                                              (never kernel/* or foundation/* or other plugins)
```

Explicit rules, stated as enforceable Nx boundary constraints:

1. **UI cannot import the database directly.** `apps/web` must go through `apps/api`, which itself only reaches persistence through `foundation/db`'s service interfaces — never raw queries from an app.
2. **Planner cannot import concrete providers directly.** `kernel/planner` may query `providers/provider-abstraction` for capability metadata, but must never import a specific plugin like `plugins/provider-openai`. Model selection is the AI Router's job, not the Planner's.
3. **Plugins cannot access kernel internals.** `plugins/*` may only depend on `shared/sdk` and `providers/provider-abstraction`. A plugin importing anything from `kernel/*` or `foundation/*` is a build-breaking violation, enforced by Nx module boundary tags, not just review.
4. **Foundation packages must not depend on applications**, and must not depend on `kernel/*` either — foundation sits _below_ the kernel in the dependency graph, providing services the kernel consumes, never the reverse. A `foundation/memory` package that imports something from `kernel/workflow-engine` indicates a layering mistake.
5. **No package may import another package's non-exported internals** — every package has exactly one public entry point (its `index`), and deep-importing into another package's internal folders is forbidden and lint-enforced.
6. **`shared/*` packages may depend only on each other or on nothing** — they are the foundation of the foundation, and must never depend upward on `kernel/*`, `foundation/*`, `providers/*`, or `apps/*`.
7. **No circular dependencies between packages, ever** — enforced automatically via Nx's dependency graph checks in CI; a PR introducing a cycle fails the build regardless of review sign-off.
8. **Cross-plugin dependencies are forbidden.** One plugin must never import another plugin. If two plugins need to share logic, that logic belongs in `shared/sdk` or a new shared package, promoted deliberately, not borrowed sideways.

These rules are enforced via Nx's project tagging (e.g., `scope:kernel`, `scope:foundation`, `scope:shared`, `scope:app`, `type:plugin`) combined with `depConstraints` rules that fail CI on violation — this is a mechanical guarantee, not a style guideline, which is essential at the target contributor scale.

---

## 5. Naming Standards

| Category              | Convention                                                                 | Example                                                     |
| --------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Packages              | `kebab-case`, scoped npm-style: `@agentdock/<layer>-<name>`                | `@agentdock/kernel-planner`                                 |
| Folders               | `kebab-case`                                                               | `workflow-engine/`                                          |
| Files                 | `kebab-case.ts`, test files `*.spec.ts` colocated                          | `task-graph.ts`, `task-graph.spec.ts`                       |
| Interfaces            | `PascalCase`, no `I` prefix (modern TS convention)                         | `ModelProvider`, `TaskGraph`                                |
| Classes               | `PascalCase`                                                               | `WorkflowEngine`                                            |
| Types                 | `PascalCase`                                                               | `TaskStatus`                                                |
| Enums                 | `PascalCase` name, `PascalCase` members                                    | `enum TaskState { Pending, Running, Failed }`               |
| Events                | `<domain>.<past-tense-verb>`, dot-namespaced                               | `plan.created`, `task.failed`                               |
| Commands              | `<Verb><Noun>Command`, imperative                                          | `ExecuteTaskCommand`                                        |
| Queries               | `<Verb><Noun>Query`, imperative, read-only intent explicit                 | `GetPlanStatusQuery`                                        |
| Database tables       | `snake_case`, plural                                                       | `task_executions`, `artifacts`                              |
| API routes            | `kebab-case`, versioned, resource-plural REST convention                   | `/v1/plans`, `/v1/plans/:id/tasks`                          |
| Plugin IDs            | reverse-DNS-style namespacing to prevent collisions at 500+ plugin scale   | `dev.agentdock.provider.ollama`, `com.acme.tool.pdf-export` |
| Environment variables | `SCREAMING_SNAKE_CASE`, prefixed by subsystem                              | `AGENTDOCK_DB_URL`, `AGENTDOCK_AI_ROUTER_DEFAULT_TIER`      |
| Docker images         | `agentdock/<component>:<semver-or-tag>`                                    | `agentdock/api:1.4.0`                                       |
| Git branches          | `<type>/<short-description>`, types: `feat`, `fix`, `chore`, `docs`, `rfc` | `feat/scheduler-cron-triggers`                              |
| Git tags              | Semantic versioning, `v` prefixed                                          | `v1.4.0`, `v2.0.0-beta.1`                                   |

Naming standards are enforced via a shared ESLint config plus Nx generators (Section 2) so that scaffolded code is compliant by construction rather than by post-hoc review correction.

---

## 6. Documentation Strategy

Documentation is treated as a tested, versioned deliverable — not prose that drifts from reality.

- **README.md (root):** Elevator pitch, quickstart, links out to everything below. Kept intentionally short — it's a front door, not a manual.
- **Getting Started (`docs/`):** Zero-to-running-locally in under 10 minutes, for both "just try it" (Docker Compose) and "I want to contribute code" (full dev setup) paths, kept as two clearly separate tracks.
- **Architecture (`docs/architecture/`):** The approved Prompt 001 design document and this repository design document live here as the canonical source of truth, kept up to date as the system evolves — with ADRs (below) capturing _why_ things changed rather than editing history away.
- **Plugin Development Guide (`docs/plugin-guide/`):** The single most important doc for ecosystem growth at 500+ plugin scale — covers the SDK, manifest schema, sandboxing constraints, testing a plugin locally, and the publishing/verification process.
- **Contribution Guide (`docs/contributing/` + root `CONTRIBUTING.md`):** Full dev workflow (Section 8), code style, PR expectations, how to propose an RFC.
- **Code Style:** A short, opinionated doc pointing to the enforced linter config rather than restating rules prose can drift from — "the linter is the source of truth" is explicit.
- **API Documentation (`docs/api-reference/`):** Generated from source (e.g., OpenAPI spec for `apps/api`, TSDoc for public package APIs) rather than hand-maintained, to prevent drift at scale.
- **Examples and Tutorials (`docs/tutorials/`, `examples/`):** Task-oriented, runnable walkthroughs ("build your first plugin," "add a workflow template"), reviewed on the same cadence as the code they demonstrate (tutorial code is tested in CI, not just written once and forgotten).
- **Architecture Decision Records (`docs/adr/`):** Short, numbered, immutable records of significant decisions (e.g., "why Nx over Turborepo") with status (proposed/accepted/superseded) — this is how the project avoids relitigating settled decisions repeatedly as contributors turn over.
- **RFC Process (`docs/rfcs/`):** For any change touching public package APIs, dependency rules, or governance — a lightweight proposal-comment-decide flow, distinct from ADRs (RFCs are proposals; ADRs are the record of what was decided and why).
- **Release Notes:** Auto-generated from Conventional Commits (Section 7) per release, human-edited for highlights only.
- **Security Policy (`SECURITY.md`):** Vulnerability disclosure process, supported version policy, plugin security reporting path.
- **Roadmap (`docs/roadmap.md` or GitHub Projects):** Kept intentionally coarse-grained and reviewed quarterly, avoiding false precision on an OSS project's timeline.
- **FAQ / Troubleshooting (`docs/`):** Living documents seeded from actual recurring GitHub issues/discussions, not written speculatively up front.

---

## 7. Git Strategy

- **Branching:** Trunk-based development on `main`, short-lived feature branches (`feat/…`, `fix/…`) merged via PR. No long-lived `develop` branch — at 1000+ contributor scale, long-lived divergent branches are a merge-conflict and integration-risk liability, not a safety net.
- **Commit convention:** [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `BREAKING CHANGE:` footer) — this is what powers automated changelog generation and semantic version bumps.
- **Versioning:** Independent semantic versioning per publishable package (via Nx's release tooling), not a single monorepo-wide version number — a fix in `kernel/planner` shouldn't force a version bump in `foundation/scheduler` that didn't change.
- **Release process:** Automated release PRs (changesets-style: a PR accumulates pending version bumps + changelog entries from merged Conventional Commits, then a maintainer merges the release PR to publish). Core kernel/foundation packages and the plugin SDK follow strict semver with a deprecation window; `apps/*` can move faster since nothing depends on them.
- **Deprecation policy:** Any public API (kernel public exports, `shared/sdk`, `provider-abstraction`) requires a minimum one minor-version deprecation warning period before removal, documented in the changelog and, for major deprecations, an ADR.
- **Feature flags:** Config-driven (via `foundation/config`) rather than long-lived branches, allowing incomplete features to merge to `main` behind a flag — supports trunk-based development at scale.
- **Migration guides:** Required deliverable alongside any breaking change to a public package API or database schema, published under `docs/` and linked from the relevant release notes.

---

## 8. Testing Strategy

| Test type                  | Scope                                                                                                                | Lives in                                                                                                                            |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Unit tests                 | Single function/class/module in isolation                                                                            | Colocated with source (`*.spec.ts`)                                                                                                 |
| Integration tests          | Multiple modules within one package (e.g., Planner + its knowledge-base read path)                                   | Colocated, or a package-local `__integration__/` folder                                                                             |
| End-to-end tests           | Full goal-in → artifact-out flow across real (or realistically mocked) services                                      | `tests/e2e/`                                                                                                                        |
| Contract tests             | Verify a provider/tool plugin correctly implements `provider-abstraction` interfaces                                 | `tests/contract/`, run against every first-party plugin and offered as a CLI tool (`agentdock plugin test`) for third-party authors |
| Plugin compatibility tests | Run the contract test suite against community plugins in CI on a schedule, flagging breakage from core changes early | `tests/contract/` + scheduled CI workflow                                                                                           |
| Performance tests          | Routing latency overhead, workflow engine throughput under concurrent plans                                          | `tests/performance/` (benchmarked, not pass/fail gated, tracked over time)                                                          |
| Security tests             | Sandbox escape attempts, permission boundary checks for plugins, dependency vulnerability scanning                   | `tests/security/` + scheduled scans (Section 10)                                                                                    |
| Regression tests           | Captured from real closed bugs, one test per fixed bug, permanently retained                                         | Colocated with the fixing package, tagged `regression`                                                                              |

Testing philosophy: **unit tests are mandatory for all kernel/foundation code (high coverage bar), contract tests are mandatory for all plugins (first-party and community), and e2e tests cover a curated set of representative goals rather than attempting exhaustive coverage** (goal-space is combinatorially large; e2e tests should validate the orchestration mechanics, not attempt to test every possible user request).

---

## 9. Development Workflow

1. **Fork** the repository (external contributors) or branch directly (maintainers with write access).
2. **Clone** and run the single documented setup script (`scripts/setup/`) — one command, cross-platform, no manual steps beyond installing pnpm/Node/Docker.
3. **Setup** installs dependencies via pnpm, provisions local services (Postgres, event bus) via Docker Compose, and seeds minimal local config.
4. **Develop** against the Nx task runner (`nx serve api`, `nx serve web`) with hot reload; a new plugin/workflow-template starts from `templates/` via a generator command.
5. **Test** locally via `nx test <project>` (unit/integration) before pushing; `nx affected` runs only tests impacted by the change, keeping local iteration fast even as the repo grows.
6. **Pull Request** against `main`, using the PR template (linked issue/RFC, description, testing notes, breaking-change checkbox).
7. **Review** — at least one code owner from the affected package's `CODEOWNERS` entry must approve; CI must pass (lint, type-check, affected tests, dependency-boundary check, security scan).
8. **Merge** via squash merge, commit message conforming to Conventional Commits (enforced by CI), triggering changelog/version-bump accumulation.
9. **Release** — periodic (e.g., biweekly) release PR merge triggers publishing of all packages with pending version bumps.

---

## 10. Quality Standards

- **Linting:** A single shared ESLint config (`shared/` or a dedicated `tooling/eslint-config` package) applied repo-wide, including the Nx dependency-boundary rules from Section 4 — no per-package lint config drift.
- **Formatting:** Prettier, enforced via pre-commit hook and CI check, zero configuration debate allowed (defaults, minimal overrides).
- **Type safety:** Strict TypeScript (`strict: true`) repo-wide; `any` disallowed by lint rule except in narrowly justified, commented exceptions.
- **Code review checklist:** Correctness, test coverage for new logic, adherence to dependency rules, public API changes flagged and justified, documentation updated alongside code (not deferred).
- **Performance expectations:** Routing/planning overhead budget (per the approved architecture's <200ms target) is a CI-tracked benchmark, not just an aspirational number — regressions beyond a threshold fail the build.
- **Security checklist:** No secrets in code/config, plugin permission manifests reviewed for least-privilege, dependency vulnerability scan clean (or explicitly waived with justification) before merge.
- **Documentation requirements:** Any new public API requires accompanying docs in the same PR — undocumented public APIs are a review-blocking issue, not a follow-up ticket.
- **Accessibility expectations (for `apps/web`):** WCAG 2.1 AA as the baseline target, automated accessibility linting in CI, manual review for new significant UI surfaces.

---

## 11. Open Source Governance

- **Maintainers:** A small set of package-area owners (e.g., "Kernel maintainer," "Plugin ecosystem maintainer," "Web UI maintainer") with merge rights scoped to their `CODEOWNERS` areas, not blanket repo-wide access for everyone.
- **Core team:** A smaller subset of maintainers with cross-cutting authority over architecture, dependency rules, and release management — the group that ultimately approves ADRs affecting the whole system.
- **Review process:** Every PR requires sign-off from the relevant area's `CODEOWNERS`; changes crossing multiple areas (e.g., a new dependency rule) require sign-off from the core team.
- **Issue labels:** A consistent taxonomy (`type:bug`, `type:feature`, `area:kernel`, `area:plugins`, `good-first-issue`, `needs-rfc`, `security`) maintained centrally, not ad hoc per contributor.
- **Discussions:** GitHub Discussions for open-ended proposals and support questions, kept separate from Issues (which are actionable, scoped work items) to avoid issue-tracker noise.
- **RFC approvals:** RFCs affecting public APIs, dependency rules, or governance require explicit core team sign-off (documented, e.g. "2 of 3 core team approvals") before implementation begins — this threshold should be written down explicitly in `docs/contributing/` rather than left as informal custom.
- **Plugin verification:** A tiered trust model — first-party plugins (maintained in-repo) are fully trusted; community plugins can apply for a "verified" badge after passing the contract test suite and a manual security review; unverified plugins remain installable but are clearly marked as such in any registry/UI.
- **Security reporting:** A private disclosure channel (per `SECURITY.md`), with a defined response SLA, separate from public issue reporting.
- **Community contributions:** `good-first-issue` labeling maintained deliberately (not just auto-applied), a welcoming-but-honest `CONTRIBUTING.md`, and a lightweight path from "first PR" to "recurring contributor" to "area maintainer" made explicit rather than informal/opaque.

---

## 12. Risks

| Risk                                                                                                                    | Mitigation                                                                                                                                                                                  |
| ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Nx's learning curve slows early contributor onboarding                                                                  | Invest in a very fast `setup` script and a short "Nx for AgentDock contributors" doc covering only the handful of commands actually needed day-to-day                                       |
| Dependency-boundary enforcement is set up once and then quietly weakened over time under delivery pressure              | Boundary rules live in CI as a hard gate, not a warning; any exception requires an ADR, not a one-off override                                                                              |
| `plugins/` directory scope-creeps into hosting most of the ecosystem instead of staying reference-only                  | Explicit contribution guidelines state new provider/tool plugins beyond the reference set should be proposed as separate repos; PRs adding new plugins to this directory get extra scrutiny |
| Independent per-package semver becomes confusing for consumers trying to track "what version of AgentDock am I running" | A top-level "platform version" is still published (an umbrella release tag) even though individual packages version independently                                                           |
| Documentation drifts from code despite the strategy above, especially generated API docs falling out of CI              | Doc generation is a CI-gated step (broken doc generation fails the build, same as a broken test)                                                                                            |
| Governance model concentrates too much power in a small core team, discouraging broader contribution over time          | Roadmap includes revisiting governance formally once the contributor base reaches a defined size threshold (e.g., a governance ADR review triggered at a set contributor-count milestone)   |

---

## 13. Future Improvements

- Formal RFC tooling (e.g., a dedicated RFC bot/dashboard) once RFC volume justifies it beyond plain markdown + Discussions.
- A dedicated plugin marketplace/registry UI, once the plugin count and community size justify the investment beyond a simple registry file.
- Expanded governance (e.g., a foundation or steering committee) once maintainer count and contributor base cross a size threshold that makes the lightweight core-team model insufficient.
- Formalized performance/security test gating with historical trend dashboards, once there's enough release history to make trend data meaningful.
- Terraform/Helm infra maturity, deferred until there's real demand for managed/Kubernetes deployments beyond the Docker Compose self-host path.

---

## Self-Critique

**What this design does well:**

- The Nx-enforced dependency boundary rules are the single highest-leverage decision in this document — they convert the "prevent architecture erosion" requirement from a documentation aspiration into a CI-enforced mechanical guarantee, which is genuinely necessary (not just nice-to-have) at a 1000-contributor, 500-plugin scale.
- Keeping the bulk of the plugin ecosystem _outside_ this repository, with only a minimal reference set inside, is a deliberate and important constraint — the biggest way monorepos like this fail at scale is by accumulating "just one more integration" until the repo itself becomes the bottleneck.
- Independent per-package semver plus a lightweight umbrella version tag balances two real needs (accurate per-package versioning vs. a human-friendly "what version am I on" answer) rather than forcing an artificial single choice.

**Honest weaknesses and things that should be deferred:**

- This entire structure is being designed for a scale (1000+ contributors, 500+ plugins) that doesn't exist yet. Several pieces here — the tiered plugin verification system, the formal RFC process, the core-team/maintainer governance split — are almost certainly over-built for a project that, per Prompt 001, starts from a genuinely empty repository. These should be treated as a **target end-state to design toward**, not a day-one requirement; a real first version likely launches with a much smaller, informal governance model (a handful of maintainers, no formal RFC process yet) and grows into this structure as the numbers actually warrant it.
- The Nx dependency-boundary tagging scheme is described at the policy level but the actual tag taxonomy (`scope:kernel` vs finer-grained per-module tags) will need real iteration once contributors start hitting edge cases the design didn't anticipate — this should be expected to change via ADR within the first several months, not treated as fixed.
- The testing strategy's plugin-compatibility CI job (running contract tests against community plugins on a schedule) has a real operational cost (compute, and handling third-party plugin flakiness/failures polluting CI signal) that isn't addressed here — this needs its own design pass on isolation and failure-attribution before it's built, or it risks becoming noisy and ignored.
- "WCAG 2.1 AA as baseline" for `apps/web` is stated as a standard but has no enforcement mechanism specified beyond "automated linting" — accessibility regressions are notoriously easy for automated tools to miss; this likely needs a periodic manual audit cadence added once the UI stabilizes, which this document defers rather than solves.
- This document, like the approved architecture before it, risks the same core execution risk: **the temptation to build the full scaffolding (all packages, all doc categories, full Nx boundary config) before a single working vertical slice exists.** The repository blueprint should be stood up incrementally, starting with only the packages needed for the Phase 0 vertical slice from the approved roadmap, with the remaining folders added as each capability is actually built — not scaffolded empty on day one.
