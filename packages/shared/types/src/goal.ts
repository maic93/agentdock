import { InvalidGoalError } from "./errors.js";

/**
 * A user's requested goal, in their own words. This is intentionally just a
 * validated wrapper around text today — the Intent Analyzer is what gives it
 * meaning. Modeling it as its own type (rather than passing raw strings
 * around) is what lets `createGoal` be the single place that enforces "a
 * goal can't be empty," instead of that check being duplicated at every call
 * site that accepts a goal.
 */
export interface Goal {
  readonly text: string;
}

/**
 * Constructs a {@link Goal} from raw input text, trimming whitespace and
 * rejecting empty input.
 */
export function createGoal(text: string): Goal {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    throw new InvalidGoalError("Goal text must not be empty.");
  }
  return { text: trimmed };
}
