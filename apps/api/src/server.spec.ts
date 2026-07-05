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
});
