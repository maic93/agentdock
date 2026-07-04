import type { Execution, ExecutionId } from "@agentdock/shared-types";

/**
 * Persistence abstraction for Executions. Methods are `Promise`-returning
 * even though the current (in-memory) implementation resolves them
 * synchronously — because the real backing store (see this package's
 * README) will be PostgreSQL, which is inherently asynchronous. Defining
 * the interface as async now means swapping the implementation later is not
 * a breaking change for anything already coded against this interface.
 */
export interface ExecutionStore {
  /** Persists a new Execution. Rejects if one with the same id already exists. */
  create(execution: Execution): Promise<Execution>;

  /** Retrieves an Execution by id. Rejects if none exists. */
  get(id: ExecutionId): Promise<Execution>;

  /** Persists a new version of an already-created Execution. Rejects if it does not exist. */
  update(execution: Execution): Promise<Execution>;

  /** Returns a snapshot of every currently-stored Execution. */
  list(): Promise<readonly Execution[]>;

  /** Removes an Execution by id. Rejects if none exists. */
  delete(id: ExecutionId): Promise<void>;
}
