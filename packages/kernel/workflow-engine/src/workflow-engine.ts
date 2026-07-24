import type { ExecutionStore } from "@agentdock/foundation-db";
import type { Planner } from "@agentdock/kernel-planner";
import {
  type Clock,
  createGoal,
  Execution,
  type ExecutionId,
  ExecutionStatus,
  type JobId,
  WorkflowNodeStatus,
  type WorkflowPlan,
} from "@agentdock/shared-types";
import { findBlockedNodes, findReadyNodes } from "./scheduler.js";
import type { Executor } from "./executor.js";

export interface WorkflowEngineDependencies {
  readonly planner: Planner;
  readonly executor: Executor;
  readonly executionStore: ExecutionStore;
  readonly clock?: Clock;
}

export interface WorkflowExecutionOutcome {
  readonly plan: WorkflowPlan;
  readonly executionIds: readonly ExecutionId[];
  readonly succeeded: boolean;
}

/**
 * Executes a WorkflowPlan in dependency order: an iterative scheduler,
 * never recursive. Each tick:
 *
 * 1. Finds nodes newly blocked by an upstream failure and marks them
 *    Skipped, extending the failure set so the NEXT tick can detect nodes
 *    blocked transitively through them -- failure propagates one layer
 *    per tick.
 * 2. Finds every node whose dependencies are all Completed (see
 *    findReadyNodes in scheduler.ts) and runs each of them, reusing the
 *    existing single-Execution Planner and Executor completely
 *    unchanged, one Execution per node.
 *
 * Parallel-ready nodes (multiple nodes ready in the same tick) are
 * identified correctly as a set (verified directly in scheduler.spec.ts
 * with a diamond graph) but are still executed sequentially within that
 * tick's for loop -- there is no real concurrent execution / worker pool
 * in this milestone (see docs/architecture/007-workflow-planning.md,
 * Known Limitations).
 */
export class WorkflowEngine {
  constructor(private readonly dependencies: WorkflowEngineDependencies) {}

  async execute(initialPlan: WorkflowPlan, jobId: JobId): Promise<WorkflowExecutionOutcome> {
    let plan = initialPlan;
    const completed = new Set<string>();
    const failed = new Set<string>();
    const executionIds: ExecutionId[] = [];

    for (;;) {
      const blocked = findBlockedNodes(plan, failed);
      for (const node of blocked) {
        plan = plan.withNode(node.id, { status: WorkflowNodeStatus.Skipped });
        failed.add(node.id);
      }

      const ready = findReadyNodes(plan, completed);
      if (ready.length === 0 && blocked.length === 0) {
        break;
      }

      for (const node of ready) {
        plan = plan.withNode(node.id, { status: WorkflowNodeStatus.Running });

        const execution = Execution.createForJob(
          jobId,
          createGoal(node.objective),
          this.dependencies.clock,
        );
        await this.dependencies.executionStore.create(execution);

        const planned = this.dependencies.planner.plan(execution);
        await this.dependencies.executionStore.update(planned);

        if (planned.status === ExecutionStatus.Failed) {
          plan = plan.withNode(node.id, {
            status: WorkflowNodeStatus.Failed,
            executionId: planned.id,
          });
          executionIds.push(planned.id);
          failed.add(node.id);
          continue;
        }

        const executed = await this.dependencies.executor.execute(planned);
        await this.dependencies.executionStore.update(executed);
        executionIds.push(executed.id);

        if (executed.status === ExecutionStatus.Failed) {
          plan = plan.withNode(node.id, {
            status: WorkflowNodeStatus.Failed,
            executionId: executed.id,
          });
          failed.add(node.id);
        } else {
          plan = plan.withNode(node.id, {
            status: WorkflowNodeStatus.Completed,
            executionId: executed.id,
          });
          completed.add(node.id);
        }
      }
    }

    const succeeded = plan.nodes.every((node) => node.status === WorkflowNodeStatus.Completed);
    return { plan, executionIds, succeeded };
  }
}
