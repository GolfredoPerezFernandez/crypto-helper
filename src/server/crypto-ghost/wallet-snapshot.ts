import type { MoralisSolanaNetwork, MoralisWalletTokensResult } from "~/server/crypto-ghost/moralis-api";
import {
  fetchMoralisNativeBalance,
  fetchMoralisSolanaPortfolio,
  fetchMoralisSolanaSwaps,
  fetchMoralisWalletCrossChainTokens,
  fetchMoralisWalletDefiPositions,
  fetchMoralisWalletDefiSummary,
  fetchMoralisWalletNetWorth,
  fetchMoralisWalletNfts,
  fetchMoralisWalletProfitability,
  fetchMoralisWalletProfitabilitySummary,
  fetchMoralisWalletTokenApprovals,
  fetchMoralisWalletTokens,
  fetchMoralisWalletTransactions,
} from "~/server/crypto-ghost/moralis-api";

/**
 * Local logger that does NOT pull `sync-logger.ts` (which uses `node:async_hooks`).
 * `wallet-snapshot.ts` is also imported by client components for pure helpers, so
 * any top-level Node-only import would break the client bundle.
 */
function walletSnapshotLog(msg: string, meta: Record<string, unknown>): void {
  console.log("[wallet-snapshot]", msg, meta);
}

export const DAY_KEYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/** Histogram for Base tx activity (stored in snapshot as weekBase for backward compatibility). */
export type WalletBaseActivityV2 = {
  version: 2;
  buckets: { label: string; count: number }[];
  note: string;
};

export type WalletPageSnapshot = {
  nw: MoralisWalletTokensResult;
  nwEth: MoralisWalletTokensResult;
  tokBase: MoralisWalletTokensResult;
  tokEth: MoralisWalletTokensResult;
  nfts: MoralisWalletTokensResult;
  txBase: MoralisWalletTokensResult;
  txEth: MoralisWalletTokensResult;
  pnlBase: MoralisWalletTokensResult;
  pnlEth: MoralisWalletTokensResult;
  nativeBase: MoralisWalletTokensResult;
  nativeEth: MoralisWalletTokensResult;
  /** Legacy: weekday counts; current: {@link WalletBaseActivityV2} */
  weekBase: WalletBaseActivityV2 | Record<string, number> | null;
  interactBase: {
    sentPreview: string[];
    recvPreview: string[];
    sentN: number;
    recvN: number;
  } | null;
  /**
   * Universal API v1 — `/v1/wallets/:a/tokens` (cross-chain ERC-20 balances).
   * One call returns balances on all requested chains with extras: 24h % change,
   * portfolioPercentage, securityScore, verifiedContract, possibleSpam, nativeToken.
   * Replaces the per-chain `tokBase` / `tokEth` calls; we still keep those for
   * back-compat until older snapshots roll over.
   */
  tokensCrossChain?: MoralisWalletTokensResult;
  /**
   * Optional: `MORALIS_SYNC_WALLET_DEFI=1`
   * Multi-chain DeFi (Universal API). One call per endpoint covers ethereum + base.
   * Legacy `defiSummaryBase/Eth` and `defiPositionsBase/Eth` are still read by older snapshots.
   */
  defiSummary?: MoralisWalletTokensResult;
  defiPositions?: MoralisWalletTokensResult;
  /** @deprecated kept so old snapshots still display until next sync overwrites them. */
  defiSummaryBase?: MoralisWalletTokensResult;
  /** @deprecated */
  defiSummaryEth?: MoralisWalletTokensResult;
  /** @deprecated */
  defiPositionsBase?: MoralisWalletTokensResult;
  /** @deprecated */
  defiPositionsEth?: MoralisWalletTokensResult;
  /** Optional: `MORALIS_SYNC_WALLET_PROFITABILITY_DETAIL=1` (full breakdown vs summary). */
  pnlDetailBase?: MoralisWalletTokensResult;
  pnlDetailEth?: MoralisWalletTokensResult;
  /** Optional: `MORALIS_SYNC_WALLET_APPROVALS=1` */
  approvalsBase?: MoralisWalletTokensResult;
  approvalsEth?: MoralisWalletTokensResult;
  /** Present when snapshot is for a Solana address (Moralis Solana gateway). */
  solNetwork?: MoralisSolanaNetwork;
  solPortfolio?: MoralisWalletTokensResult;
  solSwaps?: MoralisWalletTokensResult;
};

export type WalletSnapshotBuildOptions = {
  disabledApis?: ReadonlySet<string>;
};

/** Turso `api_wallet_snapshots.address`: EVM lowercased; Solana trim, case preserved. */
export function normalizeWalletSnapshotAddress(raw: string): string {
  const t = raw.trim();
  if (/^0x[a-fA-F0-9]{40}$/.test(t)) return t.toLowerCase();
  return t;
}

/** Heuristic: base58 public key, not EVM. */
export function isSolanaWalletAddress(raw: string): boolean {
  const t = raw.trim();
  if (!t || /^0x/i.test(t)) return false;
  return /^[1-9A-HJ-NP-Za-km-z]{32,48}$/.test(t);
}

/** Moralis wallet tx rows: snake_case vs camelCase and numeric ISO epochs. */
export function parseMoralisWalletTxTime(tx: Record<string, unknown>): number | null {
  const raw = tx.block_timestamp ?? tx.blockTimestamp ?? tx.timestamp;
  if (raw == null) return null;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw > 1e12 ? raw : raw * 1000;
  }
  const s = String(raw).trim();
  if (!s) return null;
  const asNum = Number(s);
  if (Number.isFinite(asNum) && /^-?\d+(\.\d+)?$/.test(s)) {
    return asNum > 1e12 ? asNum : asNum * 1000;
  }
  const d = new Date(s);
  const t = d.getTime();
  return Number.isNaN(t) ? null : t;
}

function utcDayKey(ms: number): string {
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function shortUtcDayLabel(key: string): string {
  const [ys, ms, ds] = key.split("-").map((x) => Number(x));
  if (!Number.isFinite(ys) || !Number.isFinite(ms) || !Number.isFinite(ds)) return key;
  const d = new Date(Date.UTC(ys, ms - 1, ds));
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "short", timeZone: "UTC" });
}

/** Daily tx counts: prefer last 30 UTC days; if none, bucket all sampled days (up to 21). */
export function baseActivityFromTransactions(data: unknown): WalletBaseActivityV2 | null {
  const rows = (data as { result?: Record<string, unknown>[] })?.result ?? [];
  const times: number[] = [];
  for (const tx of rows) {
    const t = parseMoralisWalletTxTime(tx);
    if (t != null) times.push(t);
  }
  if (!times.length) return null;

  const todayUtc = new Date();
  todayUtc.setUTCHours(0, 0, 0, 0);
  const validKeys = new Set<string>();
  for (let i = 0; i < 30; i++) {
    validKeys.add(utcDayKey(todayUtc.getTime() - (29 - i) * 86_400_000));
  }

  const inWindow = new Map<string, number>();
  for (const t of times) {
    const k = utcDayKey(t);
    if (validKeys.has(k)) {
      inWindow.set(k, (inWindow.get(k) ?? 0) + 1);
    }
  }
  let winTotal = 0;
  for (const c of inWindow.values()) winTotal += c;

  if (winTotal > 0) {
    const buckets: { label: string; count: number }[] = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date(todayUtc.getTime() - (29 - i) * 86_400_000);
      const key = utcDayKey(d.getTime());
      buckets.push({ label: shortUtcDayLabel(key), count: inWindow.get(key) ?? 0 });
    }
    return {
      version: 2,
      buckets,
      note: "Últimos 30 días (UTC) · muestra del snapshot",
    };
  }

  const byDayAll = new Map<string, number>();
  for (const t of times) {
    const k = utcDayKey(t);
    byDayAll.set(k, (byDayAll.get(k) ?? 0) + 1);
  }
  const days = [...byDayAll.keys()].sort();
  const slice = days.slice(-21);
  return {
    version: 2,
    buckets: slice.map((key) => ({
      label: shortUtcDayLabel(key),
      count: byDayAll.get(key) ?? 0,
    })),
    note: "Días con actividad en la muestra (sin txs en los últimos 30 días; UTC)",
  };
}

/** Normalize snapshot field for UI (v2 histogram or legacy weekday map). */
export function walletBaseActivityForUi(
  weekBase: WalletBaseActivityV2 | Record<string, number> | null | undefined,
): { buckets: { label: string; count: number }[]; note: string } | null {
  if (weekBase == null || typeof weekBase !== "object") return null;
  if ("version" in weekBase && weekBase.version === 2 && Array.isArray(weekBase.buckets)) {
    const buckets = weekBase.buckets
      .map((b) => ({
        label: String(b.label ?? ""),
        count: Math.max(0, Number(b.count) || 0),
      }))
      .filter((b) => b.label);
    if (!buckets.length) return null;
    return { buckets, note: String(weekBase.note ?? "") };
  }
  const o = weekBase as Record<string, unknown>;
  const buckets: { label: string; count: number }[] = [];
  for (const day of DAY_KEYS) {
    if (day in o) {
      buckets.push({ label: day, count: Math.max(0, Number(o[day]) || 0) });
    }
  }
  if (!buckets.length) return null;
  return {
    buckets,
    note: "Por día de la semana (UTC, snapshot anterior)",
  };
}

export function interactionStats(data: unknown, walletLower: string) {
  const rows = (data as { result?: Record<string, unknown>[] })?.result ?? [];
  const sent = new Set<string>();
  const recv = new Set<string>();
  for (const tx of rows) {
    const from = String(tx.from_address ?? tx.fromAddress ?? "").toLowerCase();
    const to = String(tx.to_address ?? tx.toAddress ?? "").toLowerCase();
    if (from === walletLower && to && to !== walletLower) sent.add(to);
    if (to === walletLower && from && from !== walletLower) recv.add(from);
  }
  return {
    sentPreview: [...sent].slice(0, 12),
    recvPreview: [...recv].slice(0, 12),
    sentN: sent.size,
    recvN: recv.size,
  };
}

function evmOmitStub(): MoralisWalletTokensResult {
  return { ok: false, error: "Omitted (Solana wallet)" };
}

function disabledApiStub(key: string): MoralisWalletTokensResult {
  return { ok: false, error: `Skipped in this sync run (${key} disabled after repeated provider failures)` };
}

async function buildSolanaWalletPageSnapshot(address: string): Promise<WalletPageSnapshot> {
  const omit = evmOmitStub();
  const netRaw = String(process.env.MORALIS_SOLANA_NETWORK ?? "mainnet").trim().toLowerCase();
  const solNetwork: MoralisSolanaNetwork = netRaw === "devnet" ? "devnet" : "mainnet";
  const solSyncOn = !/^0|false|no$/i.test(String(process.env.MORALIS_SYNC_WALLET_SOLANA ?? "1"));
  const keyOk = Boolean(process.env.MORALIS_API_KEY?.trim());
  const t0 = Date.now();

  let solPortfolio: MoralisWalletTokensResult;
  let solSwaps: MoralisWalletTokensResult;
  if (!solSyncOn) {
    const msg = "Skipped (MORALIS_SYNC_WALLET_SOLANA=0)";
    solPortfolio = { ok: false, error: msg };
    solSwaps = { ok: false, error: msg };
  } else if (!keyOk) {
    solPortfolio = { ok: false, error: "Missing MORALIS_API_KEY" };
    solSwaps = { ok: false, error: "Missing MORALIS_API_KEY" };
  } else {
    [solPortfolio, solSwaps] = await Promise.all([
      fetchMoralisSolanaPortfolio(address, solNetwork, { excludeSpam: true }),
      fetchMoralisSolanaSwaps(address, solNetwork, { limit: 50, order: "DESC" }),
    ]);
  }
  walletSnapshotLog("wallet snapshot built (solana)", {
    address: `${address.slice(0, 10)}…`,
    network: solNetwork,
    ms: Date.now() - t0,
    portfolioOk: solPortfolio.ok,
    swapsOk: solSwaps.ok,
  });

  return {
    nw: omit,
    nwEth: omit,
    tokBase: omit,
    tokEth: omit,
    nfts: omit,
    txBase: omit,
    txEth: omit,
    pnlBase: omit,
    pnlEth: omit,
    nativeBase: omit,
    nativeEth: omit,
    weekBase: null,
    interactBase: null,
    solNetwork,
    solPortfolio,
    solSwaps,
  };
}

async function buildEvmWalletPageSnapshot(
  address: string,
  options?: WalletSnapshotBuildOptions,
): Promise<WalletPageSnapshot> {
  const disabled = options?.disabledApis ?? new Set<string>();
  const t0 = Date.now();
  const coreT0 = Date.now();
  const [nw, nwEth, tokBase, tokEth, nfts, txBase, txEth, pnlBase, pnlEth, nativeBase, nativeEth] =
    await Promise.all([
      disabled.has("netWorthEthBase")
        ? Promise.resolve(disabledApiStub("netWorthEthBase"))
        : fetchMoralisWalletNetWorth(address, ["eth", "base"]),
      disabled.has("netWorthEth")
        ? Promise.resolve(disabledApiStub("netWorthEth"))
        : fetchMoralisWalletNetWorth(address, "eth"),
      disabled.has("tokensBase")
        ? Promise.resolve(disabledApiStub("tokensBase"))
        : fetchMoralisWalletTokens(address, "base"),
      disabled.has("tokensEth")
        ? Promise.resolve(disabledApiStub("tokensEth"))
        : fetchMoralisWalletTokens(address, "eth"),
      disabled.has("nftsBase")
        ? Promise.resolve(disabledApiStub("nftsBase"))
        : fetchMoralisWalletNfts(address, "base", 40),
      disabled.has("txBase")
        ? Promise.resolve(disabledApiStub("txBase"))
        : fetchMoralisWalletTransactions(address, "base", 80),
      disabled.has("txEth")
        ? Promise.resolve(disabledApiStub("txEth"))
        : fetchMoralisWalletTransactions(address, "eth", 25),
      disabled.has("pnlBase")
        ? Promise.resolve(disabledApiStub("pnlBase"))
        : fetchMoralisWalletProfitabilitySummary(address, "base", "all"),
      disabled.has("pnlEth")
        ? Promise.resolve(disabledApiStub("pnlEth"))
        : fetchMoralisWalletProfitabilitySummary(address, "eth", "all"),
      disabled.has("nativeBase")
        ? Promise.resolve(disabledApiStub("nativeBase"))
        : fetchMoralisNativeBalance(address, "base"),
      disabled.has("nativeEth")
        ? Promise.resolve(disabledApiStub("nativeEth"))
        : fetchMoralisNativeBalance(address, "eth"),
    ]);
  const coreMs = Date.now() - coreT0;

  const weekBase = txBase.ok ? baseActivityFromTransactions(txBase.data) : null;
  const interactBase = txBase.ok ? interactionStats(txBase.data, address) : null;

  // Cross-chain tokens (Universal API) defaults to ON. Single call replaces 2 per-chain
  // calls' worth of data and adds 24h %, portfolioPercentage, securityScore. Same total CUs.
  const crossChainOn = !/^0|false|no$/i.test(String(process.env.MORALIS_SYNC_WALLET_CROSS_CHAIN ?? "1"));
  // DeFi defaults to ON (no env flag needed) so wallet pages show DeFi snapshot out of the box.
  const defiOn = !/^0|false|no$/i.test(String(process.env.MORALIS_SYNC_WALLET_DEFI ?? "1"));
  const pnlDetailOn = /^1|true|yes$/i.test(String(process.env.MORALIS_SYNC_WALLET_PROFITABILITY_DETAIL ?? ""));
  const approvalsOn = /^1|true|yes$/i.test(String(process.env.MORALIS_SYNC_WALLET_APPROVALS ?? ""));

  let tokensCrossChain: MoralisWalletTokensResult | undefined;
  let defiSummary: MoralisWalletTokensResult | undefined;
  let defiPositions: MoralisWalletTokensResult | undefined;
  let pnlDetailBase: MoralisWalletTokensResult | undefined;
  let pnlDetailEth: MoralisWalletTokensResult | undefined;
  let approvalsBase: MoralisWalletTokensResult | undefined;
  let approvalsEth: MoralisWalletTokensResult | undefined;

  const extra: Promise<MoralisWalletTokensResult>[] = [];
  if (crossChainOn) {
    extra.push(
      fetchMoralisWalletCrossChainTokens(address, ["ethereum", "base"], {
        limit: 200,
        excludeSpam: true,
        excludeUnverifiedContracts: true,
      }),
    );
  }
  if (defiOn) {
    extra.push(
      fetchMoralisWalletDefiSummary(address, ["ethereum", "base"]),
      fetchMoralisWalletDefiPositions(address, ["ethereum", "base"], { limit: 50 }),
    );
  }
  if (pnlDetailOn) {
    extra.push(fetchMoralisWalletProfitability(address, "base", "all"), fetchMoralisWalletProfitability(address, "eth", "all"));
  }
  if (approvalsOn) {
    extra.push(fetchMoralisWalletTokenApprovals(address, "base", 50), fetchMoralisWalletTokenApprovals(address, "eth", 50));
  }

  let extraMs = 0;
  if (extra.length > 0) {
    const extraT0 = Date.now();
    const results = await Promise.all(extra);
    extraMs = Date.now() - extraT0;
    let i = 0;
    if (crossChainOn) {
      tokensCrossChain = results[i++];
    }
    if (defiOn) {
      defiSummary = results[i++];
      defiPositions = results[i++];
    }
    if (pnlDetailOn) {
      pnlDetailBase = results[i++];
      pnlDetailEth = results[i++];
    }
    if (approvalsOn) {
      approvalsBase = results[i++];
      approvalsEth = results[i++];
    }
  }

  walletSnapshotLog("wallet snapshot built (evm)", {
    address: `${address.slice(0, 10)}…`,
    totalMs: Date.now() - t0,
    coreMs,
    extraMs,
    coreOk: {
      nw: nw.ok,
      nwEth: nwEth.ok,
      tokBase: tokBase.ok,
      tokEth: tokEth.ok,
      nfts: nfts.ok,
      txBase: txBase.ok,
      txEth: txEth.ok,
      pnlBase: pnlBase.ok,
      pnlEth: pnlEth.ok,
      nativeBase: nativeBase.ok,
      nativeEth: nativeEth.ok,
    },
    extraEnabled: { crossChainOn, defiOn, pnlDetailOn, approvalsOn },
    extraOk: {
      tokensCrossChain: tokensCrossChain?.ok,
      defiSummary: defiSummary?.ok,
      defiPositions: defiPositions?.ok,
    },
    disabledCount: disabled.size,
  });

  return {
    nw,
    nwEth,
    tokBase,
    tokEth,
    nfts,
    txBase,
    txEth,
    pnlBase,
    pnlEth,
    nativeBase,
    nativeEth,
    weekBase,
    interactBase,
    ...(crossChainOn ? { tokensCrossChain } : {}),
    ...(defiOn ? { defiSummary, defiPositions } : {}),
    ...(pnlDetailOn ? { pnlDetailBase, pnlDetailEth } : {}),
    ...(approvalsOn ? { approvalsBase, approvalsEth } : {}),
  };
}

/** Fetches Moralis once per wallet — only call from daily sync (not from HTTP routes). */
export async function buildWalletPageSnapshot(
  addressRaw: string,
  options?: WalletSnapshotBuildOptions,
): Promise<WalletPageSnapshot> {
  const trimmed = addressRaw.trim();
  if (isSolanaWalletAddress(trimmed)) {
    return buildSolanaWalletPageSnapshot(trimmed);
  }
  return buildEvmWalletPageSnapshot(trimmed.toLowerCase(), options);
}

/** Which Moralis wallet snapshot calls succeeded (for sync logging). */
export function summarizeWalletSnapshotApiResults(s: WalletPageSnapshot): Record<string, boolean> {
  const base: Record<string, boolean> = {
    netWorthEthBase: s.nw.ok,
    netWorthEth: s.nwEth.ok,
    tokensBase: s.tokBase.ok,
    tokensEth: s.tokEth.ok,
    nftsBase: s.nfts.ok,
    txBase: s.txBase.ok,
    txEth: s.txEth.ok,
    pnlBase: s.pnlBase.ok,
    pnlEth: s.pnlEth.ok,
    nativeBase: s.nativeBase.ok,
    nativeEth: s.nativeEth.ok,
  };
  if (s.tokensCrossChain !== undefined) base.tokensCrossChain = s.tokensCrossChain.ok;
  if (s.defiSummary !== undefined) base.defiSummary = s.defiSummary.ok;
  if (s.defiPositions !== undefined) base.defiPositions = s.defiPositions.ok;
  if (s.defiSummaryBase !== undefined) base.defiSummaryBase = s.defiSummaryBase.ok;
  if (s.defiSummaryEth !== undefined) base.defiSummaryEth = s.defiSummaryEth.ok;
  if (s.defiPositionsBase !== undefined) base.defiPositionsBase = s.defiPositionsBase.ok;
  if (s.defiPositionsEth !== undefined) base.defiPositionsEth = s.defiPositionsEth.ok;
  if (s.pnlDetailBase !== undefined) base.pnlDetailBase = s.pnlDetailBase.ok;
  if (s.pnlDetailEth !== undefined) base.pnlDetailEth = s.pnlDetailEth.ok;
  if (s.approvalsBase !== undefined) base.approvalsBase = s.approvalsBase.ok;
  if (s.approvalsEth !== undefined) base.approvalsEth = s.approvalsEth.ok;
  if (s.solPortfolio !== undefined) base.solPortfolio = s.solPortfolio.ok;
  if (s.solSwaps !== undefined) base.solSwaps = s.solSwaps.ok;
  return base;
}

/** Logo URL from Moralis / EVM token balance row (field names vary by API version). */
export function erc20LogoUrl(row: Record<string, unknown>): string | null {
  const candidates = [
    row.logo,
    row.logo_url,
    row.thumbnail,
    row.token_logo,
    (row as { token?: { logo?: string } }).token?.logo,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim().startsWith("http")) return c.trim();
  }
  return null;
}

export function tokenRowsFromMoralis(data: unknown) {
  const tokData = data as { result?: Record<string, unknown>[] } | null;
  return (tokData?.result ?? []).filter((t) => !t?.possible_spam).slice(0, 40);
}

/** Universal API token row (camelCase). One row per (token, chain) pair. */
export type CrossChainTokenRow = {
  tokenAddress: string;
  chainId: string;
  name: string | null;
  symbol: string | null;
  decimals: number | null;
  logo: string | null;
  balance: string | null;
  balanceRaw: string;
  usdPrice: number | null;
  usdValue: number | null;
  usdPrice24hrPercentChange: number | null;
  portfolioPercentage: number | null;
  securityScore: number | null;
  verifiedContract: boolean;
  possibleSpam: boolean;
  nativeToken: boolean;
};

/** Filter the Universal API tokens payload to a single chain (`base`, `eth`/`ethereum`, …). */
export function crossChainTokenRowsForChain(
  data: unknown,
  chain: "base" | "eth" | "ethereum" | string,
): CrossChainTokenRow[] {
  const wantHex =
    chain === "base" ? "0x2105"
    : chain === "eth" || chain === "ethereum" ? "0x1"
    : null;
  const wantSlug =
    chain === "base" ? "base"
    : chain === "eth" || chain === "ethereum" ? "ethereum"
    : String(chain).toLowerCase();

  const payload = data as { result?: Record<string, unknown>[] } | null;
  const arr = Array.isArray(payload?.result) ? (payload.result as Record<string, unknown>[]) : [];

  const rows = arr
    .filter((row) => {
      const id = String(row.chainId ?? "").toLowerCase();
      return id === wantHex || id === wantSlug;
    })
    .map((row): CrossChainTokenRow => ({
      tokenAddress: String(row.tokenAddress ?? ""),
      chainId: String(row.chainId ?? ""),
      name: row.name == null ? null : String(row.name),
      symbol: row.symbol == null ? null : String(row.symbol),
      decimals: typeof row.decimals === "number" ? (row.decimals as number) : null,
      logo: typeof row.logo === "string" ? (row.logo as string) : null,
      balance: row.balance == null ? null : String(row.balance),
      balanceRaw: String(row.balanceRaw ?? ""),
      usdPrice: typeof row.usdPrice === "number" ? (row.usdPrice as number) : null,
      usdValue: typeof row.usdValue === "number" ? (row.usdValue as number) : null,
      usdPrice24hrPercentChange:
        typeof row.usdPrice24hrPercentChange === "number"
          ? (row.usdPrice24hrPercentChange as number)
          : null,
      portfolioPercentage:
        typeof row.portfolioPercentage === "number" ? (row.portfolioPercentage as number) : null,
      securityScore:
        typeof row.securityScore === "number" ? (row.securityScore as number) : null,
      verifiedContract: Boolean(row.verifiedContract),
      possibleSpam: Boolean(row.possibleSpam),
      nativeToken: Boolean(row.nativeToken),
    }))
    .filter((r) => !r.possibleSpam);

  // Sort by USD value desc (largest holdings first), with native promoted.
  rows.sort((a, b) => {
    if (a.nativeToken && !b.nativeToken) return -1;
    if (!a.nativeToken && b.nativeToken) return 1;
    return (b.usdValue ?? 0) - (a.usdValue ?? 0);
  });
  return rows;
}

export function nftItemsFromMoralis(data: unknown) {
  const d = data as { result?: Record<string, unknown>[] } | null;
  return (d?.result ?? []).slice(0, 36);
}

export function txRowsFromMoralis(data: unknown) {
  const d = data as { result?: Record<string, unknown>[] } | null;
  return (d?.result ?? []).slice(0, 30);
}

function httpizeMediaUri(raw: string): string | null {
  const s = raw.trim();
  if (s.startsWith("http://") || s.startsWith("https://")) return s;
  if (s.startsWith("ipfs://")) {
    const rest = s.slice(7);
    const cid = rest.startsWith("ipfs/") ? rest.slice(5) : rest;
    if (cid) return `https://ipfs.io/ipfs/${cid}`;
  }
  return null;
}

export function nftImage(n: Record<string, unknown>): string | null {
  const m = n.normalized_metadata as { image?: string } | undefined;
  if (m?.image) {
    const u = httpizeMediaUri(String(m.image));
    if (u) return u;
  }
  const media = n.media as { media_collection?: { high?: { url?: string } } } | undefined;
  const highUrl = media?.media_collection?.high?.url;
  if (highUrl) {
    const u = httpizeMediaUri(String(highUrl));
    if (u) return u;
  }
  const mu = n.media_url as string | undefined;
  if (mu) {
    const u = httpizeMediaUri(mu);
    if (u) return u;
  }
  return null;
}
