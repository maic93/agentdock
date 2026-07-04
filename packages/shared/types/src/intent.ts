/**
 * The set of intent categories AgentDock currently recognizes.
 *
 * This is a plain union type, not an enum or a registry, on purpose: the
 * only thing that exists today is the "conversation" case exercised by the
 * first Intent Analyzer, plus "unknown" as the required fallback for
 * "no analyzer was confident about anything." Adding a new category later
 * (e.g. "code-generation") is a one-line addition here — there's no
 * abstraction to build in advance for that, so this file doesn't build one.
 */
export type IntentCategory = "conversation" | "unknown";

/**
 * The result of intent analysis for a given {@link Goal}: which category the
 * goal falls into, how confident the analyzer is, and why — so a human (or a
 * future analyzer) can inspect the reasoning rather than trusting a bare
 * number.
 */
export interface Intent {
  readonly category: IntentCategory;
  /** A value in the inclusive range [0, 1]. */
  readonly confidence: number;
  readonly reasoning: string;
}
