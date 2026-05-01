/**
 * Derives a compact wallet highlight list from smart-money DEX trade payloads (sync-time only).
 * Field names vary by API version — we resolve likely wallet columns without surfacing vendor names in product UI.
 */

export type DexActivityWalletRow = {
  address: string;
  tradeCount: number;
  label: string | null;
  lastChain: string | null;
  lastTokenSymbol: string | null;
  lastTimestamp: string | null;
};

export type DexActivityHighlightBundle = {
  syncedAt: number;
  sourceSyncedAt: number;
  wallets: DexActivityWalletRow[];
};

const SKIP_ADDRESS_KEYS = new Set(
  [
    "token_address",
    "pair_address",
    "pool_address",
    "contract_address",
    "router_address",
    "spender_address",
  ].map((k) => k.toLowerCase()),
);

function extractTradeRows(apiResponse: unknown): Record<string, unknown>[] {
  if (!apiResponse || typeof apiResponse !== "object") return [];
  const root = apiResponse as Record<string, unknown>;
  if (Array.isArray(root.data)) return root.data as Record<string, unknown>[];
  const inner = root.data;
  if (inner && typeof inner === "object" && Array.isArray((inner as Record<string, unknown>).data)) {
    return (inner as Record<string, unknown>).data as Record<string, unknown>[];
  }
  return [];
}

function str(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s || null;
}

function isEvmWallet(s: string): boolean {
  return /^0x[a-f0-9]{40}$/i.test(s);
}

/** Prefer explicit trader / wallet fields, then other *address* keys except token/pool. */
function walletFromRow(row: Record<string, unknown>): string | null {
  const preferred = [
    "trader_address",
    "wallet_address",
    "smart_money_address",
    "from_address",
    "taker_address",
    "maker_address",
    "user_address",
    "owner_address",
  ];
  for (const k of preferred) {
    const a = str(row[k]);
    if (a && isEvmWallet(a)) return a.toLowerCase();
  }
  for (const [k, v] of Object.entries(row)) {
    const kl = k.toLowerCase();
    if (!kl.includes("address")) continue;
    if (SKIP_ADDRESS_KEYS.has(kl)) continue;
    const a = str(v);
    if (a && isEvmWallet(a)) return a.toLowerCase();
  }
  return null;
}

function labelFromRow(row: Record<string, unknown>): string | null {
  const raw =
    row.smart_money_labels ??
    row.smartMoneyLabels ??
    row.labels ??
    row.label ??
    row.entity_name ??
    row.entityName;
  if (Array.isArray(raw)) {
    const parts = raw.map((x) => str(x)).filter(Boolean) as string[];
    return parts.length ? parts.slice(0, 3).join(" · ") : null;
  }
  return str(raw);
}

export function buildDexActivityHighlightFromApiData(
  apiResponse: unknown,
  opts: { bundleSyncedAt: number; sourceSyncedAt: number },
): DexActivityHighlightBundle | null {
  const rows = extractTradeRows(apiResponse);
  if (!rows.length) return null;

  type Agg = {
    count: number;
    label: string | null;
    lastChain: string | null;
    lastTokenSymbol: string | null;
    lastTs: string | null;
  };
  const map = new Map<string, Agg>();

  for (const row of rows) {
    const w = walletFromRow(row);
    if (!w) continue;
    const cur = map.get(w) ?? {
      count: 0,
      label: null,
      lastChain: null,
      lastTokenSymbol: null,
      lastTs: null,
    };
    cur.count += 1;
    const lb = labelFromRow(row);
    if (lb && !cur.label) cur.label = lb;
    const chain = str(row.chain);
    if (chain) cur.lastChain = chain;
    const sym = str(row.token_symbol ?? row.tokenSymbol ?? row.symbol);
    if (sym) cur.lastTokenSymbol = sym;
    const ts = str(row.block_timestamp ?? row.blockTimestamp ?? row.timestamp ?? row.tx_timestamp);
    if (ts && (!cur.lastTs || ts > cur.lastTs)) cur.lastTs = ts;
    map.set(w, cur);
  }

  if (!map.size) return null;

  const wallets: DexActivityWalletRow[] = [...map.entries()]
    .map(([address, a]) => ({
      address,
      tradeCount: a.count,
      label: a.label,
      lastChain: a.lastChain,
      lastTokenSymbol: a.lastTokenSymbol,
      lastTimestamp: a.lastTs,
    }))
    .sort((x, y) => y.tradeCount - x.tradeCount || x.address.localeCompare(y.address))
    .slice(0, 40);

  return {
    syncedAt: opts.bundleSyncedAt,
    sourceSyncedAt: opts.sourceSyncedAt,
    wallets,
  };
}
