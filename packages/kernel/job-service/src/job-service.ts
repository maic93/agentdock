import type { ExecutionStore, JobRepository } from "@agentdock/foundation-db";
import type { Planner } from "@agentdock/kernel-planner";
import type { Executor } from "@agentdock/kernel-workflow-engine";
import {
  type Clock,
  createGoal,
  Execution,
  ExecutionStatus,
  type ExecutionError,
  Job,
  jobResultFromExecutionResult,
} from "@agentdock/shared-types";

export interface JobServiceDependencies {
  readonly jobRepository: JobRepository;
  readonly executionStore: ExecutionStore;
  readonly planner: Planner;
  readonly executor: Executor;
  readonly clock?: Clock;
}

/**
 * Orchestrates the Job domain on top of the existing Execution
 * infrastructure — the Planner and Executor built in earlier milestones
 * are used completely unchanged; this class's job is entirely
 * coordination: create a Job, create an Execution owned by it, hand that
 * Execution to the Planner and then the Executor exactly as `apps/api`
 * used to do directly, and reflect each stage back onto the Job.
 *
 * See docs/architecture/005-job-domain.md for why this coordination lives
 * in its own kernel package rather than inside `apps/api` (the Job domain
 * is orchestration logic, not an HTTP concern) or inside the Planner or
 * Executor themselves (neither of those needs to know a Job exists — they
 * still only ever see an `Execution`).
 */
export class JobService {
  constructor(private readonly deps: JobServiceDependencies) {}

  /**
   * Creates a Job for `goalText`, plans and executes exactly one Execution
   * for it, and returns the Job in its final (Completed or Failed) state.
   * Persists the Job and its Execution after every stage, so a concurrent
   * `GET /jobs/:id` reflects real progress, not just the final outcome.
   *
   * Throws only if `goalText` itself is invalid (the same
   * `InvalidGoalError` `createGoal` always throws) — once a Job exists,
   * every subsequent failure (planning, routing, provider) is reflected as
   * a Failed Job, never a thrown exception, consistent with how Execution
   * itself already treats failure as a first-class outcome.
   */
  async createJob(goalText: string): Promise<Job> {
    const goal = createGoal(goalText);

    let job = Job.create(goal, undefined, this.deps.clock);
    await this.deps.jobRepository.create(job);

    job = job.startPlanning(this.deps.clock);
    await this.deps.jobRepository.update(job);

    const execution = Execution.createForJob(job.id, goal, this.deps.clock);
    await this.deps.executionStore.create(execution);

    const planned = this.deps.planner.plan(execution);
    await this.deps.executionStore.update(planned);

    if (planned.status === ExecutionStatus.Failed) {
      return this.failJob(job, planned.error, this.deps.clock);
    }

    job = job.beginExecution(planned.id, this.deps.clock);
    await this.deps.jobRepository.update(job);

    const executed = await this.deps.executor.execute(planned);
    await this.deps.executionStore.update(executed);

    if (executed.status === ExecutionStatus.Failed) {
      return this.failJob(job, executed.error, this.deps.clock);
    }

    // Invariant: an Execution that isn't Failed after Executor.execute has
    // a result — the Executor never returns any other non-terminal status.
    const result = jobResultFromExecutionResult(executed.result!);
    const completed = job.complete(result, this.deps.clock);
    await this.deps.jobRepository.update(completed);
    return completed;
  }

  private async failJob(job: Job, error: ExecutionError | undefined, clock?: Clock): Promise<Job> {
    // Invariant: an Execution in the Failed status always has an error —
    // see Execution.fail, the only way to reach that status.
    const failed = job.fail(error!, clock);
    await this.deps.jobRepository.update(failed);
    return failed;
  }
}
