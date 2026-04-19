import { AsyncLocalStorage } from "node:async_hooks";

export type SyncRunContext = {
  runId: string;
  syncRunDbId?: number;
};

const syncRunAls = new AsyncLocalStorage<SyncRunContext>();

export function withSyncRun<T>(runId: string, fn: () => Promise<T>): Promise<T> {
  return syncRunAls.run({ runId }, fn);
}

export function setSyncRunDbId(id: number): void {
  const s = syncRunAls.getStore();
  if (s) s.syncRunDbId = id;
}

function prefix(): string {
  const s = syncRunAls.getStore();
  if (!s) return "[market-sync]";
  const db = s.syncRunDbId != null ? ` dbRun=${s.syncRunDbId}` : "";
  return `[market-sync ${s.runId}${db}]`;
}

export function syncLogInfo(msg: string, meta?: Record<string, unknown>): void {
  if (meta && Object.keys(meta).length > 0) console.log(prefix(), msg, meta);
  else console.log(prefix(), msg);
}

export function syncLogWarn(msg: string, meta?: Record<string, unknown>): void {
  if (meta && Object.keys(meta).length > 0) console.warn(prefix(), msg, meta);
  else console.warn(prefix(), msg);
}

export function syncLogError(msg: string, meta?: Record<string, unknown> | Error): void {
  if (meta instanceof Error) console.error(prefix(), msg, meta);
  else if (meta && Object.keys(meta).length > 0) console.error(prefix(), msg, meta);
  else console.error(prefix(), msg);
}

/** One line per external HTTP API call (CMC, Icarus, Moralis entrypoints, etc.). */
export function syncLogApi(
  api: string,
  outcome: "ok" | "fail" | "skip" | "partial",
  ms: number,
  detail?: Record<string, unknown>,
): void {
  syncLogInfo(`API ${outcome}`, { api, ms, ...detail });
}

export async function timedFetch(
  apiLabel: string,
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const t0 = Date.now();
  try {
    const res = await fetch(input, init);
    const ms = Date.now() - t0;
    syncLogApi(`HTTP ${apiLabel}`, res.ok ? "ok" : "fail", ms, {
      status: res.status,
      url: typeof input === "string" ? input : String(input),
    });
    return res;
  } catch (e: unknown) {
    const ms = Date.now() - t0;
    syncLogApi(`HTTP ${apiLabel}`, "fail", ms, {
      error: e instanceof Error ? e.message : String(e),
      url: typeof input === "string" ? input : String(input),
    });
    throw e;
  }
}
