import type { ExecutionStore, JobRepository, WorkflowRepository } from "@agentdock/foundation-db";
import type { WorkflowEngine } from "@agentdock/kernel-workflow-engine";
import type { WorkflowPlanner } from "@agentdock/kernel-workflow-planner";
import {
  type Clock,
  createExecutionError,
  createGoal,
  type ExecutionError,
  Job,
  jobResultFromExecutionResult,
  WorkflowNodeStatus,
  type WorkflowPlan,
} from "@agentdock/shared-types";

export interface JobServiceDependencies {
  readonly jobRepository: JobRepository;
  readonly workflowRepository: WorkflowRepository;
  readonly executionStore: ExecutionStore;
  readonly workflowPlanner: WorkflowPlanner;
  readonly workflowEngine: WorkflowEngine;
  readonly clock?: Clock;
}

/**
 * Orchestrates the Job domain on top of the existing Execution and (as of
 * milestone 008) Workflow infrastructure. WorkflowPlanner and
 * WorkflowEngine are used completely unchanged; this class's job is
 * entirely coordination: create a Job, plan a WorkflowPlan for it, run
 * that plan (which creates and executes one Execution per node, in
 * dependency order), and reflect the outcome back onto the Job.
 *
 * See docs/architecture/007-workflow-planning.md for why this
 * coordination lives in its own kernel package rather than inside
 * apps/api, and for why Job and WorkflowPlan are separate concepts.
 */
export class JobService {
  constructor(private readonly deps: JobServiceDependencies) {}

  /**
   * Creates a Job for `goalText`, plans a WorkflowPlan for it, runs that
   * plan to completion (or until nothing more can progress), and returns
   * the Job in its final (Completed or Failed) state. Persists the Job,
   * its WorkflowPlan, and every Execution the plan creates after each
   * stage, so a concurrent `GET /jobs/:id` reflects real progress.
   *
   * Throws only if `goalText` itself is invalid (the same
   * `InvalidGoalError` `createGoal` always throws). Once a Job exists,
   * every subsequent failure (planning, routing, provider, or a
   * downstream node skipped due to an upstream failure) is reflected as a
   * Failed Job, never a thrown exception.
   */
  async createJob(goalText: string): Promise<Job> {
    const goal = createGoal(goalText);

    let job = Job.create(goal, undefined, this.deps.clock);
    await this.deps.jobRepository.create(job);

    job = job.startPlanning(this.deps.clock);
    await this.deps.jobRepository.update(job);

    let plan: WorkflowPlan;
    try {
      plan = this.deps.workflowPlanner.plan(job);
    } catch (cause) {
      return this.failJob(job, toWorkflowPlanningError(cause), this.deps.clock);
    }
    await this.deps.workflowRepository.create(plan);

    job = job.withWorkflow(plan.workflowId, this.deps.clock);
    await this.deps.jobRepository.update(job);

    job = job.startExecuting(this.deps.clock);
    await this.deps.jobRepository.update(job);

    const outcome = await this.deps.workflowEngine.execute(plan, job.id);
    await this.deps.workflowRepository.update(outcome.plan);

    for (const executionId of outcome.executionIds) {
      job = job.addExecution(executionId, this.deps.clock);
    }
    await this.deps.jobRepository.update(job);

    if (!outcome.succeeded) {
      const error = await this.findFailureReason(outcome.plan);
      return this.failJob(job, error, this.deps.clock);
    }

    // Invariant: a successful workflow has at least one node.
    const lastNode = outcome.plan.nodes[outcome.plan.nodes.length - 1];
    const lastExecution = lastNode?.executionId
      ? await this.deps.executionStore.get(lastNode.executionId)
      : undefined;
    // Invariant: every Completed node has an executionId whose Execution
    // is itself Completed with a result.
    const result = jobResultFromExecutionResult(lastExecution!.result!);
    const completed = job.complete(result, this.deps.clock);
    await this.deps.jobRepository.update(completed);
    return completed;
  }

  private async findFailureReason(plan: WorkflowPlan): Promise<ExecutionError> {
    const failedNode = plan.nodes.find((node) => node.status === WorkflowNodeStatus.Failed);
    if (failedNode?.executionId) {
      const execution = await this.deps.executionStore.get(failedNode.executionId);
      if (execution.error) {
        return execution.error;
      }
    }
    return createExecutionError("Workflow failed with no further detail.", "WORKFLOW_FAILED");
  }

  private async failJob(job: Job, error: ExecutionError, clock?: Clock): Promise<Job> {
    const failed = job.fail(error, clock);
    await this.deps.jobRepository.update(failed);
    return failed;
  }
}

function toWorkflowPlanningError(cause: unknown): ExecutionError {
  if (cause instanceof Error) {
    return createExecutionError(cause.message, "UNPLANNABLE_GOAL", cause);
  }
  return createExecutionError("Unknown planning failure.", "UNPLANNABLE_GOAL", cause);
}
