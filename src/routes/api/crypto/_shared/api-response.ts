export type ApiErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "NOT_FOUND"
  | "UPSTREAM_ERROR"
  | "SNAPSHOT_MISSING"
  | "INTERNAL_ERROR";

export function apiError(code: ApiErrorCode, error: string, details?: Record<string, unknown>) {
  return {
    ok: false as const,
    code,
    error,
    ...(details ? { details } : {}),
  };
}

export function apiOk<T>(data: T, meta?: Record<string, unknown>) {
  return {
    ok: true as const,
    data,
    ...(meta ? meta : {}),
  };
}
