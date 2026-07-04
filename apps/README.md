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

No apps are implemented yet. Per the approved repository foundation, apps
are scaffolded incrementally as the Phase 0 vertical slice (see
`docs/architecture/001-system-architecture.md`, Section 24) is built — not
stood up empty ahead of the kernel code they'd have nothing to call.
