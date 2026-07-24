import { beforeEach, describe, expect, it } from "vitest";
import { createJobId, createWorkflowId, WorkflowPlan } from "@agentdock/shared-types";
import { WorkflowAlreadyExistsError, WorkflowNotFoundError } from "./errors.js";
import { InMemoryWorkflowRepository } from "./in-memory-workflow-repository.js";

function buildPlan(): WorkflowPlan {
  return WorkflowPlan.create(createJobId(), [], []);
}

describe("InMemoryWorkflowRepository", () => {
  let repository: InMemoryWorkflowRepository;

  beforeEach(() => {
    repository = new InMemoryWorkflowRepository();
  });

  describe("create", () => {
    it("stores and returns the plan", async () => {
      const plan = buildPlan();
      expect(await repository.create(plan)).toBe(plan);
    });

    it("makes the plan retrievable via get", async () => {
      const plan = buildPlan();
      await repository.create(plan);
      expect((await repository.get(plan.workflowId)).workflowId).toBe(plan.workflowId);
    });

    it("rejects creating a plan whose id already exists", async () => {
      const plan = buildPlan();
      await repository.create(plan);
      await expect(repository.create(plan)).rejects.toThrow(WorkflowAlreadyExistsError);
    });
  });

  describe("get", () => {
    it("rejects for an id that was never created", async () => {
      await expect(repository.get(createWorkflowId())).rejects.toThrow(WorkflowNotFoundError);
    });
  });

  describe("update", () => {
    it("persists a new version of an existing plan", async () => {
      const plan = buildPlan();
      await repository.create(plan);
      const props = plan.toProps();
      const updated = WorkflowPlan.fromProps({
        workflowId: props.workflowId,
        jobId: props.jobId,
        nodes: props.nodes,
        edges: props.edges,
        metadata: props.metadata,
      });
      await repository.update(updated);
      expect((await repository.get(plan.workflowId)).workflowId).toBe(plan.workflowId);
    });

    it("rejects updating a plan that was never created", async () => {
      const plan = buildPlan();
      await expect(repository.update(plan)).rejects.toThrow(WorkflowNotFoundError);
    });
  });

  describe("list", () => {
    it("returns an empty list when nothing has been created", async () => {
      expect(await repository.list()).toEqual([]);
    });

    it("returns every created plan", async () => {
      const first = buildPlan();
      const second = buildPlan();
      await repository.create(first);
      await repository.create(second);
      const all = await repository.list();
      expect(all.map((plan) => plan.workflowId).sort()).toEqual(
        [first.workflowId, second.workflowId].sort(),
      );
    });
  });

  describe("delete", () => {
    it("removes a stored plan", async () => {
      const plan = buildPlan();
      await repository.create(plan);
      await repository.delete(plan.workflowId);
      await expect(repository.get(plan.workflowId)).rejects.toThrow(WorkflowNotFoundError);
    });

    it("rejects deleting an id that does not exist", async () => {
      await expect(repository.delete(createWorkflowId())).rejects.toThrow(WorkflowNotFoundError);
    });
  });
});
