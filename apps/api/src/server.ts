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

const EXECUTION_PATH_PATTERN = /^\/executions\/([^/]+)$/;

/**
 * Builds the HTTP server. Uses `node:http` directly rather than a
 * framework: three routes don't need one, and avoiding the dependency
 * avoids a whole category of version-compatibility risk for no real
 * benefit at this scope (see ADR 0004).
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
      });
      return;
    }
    sendJson(res, await handleExecute(deps, body));
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

  sendJson(res, {
    status: statusCodeForCategory("not_found"),
    body: errorBody("not_found", `No route for ${req.method ?? "GET"} ${url.pathname}.`),
  });
}

function sendJson(res: ServerResponse, result: RouteResult): void {
  const payload = JSON.stringify(result.body);
  res.writeHead(result.status, { "content-type": "application/json; charset=utf-8" });
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
