import { beforeEach, describe, expect, it } from "vitest";
import { createGoal, createJobId, Job } from "@agentdock/shared-types";
import { JobAlreadyExistsError, JobNotFoundError } from "./errors.js";
import { InMemoryJobRepository } from "./in-memory-job-repository.js";

describe("InMemoryJobRepository", () => {
  let repository: InMemoryJobRepository;

  beforeEach(() => {
    repository = new InMemoryJobRepository();
  });

  describe("create", () => {
    it("stores and returns the job", async () => {
      const job = Job.create(createGoal("Hello"));
      expect(await repository.create(job)).toBe(job);
    });

    it("makes the job retrievable via get", async () => {
      const job = Job.create(createGoal("Hello"));
      await repository.create(job);
      expect((await repository.get(job.id)).id).toBe(job.id);
    });

    it("rejects creating a job whose id already exists", async () => {
      const job = Job.create(createGoal("Hello"));
      await repository.create(job);
      await expect(repository.create(job)).rejects.toThrow(JobAlreadyExistsError);
    });
  });

  describe("get", () => {
    it("rejects for an id that was never created", async () => {
      await expect(repository.get(createJobId())).rejects.toThrow(JobNotFoundError);
    });
  });

  describe("update", () => {
    it("persists a new version of an existing job", async () => {
      const job = Job.create(createGoal("Hello"));
      await repository.create(job);

      const planning = job.startPlanning();
      await repository.update(planning);

      expect((await repository.get(job.id)).status).toBe(planning.status);
    });

    it("rejects updating a job that was never created", async () => {
      const job = Job.create(createGoal("Hello"));
      await expect(repository.update(job)).rejects.toThrow(JobNotFoundError);
    });
  });

  describe("list", () => {
    it("returns an empty list when nothing has been created", async () => {
      expect(await repository.list()).toEqual([]);
    });

    it("returns every created job", async () => {
      const first = Job.create(createGoal("Hello"));
      const second = Job.create(createGoal("Hi there"));
      await repository.create(first);
      await repository.create(second);

      const all = await repository.list();
      expect(all.map((job) => job.id).sort()).toEqual([first.id, second.id].sort());
    });
  });

  describe("delete", () => {
    it("removes a stored job", async () => {
      const job = Job.create(createGoal("Hello"));
      await repository.create(job);
      await repository.delete(job.id);
      await expect(repository.get(job.id)).rejects.toThrow(JobNotFoundError);
    });

    it("rejects deleting an id that does not exist", async () => {
      await expect(repository.delete(createJobId())).rejects.toThrow(JobNotFoundError);
    });
  });
});
