import type { ExecutionId, JobId, WorkflowId } from "@agentdock/shared-types";

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

/** Thrown by a {@link JobRepository} when `get`, `update`, or `delete` targets an id that doesn't exist. */
export class JobNotFoundError extends Error {
  constructor(public readonly jobId: JobId) {
    super(`Job "${jobId}" was not found.`);
    this.name = "JobNotFoundError";
  }
}

/** Thrown by a {@link JobRepository} when `create` targets an id that already exists. */
export class JobAlreadyExistsError extends Error {
  constructor(public readonly jobId: JobId) {
    super(`Job "${jobId}" already exists.`);
    this.name = "JobAlreadyExistsError";
  }
}

/** Thrown by a {@link WorkflowRepository} when `get`, `update`, or `delete` targets an id that doesn't exist. */
export class WorkflowNotFoundError extends Error {
  constructor(public readonly workflowId: WorkflowId) {
    super(`Workflow "${workflowId}" was not found.`);
    this.name = "WorkflowNotFoundError";
  }
}

/** Thrown by a {@link WorkflowRepository} when `create` targets an id that already exists. */
export class WorkflowAlreadyExistsError extends Error {
  constructor(public readonly workflowId: WorkflowId) {
    super(`Workflow "${workflowId}" already exists.`);
    this.name = "WorkflowAlreadyExistsError";
  }
}
