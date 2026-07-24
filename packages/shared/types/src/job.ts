import type { ExecutionId } from "./execution-id.js";
import { type Clock, createInitialMetadata, touchMetadata } from "./execution-metadata.js";
import { InvalidJobTransitionError } from "./errors.js";
import type { JobError } from "./job-error.js";
import type { JobGoal } from "./job-goal.js";
import { createJobId, type JobId } from "./job-id.js";
import type { JobMetadata } from "./job-metadata.js";
import { DEFAULT_JOB_PRIORITY, type JobPriority } from "./job-priority.js";
import type { JobResult } from "./job-result.js";
import { assertJobTransition, JobStatus } from "./job-status.js";
import type { WorkflowId } from "./workflow-id.js";

export interface JobProps {
  readonly id: JobId;
  readonly goal: JobGoal;
  readonly status: JobStatus;
  readonly priority: JobPriority;
  /**
   * The Execution ids this Job has created, in creation order. Since
   * milestone 008, a Job's Executions are the nodes of its WorkflowPlan
   * (see workflow-plan.ts) — this array can genuinely have more than one
   * entry now, populated as the WorkflowEngine creates each node's
   * Execution in dependency order, not necessarily all at once.
   */
  readonly executionIds: readonly ExecutionId[];
  /**
   * The WorkflowPlan created to satisfy this Job, once planning succeeds.
   * Optional and additive, mirroring how Execution.jobId was added in
   * milestone 006 — a Job that fails during planning (before a
   * WorkflowPlan could be built) never has one.
   */
  readonly workflowId?: WorkflowId;
  readonly result?: JobResult;
  readonly error?: JobError;
  readonly metadata: JobMetadata;
}

/**
 * Represents the user's requested OUTCOME — as opposed to an {@link
 * Execution}, which represents a single unit of work created to achieve
 * that outcome. See docs/architecture/005-job-domain.md for the full
 * relationship between Job, Execution, ExecutionGraph, and ExecutionNode,
 * and docs/architecture/007-workflow-planning.md for how WorkflowPlan fits
 * in.
 *
 * Job's design deliberately mirrors Execution's exactly: immutable props,
 * a private constructor, `create`/`fromProps` factories, and named
 * lifecycle methods that each assert their transition is legal before
 * returning a new instance.
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

  /** The WorkflowPlan created to satisfy this Job, if planning has succeeded. */
  get workflowId(): WorkflowId | undefined {
    return this.props.workflowId;
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
   * Job owns. Appends to `executionIds` rather than replacing it.
   *
   * Kept, not removed, now that {@link startExecuting}/{@link
   * addExecution} exist as the pair actually used for workflows with more
   * than one node — this method remains correct and tested for the
   * single-Execution case it was built for, the same way
   * `CapabilityMatchingRouter` was kept alongside `ScoringRouter` (see
   * ADR 0006) rather than deleted once a more general alternative existed.
   */
  beginExecution(executionId: ExecutionId, clock?: Clock): Job {
    return this.transitionTo(
      JobStatus.Executing,
      { executionIds: [...this.props.executionIds, executionId] },
      clock,
    );
  }

  /**
   * Attaches the WorkflowPlan created to satisfy this Job. Not a lifecycle
   * transition — the Job's status is unaffected — so this can be called
   * any time after planning succeeds, independent of exactly when
   * `startExecuting` is called.
   */
  withWorkflow(workflowId: WorkflowId, clock?: Clock): Job {
    return new Job({
      ...this.props,
      workflowId,
      metadata: touchMetadata(this.props.metadata, clock),
    });
  }

  /**
   * Planning -> Executing, without recording an Execution id — used when a
   * Job's WorkflowPlan has more than zero nodes but none has an Execution
   * yet (the WorkflowEngine creates each node's Execution only once that
   * node becomes ready to run). Pairs with {@link addExecution} for
   * recording each node's Execution as the WorkflowEngine creates it.
   */
  startExecuting(clock?: Clock): Job {
    return this.transitionTo(JobStatus.Executing, {}, clock);
  }

  /**
   * Records an additional Execution this (already-Executing) Job owns,
   * without transitioning status — unlike {@link beginExecution}, which
   * performs the Planning -> Executing transition itself. Throws {@link
   * InvalidJobTransitionError} if the Job isn't already Executing.
   */
  addExecution(executionId: ExecutionId, clock?: Clock): Job {
    if (this.props.status !== JobStatus.Executing) {
      // Not really a "transition" (the status doesn't change) — but
      // reusing InvalidJobTransitionError communicates the same thing an
      // out-of-sequence lifecycle call always does. assertJobTransition
      // itself can't be reused here since its transition table correctly
      // treats Executing -> Executing as illegal (it's not a state
      // change), which would make it reject this always, even when it's
      // actually fine.
      throw new InvalidJobTransitionError(this.props.status, JobStatus.Executing);
    }
    return new Job({
      ...this.props,
      executionIds: [...this.props.executionIds, executionId],
      metadata: touchMetadata(this.props.metadata, clock),
    });
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
