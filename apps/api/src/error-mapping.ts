/**
 * The stable, API-facing error categories, distinguishing exactly the
 * failure classes this milestone's error-handling requirement names:
 * planning, routing, provider, execution, configuration, and the two
 * HTTP-native categories (validation, not_found) that don't correspond to
 * a domain error at all.
 */
export type ErrorCategory =
  | "planning"
  | "routing"
  | "provider"
  | "execution"
  | "configuration"
  | "validation"
  | "not_found";

/** Maps an {@link ExecutionError}'s `code` (see the Planner and Executor) to an API error category. */
export function categorizeErrorCode(code: string | undefined): ErrorCategory {
  switch (code) {
    case "UNPLANNABLE_GOAL":
    case "PLANNING_FAILED":
      return "planning";
    case "ROUTING_ERROR":
      return "routing";
    case "PROVIDER_ERROR":
      return "provider";
    default:
      return "execution";
  }
}

/** Maps an {@link ErrorCategory} to the HTTP status code the API responds with. */
export function statusCodeForCategory(category: ErrorCategory): number {
  switch (category) {
    case "validation":
    case "configuration":
      return 400;
    case "not_found":
      return 404;
    case "planning":
      // The request was well-formed, but AgentDock has no capability that
      // can satisfy it — a 422 ("unprocessable") communicates that more
      // precisely than a generic 400 or 500 would.
      return 422;
    case "routing":
    case "provider":
      // The request was plannable, but the upstream provider (or the
      // routing layer trying to reach one) failed — a 502-style "bad
      // gateway" reflects that the problem is downstream, not with the
      // request itself.
      return 502;
    case "execution":
      return 500;
    default: {
      const exhaustiveCheck: never = category;
      return exhaustiveCheck;
    }
  }
}

/** The structured error body shape returned by every failing API response. */
export function errorBody(
  category: ErrorCategory,
  message: string,
): { error: { category: ErrorCategory; message: string } } {
  return { error: { category, message } };
}
