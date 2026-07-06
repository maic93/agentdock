import type { Goal } from "./goal.js";

/**
 * A Job's requested goal. This is a plain alias for {@link Goal}, not a new
 * type — a goal is the same concept whether it's attached to a Job or an
 * Execution, and re-using `Goal` (and `createGoal`'s validation) means
 * there is exactly one place that decides what makes a goal valid, for
 * both domains. See docs/architecture/005-job-domain.md for the reasoning
 * behind which Job concepts are aliases versus genuinely new types.
 */
export type JobGoal = Goal;
