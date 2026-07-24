import type { ExecutionMetadata } from "./execution-metadata.js";

/** A WorkflowPlan's bookkeeping timestamps. A plain alias for {@link ExecutionMetadata}, for the same reason {@link JobMetadata} is one. */
export type WorkflowMetadata = ExecutionMetadata;
