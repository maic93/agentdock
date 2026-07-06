import type { AddressInfo } from "node:net";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createServer } from "./server.js";
import { buildTestDependencies, FakeProvider } from "./test-support.js";
import type { Server } from "node:http";

describe("HTTP server (integration)", () => {
  let server: Server;
  let baseUrl: string;

  beforeEach(async () => {
    const deps = buildTestDependencies(
      new FakeProvider("Hello! How can I help you today?", "fake-model"),
    );
    server = createServer(deps);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  it("runs the full pipeline for a real HTTP request: POST /execute -> completed response", async () => {
    const response = await fetch(`${baseUrl}/execute`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ goal: "Hello" }),
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      executionId: string;
      status: string;
      response: string;
      provider: string;
      model: string;
      durationMs: number;
    };
    expect(body.status).toBe("completed");
    expect(body.response).toBe("Hello! How can I help you today?");
    expect(body.provider).toBe("fake-provider");
    expect(body.model).toBe("fake-model");
    expect(body.durationMs).toBeGreaterThanOrEqual(0);
    expect(body.executionId).toBeTruthy();
    expect(response.headers.get("deprecation")).toBe("true");
  });

  it("makes the execution retrievable via GET /executions/:id afterward", async () => {
    const executeResponse = await fetch(`${baseUrl}/execute`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ goal: "Hello" }),
    });
    const { executionId } = (await executeResponse.json()) as { executionId: string };

    const getResponse = await fetch(`${baseUrl}/executions/${executionId}`);

    expect(getResponse.status).toBe(200);
    const body = (await getResponse.json()) as { id: string; status: string };
    expect(body.id).toBe(executionId);
    expect(body.status).toBe("completed");
  });

  it("returns 404 for an unknown execution id", async () => {
    const response = await fetch(`${baseUrl}/executions/does-not-exist`);
    expect(response.status).toBe(404);
  });

  it("returns 400 for a request body that isn't valid JSON", async () => {
    const response = await fetch(`${baseUrl}/execute`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{not valid json",
    });
    expect(response.status).toBe(400);
  });

  it("returns 400 validation error when goal is missing", async () => {
    const response = await fetch(`${baseUrl}/execute`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(response.status).toBe(400);
  });

  it("serves GET /health", async () => {
    const response = await fetch(`${baseUrl}/health`);
    expect(response.status).toBe(200);
    const body = (await response.json()) as { status: string };
    expect(body.status).toBe("healthy");
  });

  it("returns 404 for an unrecognized route", async () => {
    const response = await fetch(`${baseUrl}/nonexistent`);
    expect(response.status).toBe(404);
  });

  // Required by this milestone: POST /jobs -> Execution created ->
  // Execution completed -> Job completed, verified end-to-end over real
  // HTTP, not just at the JobService unit level (see
  // packages/kernel/job-service/src/job-service.spec.ts for that).
  it("POST /jobs creates a Job, runs a real Execution for it, and completes both", async () => {
    const createResponse = await fetch(`${baseUrl}/jobs`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ goal: "Hello" }),
    });
    expect(createResponse.status).toBe(200);
    const created = (await createResponse.json()) as {
      jobId: string;
      status: string;
      executionId: string;
      response: string;
    };
    expect(created.status).toBe("completed");
    expect(created.response).toBe("Hello! How can I help you today?");
    expect(created.jobId).toBeTruthy();
    expect(created.executionId).toBeTruthy();

    // The Execution this Job created is independently retrievable and
    // itself completed, and knows which Job it belongs to.
    const executionResponse = await fetch(`${baseUrl}/executions/${created.executionId}`);
    expect(executionResponse.status).toBe(200);
    const execution = (await executionResponse.json()) as { status: string; jobId: string };
    expect(execution.status).toBe("completed");
    expect(execution.jobId).toBe(created.jobId);

    // The Job itself is independently retrievable and completed, and
    // knows the Execution it created.
    const jobResponse = await fetch(`${baseUrl}/jobs/${created.jobId}`);
    expect(jobResponse.status).toBe(200);
    const job = (await jobResponse.json()) as {
      status: string;
      executionIds: string[];
      result: { summary: string };
    };
    expect(job.status).toBe("completed");
    expect(job.executionIds).toEqual([created.executionId]);
    expect(job.result.summary).toBe("Hello! How can I help you today?");
  });

  it("GET /jobs/:id/executions returns the Job's owned Execution", async () => {
    const createResponse = await fetch(`${baseUrl}/jobs`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ goal: "Hello" }),
    });
    const created = (await createResponse.json()) as { jobId: string; executionId: string };

    const response = await fetch(`${baseUrl}/jobs/${created.jobId}/executions`);

    expect(response.status).toBe(200);
    const body = (await response.json()) as { executions: Array<{ id: string }> };
    expect(body.executions).toHaveLength(1);
    expect(body.executions[0]?.id).toBe(created.executionId);
  });

  it("returns 404 for an unknown job id", async () => {
    const response = await fetch(`${baseUrl}/jobs/does-not-exist`);
    expect(response.status).toBe(404);
  });

  it("returns 404 for GET /jobs/:id/executions on an unknown job id", async () => {
    const response = await fetch(`${baseUrl}/jobs/does-not-exist/executions`);
    expect(response.status).toBe(404);
  });

  it("POST /jobs returns a 422 planning error for an unclassifiable goal", async () => {
    const response = await fetch(`${baseUrl}/jobs`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ goal: "Reticulate the splines" }),
    });
    expect(response.status).toBe(422);
    const body = (await response.json()) as { status: string; error: { category: string } };
    expect(body.status).toBe("failed");
    expect(body.error.category).toBe("planning");
  });

  it("POST /execute and POST /jobs against the same goal produce consistent, independently-retrievable records", async () => {
    // Backward-compatibility check: the old and new endpoints are two
    // faces of the same underlying JobService, so a client mixing both
    // (e.g. during a migration) sees one consistent Execution/Job model,
    // not two divergent implementations.
    const executeResponse = await fetch(`${baseUrl}/execute`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ goal: "Hello" }),
    });
    const executed = (await executeResponse.json()) as { executionId: string };

    const executionViaOldRoute = await fetch(`${baseUrl}/executions/${executed.executionId}`);
    const executionBody = (await executionViaOldRoute.json()) as { jobId: string };
    expect(executionBody.jobId).toBeTruthy();

    const jobViaNewRoute = await fetch(`${baseUrl}/jobs/${executionBody.jobId}`);
    expect(jobViaNewRoute.status).toBe(200);
    const job = (await jobViaNewRoute.json()) as { executionIds: string[] };
    expect(job.executionIds).toEqual([executed.executionId]);
  });
});
