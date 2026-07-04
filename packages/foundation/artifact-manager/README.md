# @agentdock/foundation-artifact-manager

**Purpose:** Versioned storage/retrieval of task outputs (files, images,
code, documents) with lineage — which plan/task produced an artifact, from
which inputs. This is what makes retries and audits possible.

**Public API (once implemented):** an `ArtifactManager` service interface,
backed by local filesystem (self-hosted default) or S3-compatible object
storage (cloud), behind one interface.

**May depend on:** `@agentdock/shared-types`, `@agentdock/foundation-config`.

**Must never depend on:** `packages/kernel/*`, `apps/*`, `plugins/*`.

**Status:** Not implemented.
