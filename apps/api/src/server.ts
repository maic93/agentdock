import {
  createServer as createHttpServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import type { AppDependencies } from "./dependencies.js";
import { errorBody, statusCodeForCategory } from "./error-mapping.js";
import type { RouteResult } from "./route-result.js";
import { handleExecute } from "./routes/execute.js";
import { handleGetExecution } from "./routes/get-execution.js";
import { handleHealth } from "./routes/health.js";
import { handleCreateJob, handleGetJob, handleGetJobExecutions } from "./routes/jobs.js";
import {
  handleGetProvider,
  handleListProviders,
  handleProvidersHealth,
} from "./routes/providers.js";
import { handleGetRouting } from "./routes/routing.js";

const EXECUTION_PATH_PATTERN = /^\/executions\/([^/]+)$/;
const JOB_PATH_PATTERN = /^\/jobs\/([^/]+)$/;
const JOB_EXECUTIONS_PATH_PATTERN = /^\/jobs\/([^/]+)\/executions$/;
const PROVIDER_PATH_PATTERN = /^\/providers\/([^/]+)$/;

/**
 * Builds the HTTP server. Uses `node:http` directly rather than a
 * framework: routes don't need one, and avoiding the dependency avoids a
 * whole category of version-compatibility risk for no real benefit at
 * this scope (see ADR 0004).
 */
export function createServer(deps: AppDependencies): Server {
  return createHttpServer((req, res) => {
    dispatch(deps, req, res).catch((cause: unknown) => {
      sendJson(res, {
        status: 500,
        body: errorBody(
          "execution",
          cause instanceof Error ? cause.message : "Internal server error.",
        ),
      });
    });
  });
}

async function dispatch(
  deps: AppDependencies,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const url = new URL(req.url ?? "/", "http://localhost");

  if (req.method === "POST" && url.pathname === "/execute") {
    let body: unknown;
    try {
      body = await readJsonBody(req);
    } catch {
      sendJson(res, {
        status: statusCodeForCategory("validation"),
        body: errorBody("validation", "Request body must be valid JSON."),
        headers: { Deprecation: "true" },
      });
      return;
    }
    sendJson(res, await handleExecute(deps, body));
    return;
  }

  if (req.method === "POST" && url.pathname === "/jobs") {
    let body: unknown;
    try {
      body = await readJsonBody(req);
    } catch {
      sendJson(res, {
        status: statusCodeForCategory("validation"),
        body: errorBody("validation", "Request body must be valid JSON."),
      });
      return;
    }
    sendJson(res, await handleCreateJob(deps, body));
    return;
  }

  // Most specific pattern first: /jobs/:id/executions before /jobs/:id,
  // since the latter's regex would otherwise never get a chance to not
  // match the former (both start with /jobs/).
  const jobExecutionsMatch = JOB_EXECUTIONS_PATH_PATTERN.exec(url.pathname);
  if (req.method === "GET" && jobExecutionsMatch) {
    const rawId = decodeURIComponent(jobExecutionsMatch[1] ?? "");
    sendJson(res, await handleGetJobExecutions(deps, rawId));
    return;
  }

  const jobMatch = JOB_PATH_PATTERN.exec(url.pathname);
  if (req.method === "GET" && jobMatch) {
    const rawId = decodeURIComponent(jobMatch[1] ?? "");
    sendJson(res, await handleGetJob(deps, rawId));
    return;
  }

  const executionMatch = EXECUTION_PATH_PATTERN.exec(url.pathname);
  if (req.method === "GET" && executionMatch) {
    const rawId = decodeURIComponent(executionMatch[1] ?? "");
    sendJson(res, await handleGetExecution(deps, rawId));
    return;
  }

  if (req.method === "GET" && url.pathname === "/health") {
    sendJson(res, await handleHealth(deps));
    return;
  }

  // Most specific pattern first: /providers/health (a literal path) before
  // /providers/:id (which would otherwise treat "health" as an id).
  if (req.method === "GET" && url.pathname === "/providers/health") {
    sendJson(res, await handleProvidersHealth(deps));
    return;
  }

  if (req.method === "GET" && url.pathname === "/providers") {
    sendJson(res, await handleListProviders(deps));
    return;
  }

  const providerMatch = PROVIDER_PATH_PATTERN.exec(url.pathname);
  if (req.method === "GET" && providerMatch) {
    const rawId = decodeURIComponent(providerMatch[1] ?? "");
    sendJson(res, await handleGetProvider(deps, rawId));
    return;
  }

  if (req.method === "GET" && url.pathname === "/routing") {
    sendJson(res, await handleGetRouting(deps, url.searchParams));
    return;
  }

  sendJson(res, {
    status: statusCodeForCategory("not_found"),
    body: errorBody("not_found", `No route for ${req.method ?? "GET"} ${url.pathname}.`),
  });
}

function sendJson(res: ServerResponse, result: RouteResult): void {
  const payload = JSON.stringify(result.body);
  res.writeHead(result.status, {
    "content-type": "application/json; charset=utf-8",
    ...result.headers,
  });
  res.end(payload);
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (raw.trim().length === 0) {
    return {};
  }
  return JSON.parse(raw);
}
