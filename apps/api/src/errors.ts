import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

/** Stable error codes. Clients branch on `code`, people read `message`. */
export type ApiErrorCode =
  | "not_found"
  | "internal_error"
  | "db_not_configured"
  | "db_unavailable"
  | "invalid_request"
  | "invalid_signature"
  | "payments_not_configured"
  | "purchase_not_available"
  | "guardian_required"
  | "purchase_not_found"
  | "purchase_refunded"
  | "not_allowed"
  | "not_configured"
  | "score_rejected";

export interface ApiErrorBody {
  error: { code: ApiErrorCode; message: string };
}

export function apiError(c: Context, status: ContentfulStatusCode, code: ApiErrorCode, message: string) {
  return c.json<ApiErrorBody>({ error: { code, message } }, status);
}
