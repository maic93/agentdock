import type { Job, JobId } from "@agentdock/shared-types";
import { JobAlreadyExistsError, JobNotFoundError } from "./errors.js";
import type { JobRepository } from "./job-repository.js";

/**
 * An in-memory {@link JobRepository}, backed by a `Map` — the same
 * structure as {@link InMemoryExecutionStore} (see
 * in-memory-execution-store.ts). This mirrors that file's logic closely
 * enough that a shared generic base would remove real duplication; that
 * refactor was deliberately not made here (see ADR 0005) because it would
 * require touching `InMemoryExecutionStore`, which milestone 006's
 * instructions treat as stable, existing code not to be modified absent a
 * critical defect. Two small, parallel files were chosen over one
 * generalized one, in favor of leaving working code alone.
 */
export class InMemoryJobRepository implements JobRepository {
  private readonly jobsById = new Map<JobId, Job>();

  async create(job: Job): Promise<Job> {
    if (this.jobsById.has(job.id)) {
      throw new JobAlreadyExistsError(job.id);
    }
    this.jobsById.set(job.id, job);
    return job;
  }

  async get(id: JobId): Promise<Job> {
    const job = this.jobsById.get(id);
    if (!job) {
      throw new JobNotFoundError(id);
    }
    return job;
  }

  async update(job: Job): Promise<Job> {
    if (!this.jobsById.has(job.id)) {
      throw new JobNotFoundError(job.id);
    }
    this.jobsById.set(job.id, job);
    return job;
  }

  async list(): Promise<readonly Job[]> {
    return Array.from(this.jobsById.values());
  }

  async delete(id: JobId): Promise<void> {
    if (!this.jobsById.delete(id)) {
      throw new JobNotFoundError(id);
    }
  }
}
