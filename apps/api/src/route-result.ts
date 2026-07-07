/**
 * What every route handler returns: an HTTP status, a JSON-serializable
 * body, and optional extra response headers — added for `POST /execute`
 * (see routes/execute.ts) to mark the deprecated endpoint with a
 * `Deprecation` header without every other handler needing to know
 * headers exist.
 */
export interface RouteResult {
  readonly status: number;
  readonly body: unknown;
  readonly headers?: Record<string, string>;
}
