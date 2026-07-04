# infra/docker

Development-only Docker Compose configuration.

## What's here now

`docker-compose.dev.yml` provisions the shared Docker network and named
volumes that future foundation services (Postgres, object storage, event
bus) will attach to. It intentionally defines **no services yet** — there is
no foundation-layer code in this repository yet for a service to run.

## What belongs here

- Compose files for local development (`docker-compose.dev.yml` and, later,
  environment variants if needed).
- Dockerfiles for building AgentDock's own apps/services for local use.

## What never belongs here

- Production deployment manifests — those belong in `infra/helm/` (Kubernetes)
  once that's built out.
- Application configuration defaults — those belong in
  `packages/foundation/config`; this directory provisions _where_ things run,
  not _how they behave_.
- Placeholder service definitions for packages that don't exist yet. Add a
  service here only when its corresponding foundation package is actually
  implemented and needs something to run against locally.

## Running it

```bash
docker compose -f infra/docker/docker-compose.dev.yml up -d
```

This currently just creates the network/volumes; there's nothing to observe
running yet. It will become useful as soon as the first foundation service
(most likely `packages/foundation/db`) lands.
