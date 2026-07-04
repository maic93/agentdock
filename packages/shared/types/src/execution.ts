import type { Capability } from "./capability.js";
import type { ExecutionError } from "./execution-error.js";
import { createExecutionId, type ExecutionId } from "./execution-id.js";
import type { ExecutionGraph } from "./execution-graph.js";
import {
  type Clock,
  createInitialMetadata,
  type ExecutionMetadata,
  touchMetadata,
} from "./execution-metadata.js";
import type { ExecutionResult } from "./execution-result.js";
import { assertTransition, ExecutionStatus } from "./execution-status.js";
import type { Goal } from "./goal.js";
import type { Intent } from "./intent.js";

export interface ExecutionProps {
  readonly id: ExecutionId;
  readonly goal: Goal;
  readonly status: ExecutionStatus;
  readonly intent?: Intent;
  readonly capabilities?: readonly Capability[];
  readonly graph?: ExecutionGraph;
  readonly result?: ExecutionResult;
  readonly error?: ExecutionError;
  readonly metadata: ExecutionMetadata;
}

/**
 * Represents a user's requested goal, from creation until completion.
 *
 * This is the central abstraction of AgentDock (see
 * docs/architecture/003-execution-domain.md for the full rationale). Every
 * future module — the AI Router, the Workflow Engine, providers, plugins,
 * projects, scheduling — reads or writes an Execution; none of them own it.
 *
 * Execution is intentionally immutable: every lifecycle method returns a
 * *new* Execution rather than mutating the receiver. This makes "what did
 * this execution look like when the Planner handed it off" an answerable
 * question (the caller still holds the earlier reference if it kept one),
 * and makes the type safe to hand to multiple readers without defensive
 * copying. State is only reachable through the accessors below — there is
 * no way to reach in and set `status` directly, so `assertTransition` is
 * the only path to a status change and can never be bypassed.
 */
export class Execution {
  private constructor(private readonly props: ExecutionProps) {}

  /** Creates a new Execution in the Created status for the given goal. */
  static create(goal: Goal, clock?: Clock): Execution {
    return new Execution({
      id: createExecutionId(),
      goal,
      status: ExecutionStatus.Created,
      metadata: createInitialMetadata(clock),
    });
  }

  /**
   * Reconstructs an Execution from previously-recorded props — used by an
   * {@link ExecutionStore} implementation reading a persisted record back
   * into a domain object. Deliberately separate from `create` so that
   * "make a new Execution" and "rehydrate an existing one" can never be
   * confused at a call site.
   */
  static fromProps(props: ExecutionProps): Execution {
    return new Execution(props);
  }

  get id(): ExecutionId {
    return this.props.id;
  }

  get goal(): Goal {
    return this.props.goal;
  }

  get status(): ExecutionStatus {
    return this.props.status;
  }

  get intent(): Intent | undefined {
    return this.props.intent;
  }

  get capabilities(): readonly Capability[] | undefined {
    return this.props.capabilities;
  }

  get graph(): ExecutionGraph | undefined {
    return this.props.graph;
  }

  get result(): ExecutionResult | undefined {
    return this.props.result;
  }

  get error(): ExecutionError | undefined {
    return this.props.error;
  }

  get metadata(): ExecutionMetadata {
    return this.props.metadata;
  }

  /** Exposes the immutable props for persistence/serialization. Read-only by type. */
  toProps(): ExecutionProps {
    return this.props;
  }

  /** Created -> Analyzing. */
  startAnalyzing(clock?: Clock): Execution {
    return this.transitionTo(ExecutionStatus.Analyzing, {}, clock);
  }

  /** Analyzing -> Planning, recording the resolved Intent. */
  completeAnalysis(intent: Intent, clock?: Clock): Execution {
    return this.transitionTo(ExecutionStatus.Planning, { intent }, clock);
  }

  /** Planning -> Routing, recording the resolved capabilities and the planned graph. */
  completePlanning(
    capabilities: readonly Capability[],
    graph: ExecutionGraph,
    clock?: Clock,
  ): Execution {
    return this.transitionTo(ExecutionStatus.Routing, { capabilities, graph }, clock);
  }

  /** Routing -> Executing. */
  completeRouting(clock?: Clock): Execution {
    return this.transitionTo(ExecutionStatus.Executing, {}, clock);
  }

  /** Executing -> Completed, recording the final result. */
  complete(result: ExecutionResult, clock?: Clock): Execution {
    return this.transitionTo(ExecutionStatus.Completed, { result }, clock);
  }

  /**
   * Any non-terminal status -> Failed, recording the error. Unlike the
   * other transition methods, this one is legal from every non-terminal
   * status (see execution-status.ts) because a goal can fail at any stage,
   * not only while executing.
   */
  fail(error: ExecutionError, clock?: Clock): Execution {
    return this.transitionTo(ExecutionStatus.Failed, { error }, clock);
  }

  private transitionTo(
    to: ExecutionStatus,
    patch: Partial<Pick<ExecutionProps, "intent" | "capabilities" | "graph" | "result" | "error">>,
    clock?: Clock,
  ): Execution {
    assertTransition(this.props.status, to);
    return new Execution({
      ...this.props,
      ...patch,
      status: to,
      metadata: touchMetadata(this.props.metadata, clock),
    });
  }
}
