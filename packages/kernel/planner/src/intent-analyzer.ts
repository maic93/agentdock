import type { Goal, Intent } from "@agentdock/shared-types";

export interface IntentAnalysis {
  readonly intent: Intent;
}

/**
 * A single strategy for turning a {@link Goal} into an {@link Intent}. The
 * Planner depends on this interface, never on a concrete analyzer, so a new
 * analyzer (e.g. one backed by an LLM call, once providers exist) can be
 * introduced without changing anything that consumes it — it just needs to
 * be added to a {@link CompositeIntentAnalyzer}'s list.
 */
export interface IntentAnalyzer {
  readonly name: string;
  analyze(goal: Goal): IntentAnalysis;
}

const CONVERSATIONAL_KEYWORDS: readonly string[] = [
  "hello",
  "hi",
  "hey",
  "good morning",
  "good afternoon",
  "good evening",
  "how are you",
  "thanks",
  "thank you",
];

/**
 * The first Intent Analyzer: a simple keyword match against known
 * conversational phrases. Anything unmatched is reported as "unknown" with
 * zero confidence, rather than guessing — a wrong-but-confident classifier
 * is worse than an honest "I don't know" one downstream code can act on.
 */
export class KeywordIntentAnalyzer implements IntentAnalyzer {
  readonly name = "keyword-intent-analyzer";

  analyze(goal: Goal): IntentAnalysis {
    const normalized = goal.text.toLowerCase();
    const matchedKeywords = CONVERSATIONAL_KEYWORDS.filter((keyword) =>
      normalized.includes(keyword),
    );

    if (matchedKeywords.length === 0) {
      return {
        intent: {
          category: "unknown",
          confidence: 0,
          reasoning: "No known intent pattern matched the goal text.",
        },
      };
    }

    // More distinct keyword matches raise confidence, capped at 1.
    const confidence = Math.min(1, 0.6 + 0.1 * matchedKeywords.length);
    return {
      intent: {
        category: "conversation",
        confidence,
        reasoning: `Matched conversational keyword(s): ${matchedKeywords.join(", ")}.`,
      },
    };
  }
}

/**
 * Runs a list of analyzers in order and returns the first result meeting
 * `confidenceThreshold`, falling back to the most confident result seen if
 * none clears the bar. This is the extension point referenced above: adding
 * a second analyzer means constructing this with both in the list, nothing
 * else changes.
 */
export class CompositeIntentAnalyzer implements IntentAnalyzer {
  readonly name = "composite-intent-analyzer";

  constructor(
    private readonly analyzers: readonly IntentAnalyzer[],
    private readonly confidenceThreshold = 0.5,
  ) {
    if (analyzers.length === 0) {
      throw new Error("CompositeIntentAnalyzer requires at least one analyzer.");
    }
  }

  analyze(goal: Goal): IntentAnalysis {
    let mostConfident: IntentAnalysis | undefined;

    for (const analyzer of this.analyzers) {
      const analysis = analyzer.analyze(goal);
      if (analysis.intent.confidence >= this.confidenceThreshold) {
        return analysis;
      }
      if (!mostConfident || analysis.intent.confidence > mostConfident.intent.confidence) {
        mostConfident = analysis;
      }
    }

    // Invariant: the constructor guarantees at least one analyzer ran, so
    // mostConfident is always assigned by the time the loop above finishes.
    return mostConfident as IntentAnalysis;
  }
}
