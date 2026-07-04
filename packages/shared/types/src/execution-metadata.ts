/**
 * Bookkeeping timestamps for an {@link Execution}. Kept as its own type
 * (rather than two loose fields on Execution) so it has a single, obvious
 * place to grow into (e.g. a `startedAt`/`completedAt` split) without
 * touching Execution's own shape.
 */
export interface ExecutionMetadata {
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * A clock function, injectable everywhere a timestamp is produced. Using
 * `() => new Date()` as the default means production code needs no special
 * handling, while tests can pass a fixed clock instead of depending on wall
 * time or mocking the global `Date`.
 */
export type Clock = () => Date;

const defaultClock: Clock = () => new Date();

/** Creates the initial metadata for a newly-created Execution. */
export function createInitialMetadata(clock: Clock = defaultClock): ExecutionMetadata {
  const timestamp = clock();
  return { createdAt: timestamp, updatedAt: timestamp };
}

/** Returns new metadata with `updatedAt` refreshed, leaving `createdAt` untouched. */
export function touchMetadata(
  metadata: ExecutionMetadata,
  clock: Clock = defaultClock,
): ExecutionMetadata {
  return { ...metadata, updatedAt: clock() };
}
