/** What every route handler returns: an HTTP status and a JSON-serializable body. */
export interface RouteResult {
  readonly status: number;
  readonly body: unknown;
}
