/** Persisted on `sync_runs.usage_payload` after each daily market sync (JSON). */
export type SyncUsagePayloadV1 = {
  v: 1;
  runStartedAtSec: number;
  /** CoinGecko/CMC HTTP calls via `timedFetch` in cmc-sync. */
  cmcHttpCalls: number;
  icarusHttpCalls: number;
  nansen: {
    calls: { key: string; creditsUsed: number | null; creditsRemaining: string | null }[];
    totalCreditsReported: number | null;
  };
  moralis: {
    /** Sum of numeric values read from response headers (when Moralis sends them). */
    totalCuFromHeaders: number;
    calls: { label: string; cu: number }[];
    callsWithNoCuHeader: number;
  };
  /** Raw Moralis counters from CMC token upsert phase (for context, not CU). */
  moralisCmcMetrics?: Record<string, number>;
  /**
   * Rough CU estimate for the CMC+Moralis token phase only (docs.moralis.com Data API pricing).
   * Wallet/aux NFT calls are covered separately via headers on each `moralisGet`.
   */
  moralisCmcPhaseCuEstimate?: number;
  notes: string[];
};

type Acc = {
  runStartedAtSec: number;
  cmcHttpCalls: number;
  icarusHttpCalls: number;
  nansen: { key: string; creditsUsed: number | null; creditsRemaining: string | null }[];
  moralis: { label: string; cu: number }[];
  moralisNoHeader: number;
  moralisCmcMetrics?: Record<string, number>;
  moralisCmcPhaseCuEstimate?: number;
  notes: string[];
};
/**
 * Keep this file browser-safe: it can be pulled transitively from modules that are
 * shared with client helpers. We intentionally avoid importing `node:async_hooks`
 * at top-level to prevent Vite client build failures in CI.
 *
 * For our sync jobs (single logical run context), a lightweight module-local store
 * is enough. If no capture is active, record* calls are no-ops.
 */
let currentAcc: Acc | null = null;

function emptyAcc(startedAtSec: number): Acc {
  return {
    runStartedAtSec: startedAtSec,
    cmcHttpCalls: 0,
    icarusHttpCalls: 0,
    nansen: [],
    moralis: [],
    moralisNoHeader: 0,
    notes: [],
  };
}

export function beginSyncUsageCapture(runStartedAtSec: number): void {
  currentAcc = emptyAcc(runStartedAtSec);
}

export function recordCmcHttpCall(): void {
  const s = currentAcc;
  if (s) s.cmcHttpCalls++;
}

export function recordIcarusHttpCall(): void {
  const s = currentAcc;
  if (s) s.icarusHttpCalls++;
}

export function recordNansenCall(key: string, creditsUsed: string | null | undefined, creditsRemaining?: string | null): void {
  const s = currentAcc;
  if (!s) return;
  const n = parseNansenCreditsNumber(creditsUsed);
  s.nansen.push({
    key,
    creditsUsed: n,
    creditsRemaining: creditsRemaining ?? null,
  });
}

export function readMoralisComputeUnitsFromResponse(res: Response): number | null {
  const candidates = [
    "x-moralis-compute-units",
    "x-moralis-compute-unit-cost",
    "x-moralis-credits-cost",
    "x-api-key-compute-units",
    "x-ratelimit-compute-cost",
  ];
  for (const h of candidates) {
    const raw = res.headers.get(h) ?? res.headers.get(h.toUpperCase());
    if (raw == null || raw === "") continue;
    const n = Number(String(raw).trim());
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return null;
}

export function recordMoralisResponse(res: Response, label: string): void {
  const s = currentAcc;
  if (!s) return;
  const cu = readMoralisComputeUnitsFromResponse(res);
  if (cu == null) {
    s.moralisNoHeader++;
    return;
  }
  s.moralis.push({ label, cu });
}

export function attachMoralisCmcPhaseEstimate(metrics: Record<string, number>, estimateCu: number): void {
  const s = currentAcc;
  if (!s) return;
  s.moralisCmcMetrics = metrics;
  s.moralisCmcPhaseCuEstimate = Math.max(0, Math.floor(estimateCu));
}

export function takeSyncUsageSnapshot(): SyncUsagePayloadV1 | null {
  const s = currentAcc;
  if (!s) return null;
  let nansenSum = 0;
  let nansenHas = false;
  for (const row of s.nansen) {
    if (row.creditsUsed != null && Number.isFinite(row.creditsUsed)) {
      nansenSum += row.creditsUsed;
      nansenHas = true;
    }
  }
  let moralisCu = 0;
  for (const row of s.moralis) moralisCu += row.cu;

  const notes = [...s.notes];
  if (s.moralisNoHeader > 0) {
    notes.push(
      `${s.moralisNoHeader} llamadas Moralis sin header de CU reconocido — el total por headers puede quedar bajo; revisa docs/respuesta real o usa la estimación de fase CMC.`,
    );
  }

  return {
    v: 1,
    runStartedAtSec: s.runStartedAtSec,
    cmcHttpCalls: s.cmcHttpCalls,
    icarusHttpCalls: s.icarusHttpCalls,
    nansen: {
      calls: s.nansen,
      totalCreditsReported: nansenHas ? nansenSum : null,
    },
    moralis: {
      totalCuFromHeaders: moralisCu,
      calls: s.moralis,
      callsWithNoCuHeader: s.moralisNoHeader,
    },
    moralisCmcMetrics: s.moralisCmcMetrics,
    moralisCmcPhaseCuEstimate: s.moralisCmcPhaseCuEstimate,
    notes,
  };
}

function parseNansenCreditsNumber(raw: string | null | undefined): number | null {
  if (raw == null || raw === "") return null;
  const n = Number(String(raw).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : null;
}
