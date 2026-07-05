# apps/

Deployable, user-facing programs: `web` (UI), `api` (public HTTP surface),
`cli` (future).

## What belongs here

Thin composition of `packages/kernel/*` and `packages/foundation/*` through
their public APIs — routing, rendering, request/response handling, auth
wiring. Nothing in `apps/` is imported by anything else in the workspace;
apps are leaves in the dependency graph.

## What never belongs here

Business/orchestration logic. If you find yourself writing planning logic,
routing heuristics, or persistence logic inside an app, that logic belongs
in `packages/kernel/*` or `packages/foundation/*` instead, with the app
calling it through a public interface.

## Current status

`api` is implemented: `POST /execute`, `GET /executions/:id`, `GET
/health`, plus the composition root that wires a real provider into the
pipeline (see
[docs/architecture/004-execution-pipeline.md](../docs/architecture/004-execution-pipeline.md)
and [ADR 0004](../docs/adr/0004-apps-may-depend-on-plugins.md) for the one
deliberate exception to "no business logic here": composition, which is
wiring, not logic). `web` and `cli` are not implemented yet.
