import type { ExecutionMetadata } from "./execution-metadata.js";

/**
 * A Job's bookkeeping timestamps. A plain alias for {@link ExecutionMetadata}
 * — timestamps are timestamps regardless of which aggregate they're
 * attached to, and `createInitialMetadata`/`touchMetadata` (see
 * execution-metadata.ts) are already generic despite their file's name, so
 * Job reuses them directly rather than duplicating identical logic.
 */
export type JobMetadata = ExecutionMetadata;
