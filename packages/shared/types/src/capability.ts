/**
 * The set of capabilities AgentDock can currently require to satisfy a
 * goal. Only "text-generation" exists today because it's the only
 * capability the current Capability Resolver ever produces (for the
 * "conversation" intent). Future capabilities (image-generation,
 * browser, code-generation, search, memory, planning, ...) are added here
 * one literal at a time, as the resolvers and providers that actually
 * fulfil them are built — not speculatively ahead of that.
 */
export type Capability = "text-generation";

/**
 * Every currently-known capability, for validation and iteration purposes
 * (e.g. checking that an {@link ExecutionNode}'s capability is one AgentDock
 * actually understands).
 */
export const KNOWN_CAPABILITIES: readonly Capability[] = ["text-generation"];
