import { randomUUID } from "node:crypto";

/**
 * A branded string, exactly like {@link ExecutionId} — see that type for
 * why branding is used throughout this package.
 */
export type JobId = string & { readonly __brand: "JobId" };

/** Generates a new, globally unique {@link JobId}. */
export function createJobId(): JobId {
  return randomUUID() as JobId;
}
