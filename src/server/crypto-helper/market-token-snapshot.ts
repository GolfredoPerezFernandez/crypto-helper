/** Parsed `cached_market_tokens.api_snapshot` (filled by daily CMC+Moralis sync). Safe for client bundles — no DB imports. */
export type TokenApiSnapshot = {
  syncedAt?: number;
  moralisChain?: string;
  cmcQuotes?: { ok: boolean; data?: unknown; error?: string };
  cmcInfo?: { ok: boolean; data?: unknown; error?: string };
  topGainers?: { ok: boolean; data?: unknown; error?: string };
  /** Optional: `MORALIS_SYNC_TOKEN_TOP_LOSERS=1` in daily sync. */
  topLosers?: { ok: boolean; data?: unknown; error?: string };
  owners?: { ok: boolean; data?: unknown; error?: string };
  moralisPrice?: { ok: boolean; data?: unknown; error?: string };
  moralisTransfers?: { ok: boolean; data?: unknown; error?: string };
  moralisMeta?: { ok: boolean; data?: unknown; error?: string };
  /** Pro / extra CUs — optional; set `MORALIS_SYNC_TOKEN_INSIGHTS=1` in sync. */
  moralisTokenScore?: { ok: boolean; data?: unknown; error?: string };
  moralisTokenScoreHistorical?: { ok: boolean; data?: unknown; error?: string };
  moralisTokenPairs?: { ok: boolean; data?: unknown; error?: string };
  /** Optional: set `MORALIS_SYNC_TOKEN_SWAPS=1` in sync (~50 CUs/token). */
  moralisSwaps?: { ok: boolean; data?: unknown; error?: string };
  /** Optional: set `MORALIS_SYNC_TOKEN_ANALYTICS=1` in sync (~80 CUs/token). */
  moralisTokenAnalytics?: { ok: boolean; data?: unknown; error?: string };
  /** Optional: `MORALIS_SYNC_TOKEN_SNIPERS=1` + insights (uses first pair from Moralis pairs). */
  moralisPairSnipers?: { ok: boolean; data?: unknown; error?: string };
  /** Optional: `MORALIS_SYNC_TOKEN_ERC20_STATS=1` — Moralis getTokenStats (~50 CUs). */
  moralisErc20Stats?: { ok: boolean; data?: unknown; error?: string };
};

export function parseTokenApiSnapshot(raw: string | null | undefined): TokenApiSnapshot | null {
  if (raw == null || String(raw).trim() === "") return null;
  try {
    return JSON.parse(String(raw)) as TokenApiSnapshot;
  } catch {
    return null;
  }
}

/**
 * Resolves `quote.USD` for a CMC id inside `apiSnapshot.cmcQuotes`.
 * Accepts both `{ data: { [id]: coin } }` (quotes/latest) and our sync wrapper `{ data: { data: { [id] } } }`.
 * Only skips when `ok === false` (missing `ok` still tries to read `data`).
 */
export function extractCmcUsdFromSnapshot(
  snap: TokenApiSnapshot | null | undefined,
  cmcId: number | null | undefined,
): Record<string, unknown> | null {
  if (snap == null) return null;
  const cq = snap.cmcQuotes;
  if (cq == null || cq.ok === false || cq.data == null) return null;
  const root = cq.data as Record<string, unknown>;
  const inner = root.data as Record<string, unknown> | undefined;

  let idStr: string | null =
    cmcId != null && Number.isFinite(Number(cmcId)) ? String(Math.trunc(Number(cmcId))) : null;
  if (idStr == null && inner != null && typeof inner === "object") {
    const numericKeys = Object.keys(inner).filter((k) => /^\d+$/.test(k));
    if (numericKeys.length === 1) idStr = numericKeys[0];
  }
  if (idStr == null) return null;

  let coin: unknown = inner?.[idStr];
  if (coin == null) coin = root[idStr];
  if (coin == null || typeof coin !== "object") return null;
  const q = (coin as Record<string, unknown>).quote as Record<string, unknown> | undefined;
  if (q == null) return null;
  const usd = q.USD ?? q.usd;
  if (usd == null || typeof usd !== "object") return null;
  return usd as Record<string, unknown>;
}

function snakeToCamelKey(snakeKey: string): string {
  const parts = snakeKey.split("_").filter(Boolean);
  if (parts.length <= 1) return snakeKey;
  return parts[0] + parts.slice(1).map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join("");
}

/** Read a numeric CMC USD field; tries snake_case and camelCase (e.g. percent_change_24h / percentChange24h). */
export function cmcUsdNumericField(usd: Record<string, unknown>, snakeKey: string): string | undefined {
  const camelKey = snakeToCamelKey(snakeKey);
  const raw = usd[snakeKey] ?? usd[camelKey];
  if (raw == null || raw === "") return undefined;
  const n = typeof raw === "number" ? raw : Number(String(raw).replace(/,/g, "").replace(",", "."));
  return Number.isFinite(n) ? String(n) : undefined;
}
