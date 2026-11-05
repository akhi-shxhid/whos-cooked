import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

/** Stable error codes. Clients branch on `code`, people read `message`. */
export type ApiErrorCode = "not_found" | "internal_error" | "db_not_configured" | "db_unavailable";

export interface ApiErrorBody {
  error: { code: ApiErrorCode; message: string };
}

export function apiError(c: Context, status: ContentfulStatusCode, code: ApiErrorCode, message: string) {
  return c.json<ApiErrorBody>({ error: { code, message } }, status);
}
