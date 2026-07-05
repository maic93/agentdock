/**
 * A branded string identifying a provider (e.g. "ollama"). Branded the same
 * way ExecutionId and ExecutionNodeId are, so a provider id can't be
 * confused with an arbitrary string at compile time.
 */
export type ProviderId = string & { readonly __brand: "ProviderId" };

/** Constructs a {@link ProviderId} from a raw, non-empty string. */
export function createProviderId(id: string): ProviderId {
  const trimmed = id.trim();
  if (trimmed.length === 0) {
    throw new Error("Provider id must not be empty.");
  }
  return trimmed as ProviderId;
}
