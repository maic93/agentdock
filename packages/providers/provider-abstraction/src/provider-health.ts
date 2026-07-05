/**
 * The result of asking a {@link Provider} whether it's currently usable.
 * Kept as plain data (not a thrown exception) because "is this provider
 * healthy right now" is a routine question the AI Router asks before every
 * routing decision, not an exceptional circumstance.
 */
export interface ProviderHealth {
  readonly healthy: boolean;
  /** Present when `healthy` is false, explaining why. */
  readonly message?: string;
}
