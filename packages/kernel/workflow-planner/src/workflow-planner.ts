import type { CapabilityResolver, IntentAnalyzer } from "@agentdock/kernel-planner";
import {
  type Capability,
  createWorkflowNodeId,
  type Job,
  WorkflowNodeStatus,
  WorkflowPlan,
} from "@agentdock/shared-types";
import { UnplannableWorkflowError } from "./errors.js";

export interface WorkflowPlannerDependencies {
  readonly intentAnalyzer: IntentAnalyzer;
  readonly capabilityResolver: CapabilityResolver;
}

/**
 * Produces a WorkflowPlan for a Job, deterministically, with no AI-driven
 * decomposition. Today this always produces a linear chain: one node per
 * capability the Capability Resolver returns for the Job's classified
 * intent, each depending on the one before it, mirroring how
 * kernel-planner's Planner already builds a single Execution's
 * ExecutionGraph. Reusing that shape at the workflow layer rather than
 * inventing a new one is what makes it true that the implementation
 * clearly supports future decomposition: a resolver that later returns
 * more than one capability produces a valid multi-node WorkflowPlan with
 * zero changes here.
 *
 * plan() throws UnplannableWorkflowError synchronously - it has no
 * Job/Execution object of its own to fail into. The caller (JobService)
 * is responsible for catching this and failing the Job.
 */
export class WorkflowPlanner {
  constructor(private readonly dependencies: WorkflowPlannerDependencies) {}

  plan(job: Job): WorkflowPlan {
    const { intent } = this.dependencies.intentAnalyzer.analyze(job.goal);
    const capabilities = this.dependencies.capabilityResolver.resolve(intent);

    if (capabilities.length === 0) {
      throw new UnplannableWorkflowError(intent);
    }

    return buildLinearPlan(job, capabilities);
  }
}

function buildLinearPlan(job: Job, capabilities: readonly Capability[]): WorkflowPlan {
  const nodes: Array<{
    id: ReturnType<typeof createWorkflowNodeId>;
    objective: string;
    capability: Capability;
    status: WorkflowNodeStatus;
  }> = [];
  const edges: Array<{
    from: ReturnType<typeof createWorkflowNodeId>;
    to: ReturnType<typeof createWorkflowNodeId>;
  }> = [];
  let previousId: ReturnType<typeof createWorkflowNodeId> | undefined;

  for (const capability of capabilities) {
    const id = createWorkflowNodeId();
    nodes.push({
      id,
      objective: job.goal.text,
      capability,
      status: WorkflowNodeStatus.Pending,
    });
    if (previousId) {
      edges.push({ from: previousId, to: id });
    }
    previousId = id;
  }

  return WorkflowPlan.create(job.id, nodes, edges);
}
