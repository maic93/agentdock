import type { WorkflowId, WorkflowPlan } from "@agentdock/shared-types";
import { WorkflowAlreadyExistsError, WorkflowNotFoundError } from "./errors.js";
import type { WorkflowRepository } from "./workflow-repository.js";

/**
 * An in-memory WorkflowRepository, backed by a Map - the same structure
 * as InMemoryJobRepository and InMemoryExecutionStore. Deliberately
 * duplicates that structure rather than sharing a generic base, following
 * the same precedent explicitly justified in ADR 0005 when
 * InMemoryJobRepository was added: this repository is now a THIRD
 * instance of the identical pattern, which is exactly the threshold
 * ADR 0005 named as the point to reconsider a shared generic - noted
 * here, not acted on in this milestone (see
 * docs/architecture/007-workflow-planning.md, Known Limitations).
 */
export class InMemoryWorkflowRepository implements WorkflowRepository {
  private readonly plansById = new Map<WorkflowId, WorkflowPlan>();

  async create(plan: WorkflowPlan): Promise<WorkflowPlan> {
    if (this.plansById.has(plan.workflowId)) {
      throw new WorkflowAlreadyExistsError(plan.workflowId);
    }
    this.plansById.set(plan.workflowId, plan);
    return plan;
  }

  async get(id: WorkflowId): Promise<WorkflowPlan> {
    const plan = this.plansById.get(id);
    if (!plan) {
      throw new WorkflowNotFoundError(id);
    }
    return plan;
  }

  async update(plan: WorkflowPlan): Promise<WorkflowPlan> {
    if (!this.plansById.has(plan.workflowId)) {
      throw new WorkflowNotFoundError(plan.workflowId);
    }
    this.plansById.set(plan.workflowId, plan);
    return plan;
  }

  async list(): Promise<readonly WorkflowPlan[]> {
    return Array.from(this.plansById.values());
  }

  async delete(id: WorkflowId): Promise<void> {
    if (!this.plansById.delete(id)) {
      throw new WorkflowNotFoundError(id);
    }
  }
}
