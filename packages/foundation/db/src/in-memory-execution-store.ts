import type { Execution, ExecutionId } from "@agentdock/shared-types";
import { ExecutionAlreadyExistsError, ExecutionNotFoundError } from "./errors.js";
import type { ExecutionStore } from "./execution-store.js";

/**
 * An in-memory {@link ExecutionStore}, backed by a `Map`. This is what the
 * repository foundation's docs referred to as "PostgreSQL later" — this is
 * "later" not having arrived yet. Every method is `async` to match the
 * public interface exactly, even though nothing here actually awaits
 * anything; that's intentional (see execution-store.ts) rather than an
 * oversight.
 */
export class InMemoryExecutionStore implements ExecutionStore {
  private readonly executionsById = new Map<ExecutionId, Execution>();

  async create(execution: Execution): Promise<Execution> {
    if (this.executionsById.has(execution.id)) {
      throw new ExecutionAlreadyExistsError(execution.id);
    }
    this.executionsById.set(execution.id, execution);
    return execution;
  }

  async get(id: ExecutionId): Promise<Execution> {
    const execution = this.executionsById.get(id);
    if (!execution) {
      throw new ExecutionNotFoundError(id);
    }
    return execution;
  }

  async update(execution: Execution): Promise<Execution> {
    if (!this.executionsById.has(execution.id)) {
      throw new ExecutionNotFoundError(execution.id);
    }
    this.executionsById.set(execution.id, execution);
    return execution;
  }

  async list(): Promise<readonly Execution[]> {
    return Array.from(this.executionsById.values());
  }

  async delete(id: ExecutionId): Promise<void> {
    if (!this.executionsById.delete(id)) {
      throw new ExecutionNotFoundError(id);
    }
  }
}
