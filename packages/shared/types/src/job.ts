import type { ExecutionId } from "./execution-id.js";
import { type Clock, createInitialMetadata, touchMetadata } from "./execution-metadata.js";
import type { JobError } from "./job-error.js";
import type { JobGoal } from "./job-goal.js";
import { createJobId, type JobId } from "./job-id.js";
import type { JobMetadata } from "./job-metadata.js";
import { DEFAULT_JOB_PRIORITY, type JobPriority } from "./job-priority.js";
import type { JobResult } from "./job-result.js";
import { assertJobTransition, JobStatus } from "./job-status.js";

export interface JobProps {
  readonly id: JobId;
  readonly goal: JobGoal;
  readonly status: JobStatus;
  readonly priority: JobPriority;
  /**
   * The Execution ids this Job has created, in creation order. Today this
   * array only ever has zero or one entries — the Job domain does not yet
   * implement multi-execution planning (see
   * docs/architecture/005-job-domain.md) — but it's an array, not a single
   * optional field, because "a Job owns the Executions it created" is
   * true regardless of how many there turn out to be, and an array needs
   * no breaking change when a Planner that produces more than one
   * Execution per Job eventually exists.
   */
  readonly executionIds: readonly ExecutionId[];
  readonly result?: JobResult;
  readonly error?: JobError;
  readonly metadata: JobMetadata;
}

/**
 * Represents the user's requested OUTCOME — as opposed to an {@link
 * Execution}, which represents a single unit of work created to achieve
 * that outcome. See docs/architecture/005-job-domain.md for the full
 * relationship between Job, Execution, ExecutionGraph, and ExecutionNode.
 *
 * Job's design deliberately mirrors Execution's exactly: immutable props,
 * a private constructor, `create`/`fromProps` factories, and named
 * lifecycle methods that each assert their transition is legal before
 * returning a new instance. This isn't incidental similarity — Job and
 * Execution are both "a goal-shaped thing with a lifecycle," and using the
 * same pattern for both means anyone who has read execution.ts already
 * knows how to read this file.
 */
export class Job {
  private constructor(private readonly props: JobProps) {}

  /** Creates a new Job in the Created status for the given goal. */
  static create(goal: JobGoal, priority: JobPriority = DEFAULT_JOB_PRIORITY, clock?: Clock): Job {
    return new Job({
      id: createJobId(),
      goal,
      status: JobStatus.Created,
      priority,
      executionIds: [],
      metadata: createInitialMetadata(clock),
    });
  }

  /** Reconstructs a Job from previously-recorded props — used by a {@link JobRepository} implementation. */
  static fromProps(props: JobProps): Job {
    return new Job(props);
  }

  get id(): JobId {
    return this.props.id;
  }

  get goal(): JobGoal {
    return this.props.goal;
  }

  get status(): JobStatus {
    return this.props.status;
  }

  get priority(): JobPriority {
    return this.props.priority;
  }

  get executionIds(): readonly ExecutionId[] {
    return this.props.executionIds;
  }

  get result(): JobResult | undefined {
    return this.props.result;
  }

  get error(): JobError | undefined {
    return this.props.error;
  }

  get metadata(): JobMetadata {
    return this.props.metadata;
  }

  /** Exposes the immutable props for persistence/serialization. Read-only by type. */
  toProps(): JobProps {
    return this.props;
  }

  /** Created -> Planning. */
  startPlanning(clock?: Clock): Job {
    return this.transitionTo(JobStatus.Planning, {}, clock);
  }

  /**
   * Planning -> Executing, recording a newly created Execution as one this
   * Job owns. Appends to `executionIds` rather than replacing it, so a
   * future multi-execution Planner can call this more than once per Job
   * with no change to this method.
   */
  beginExecution(executionId: ExecutionId, clock?: Clock): Job {
    return this.transitionTo(
      JobStatus.Executing,
      { executionIds: [...this.props.executionIds, executionId] },
      clock,
    );
  }

  /** Executing -> Completed, recording the final result. */
  complete(result: JobResult, clock?: Clock): Job {
    return this.transitionTo(JobStatus.Completed, { result }, clock);
  }

  /** Any non-terminal status -> Failed, recording the error — legal from every non-terminal status, mirroring Execution.fail. */
  fail(error: JobError, clock?: Clock): Job {
    return this.transitionTo(JobStatus.Failed, { error }, clock);
  }

  private transitionTo(
    to: JobStatus,
    patch: Partial<Pick<JobProps, "executionIds" | "result" | "error">>,
    clock?: Clock,
  ): Job {
    assertJobTransition(this.props.status, to);
    return new Job({
      ...this.props,
      ...patch,
      status: to,
      metadata: touchMetadata(this.props.metadata, clock),
    });
  }
}
