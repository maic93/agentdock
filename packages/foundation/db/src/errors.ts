import type { ExecutionId } from "@agentdock/shared-types";

/** Thrown by an {@link ExecutionStore} when `get`, `update`, or `delete` targets an id that doesn't exist. */
export class ExecutionNotFoundError extends Error {
  constructor(public readonly executionId: ExecutionId) {
    super(`Execution "${executionId}" was not found.`);
    this.name = "ExecutionNotFoundError";
  }
}

/** Thrown by an {@link ExecutionStore} when `create` targets an id that already exists. */
export class ExecutionAlreadyExistsError extends Error {
  constructor(public readonly executionId: ExecutionId) {
    super(`Execution "${executionId}" already exists.`);
    this.name = "ExecutionAlreadyExistsError";
  }
}
