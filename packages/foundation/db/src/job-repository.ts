import type { Job, JobId } from "@agentdock/shared-types";

/**
 * Persistence abstraction for Jobs — the same design as {@link
 * ExecutionStore} (see execution-store.ts), for the same reasons:
 * `Promise`-returning even though the current in-memory implementation
 * resolves synchronously, because the real backing store will be
 * PostgreSQL.
 */
export interface JobRepository {
  /** Persists a new Job. Rejects if one with the same id already exists. */
  create(job: Job): Promise<Job>;

  /** Retrieves a Job by id. Rejects if none exists. */
  get(id: JobId): Promise<Job>;

  /** Persists a new version of an already-created Job. Rejects if it does not exist. */
  update(job: Job): Promise<Job>;

  /** Returns a snapshot of every currently-stored Job. */
  list(): Promise<readonly Job[]>;

  /** Removes a Job by id. Rejects if none exists. */
  delete(id: JobId): Promise<void>;
}
