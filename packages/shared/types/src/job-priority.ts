/**
 * The priority a Job was requested at. Nothing in AgentDock currently acts
 * on this — there is no priority queue or scheduler yet (Scheduling is
 * explicitly out of scope for this milestone). This mirrors an existing
 * precedent in this codebase: `ExecutionNode.estimatedCostUsd` and
 * `estimatedDurationMs` (see execution-graph.ts) were introduced the same
 * way — recorded as real data on the domain model before anything reads
 * them, specifically so the Workflow Engine and AI Router wouldn't need a
 * breaking type change once they did. `JobPriority` is the same bet for
 * whatever future scheduler eventually reads it.
 */
export type JobPriority = "low" | "normal" | "high";

/** The priority assumed when a Job is created without specifying one. */
export const DEFAULT_JOB_PRIORITY: JobPriority = "normal";
