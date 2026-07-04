import { beforeEach, describe, expect, it } from "vitest";
import { createGoal, createExecutionId, Execution } from "@agentdock/shared-types";
import { ExecutionAlreadyExistsError, ExecutionNotFoundError } from "./errors.js";
import { InMemoryExecutionStore } from "./in-memory-execution-store.js";

describe("InMemoryExecutionStore", () => {
  let store: InMemoryExecutionStore;

  beforeEach(() => {
    store = new InMemoryExecutionStore();
  });

  describe("create", () => {
    it("stores and returns the execution", async () => {
      const execution = Execution.create(createGoal("Hello"));
      const created = await store.create(execution);
      expect(created).toBe(execution);
    });

    it("makes the execution retrievable via get", async () => {
      const execution = Execution.create(createGoal("Hello"));
      await store.create(execution);
      const fetched = await store.get(execution.id);
      expect(fetched.id).toBe(execution.id);
    });

    it("rejects creating an execution whose id already exists", async () => {
      const execution = Execution.create(createGoal("Hello"));
      await store.create(execution);
      await expect(store.create(execution)).rejects.toThrow(ExecutionAlreadyExistsError);
    });
  });

  describe("get", () => {
    it("rejects for an id that was never created", async () => {
      await expect(store.get(createExecutionId())).rejects.toThrow(ExecutionNotFoundError);
    });
  });

  describe("update", () => {
    it("persists a new version of an existing execution", async () => {
      const execution = Execution.create(createGoal("Hello"));
      await store.create(execution);

      const analyzing = execution.startAnalyzing();
      const updated = await store.update(analyzing);

      expect(updated.status).toBe(analyzing.status);
      const fetched = await store.get(execution.id);
      expect(fetched.status).toBe(analyzing.status);
    });

    it("rejects updating an execution that was never created", async () => {
      const execution = Execution.create(createGoal("Hello"));
      await expect(store.update(execution)).rejects.toThrow(ExecutionNotFoundError);
    });
  });

  describe("list", () => {
    it("returns an empty list when nothing has been created", async () => {
      expect(await store.list()).toEqual([]);
    });

    it("returns every created execution", async () => {
      const first = Execution.create(createGoal("Hello"));
      const second = Execution.create(createGoal("Hi there"));
      await store.create(first);
      await store.create(second);

      const all = await store.list();
      expect(all.map((execution) => execution.id).sort()).toEqual([first.id, second.id].sort());
    });

    it("reflects updates, not the originally-created version", async () => {
      const execution = Execution.create(createGoal("Hello"));
      await store.create(execution);
      await store.update(execution.startAnalyzing());

      const [stored] = await store.list();
      expect(stored?.status).not.toBe(execution.status);
    });
  });

  describe("delete", () => {
    it("removes a stored execution", async () => {
      const execution = Execution.create(createGoal("Hello"));
      await store.create(execution);
      await store.delete(execution.id);
      await expect(store.get(execution.id)).rejects.toThrow(ExecutionNotFoundError);
    });

    it("rejects deleting an id that does not exist", async () => {
      await expect(store.delete(createExecutionId())).rejects.toThrow(ExecutionNotFoundError);
    });
  });
});
