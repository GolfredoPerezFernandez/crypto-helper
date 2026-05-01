import type { MoralisSolanaNetwork, MoralisWalletTokensResult } from "~/server/crypto-helper/moralis-api";
import { getMoralisWalletNftSyncChains } from "~/server/crypto-helper/moralis-nft-sync-chains";
import {
  fetchMoralisNativeBalance,
  fetchMoralisSolanaPortfolio,
  fetchMoralisSolanaSwaps,
  fetchMoralisWalletCrossChainTokens,
  fetchMoralisWalletDefiPositions,
  fetchMoralisWalletDefiPositionsByProtocol,
  fetchMoralisWalletDefiSummary,
  fetchMoralisWalletNetWorth,
  fetchMoralisWalletNftCollections,
  fetchMoralisWalletNfts,
  fetchMoralisWalletProfitability,
  fetchMoralisWalletProfitabilitySummary,
  fetchMoralisWalletTokenApprovals,
  fetchMoralisWalletTokens,
  fetchMoralisWalletTransactions,
} from "~/server/crypto-helper/moralis-api";

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
  /**
   * Universal API — `/wallets/:a/defi/:protocolId/positions` por protocolo (rellenado en sync).
   * Clave = `protocolId` del resumen DeFi (p. ej. `basebridge`). Evita cargas bajo demanda en la UI.
   */
  defiProtocolPositions?: Record<string, MoralisWalletTokensResult>;
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
  /**
   * Moralis GET `/{address}/nft/collections` — agregado por contrato (sync diario).
   * Para omitir en sync: `disabledApis` con `nftCollections`, `nftCollectionsBase` o `nftCollectionsEth`.
   */
  nftCollectionsBase?: MoralisWalletTokensResult;
  nftCollectionsEth?: MoralisWalletTokensResult;
  /**
   * Colecciones por cadena (Moralis `chain`). Claves = slug Moralis (`eth`, `base`, `polygon`, …).
   * Lista de cadenas: `MORALIS_SYNC_WALLET_NFT_CHAINS` o {@link getMoralisWalletNftSyncChains}.
   */
  nftCollectionsByChain?: Record<string, MoralisWalletTokensResult>;
  /** GET `/wallets/{address}/nfts` por cadena (vista previa en wallet). */
  nftsByChain?: Record<string, MoralisWalletTokensResult>;
};

export type WalletSnapshotBuildOptions = {
  disabledApis?: ReadonlySet<string>;
};

/** Turso `api_wallet_snapshots.address`: EVM lowercased; Solana trim, case preserved. */
/** IDs únicos en `defiSummary.result.protocols` para prefetch por protocolo (Universal API). */
function extractProtocolIdsFromDefiSummary(defiSummary: MoralisWalletTokensResult | undefined): string[] {
  if (!defiSummary?.ok || defiSummary.data == null) return [];
  const data = defiSummary.data as Record<string, unknown>;
  const result = data.result as Record<string, unknown> | undefined;
  const protocols = Array.isArray(result?.protocols) ? (result.protocols as Record<string, unknown>[]) : [];
  const ids = new Set<string>();
  for (const p of protocols) {
    const id = String(p.protocolId ?? "").trim();
    if (id) ids.add(id);
  }
  return [...ids];
}

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

function nftCollectionFetchDisabled(disabled: ReadonlySet<string>, chain: string): boolean {
  const ch = chain.trim().toLowerCase();
  if (disabled.has("nftCollections")) return true;
  if (ch === "base" && disabled.has("nftCollectionsBase")) return true;
  if ((ch === "eth" || ch === "ethereum") && disabled.has("nftCollectionsEth")) return true;
  if (disabled.has(`nftCollections_${ch}`)) return true;
  return false;
}

function walletNftFetchDisabled(disabled: ReadonlySet<string>, chain: string): boolean {
  const ch = chain.trim().toLowerCase();
  if (disabled.has("walletNfts")) return true;
  if (ch === "base" && disabled.has("nftsBase")) return true;
  if (disabled.has(`walletNfts_${ch}`)) return true;
  return false;
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
  const [nw, nwEth, tokBase, tokEth, txBase, txEth, pnlBase, pnlEth, nativeBase, nativeEth] =
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

  const nftColT0 = Date.now();
  const nftChains = getMoralisWalletNftSyncChains();
  const nftPerChainLimit = Math.min(
    100,
    Math.max(8, Math.floor(Number(process.env.MORALIS_SYNC_WALLET_NFTS_PER_CHAIN_LIMIT ?? 28))),
  );
  const nftCollectionOpts = {
    limit: 50,
    exclude_spam: true as const,
    token_counts: true as const,
    include_prices: true as const,
  };

  const [nftCollectionsPairs, nftsPairs] = await Promise.all([
    Promise.all(
      nftChains.map(async (chain) => {
        const ch = chain.trim().toLowerCase();
        const r = nftCollectionFetchDisabled(disabled, ch)
          ? disabledApiStub(`nftCollections_${ch}`)
          : await fetchMoralisWalletNftCollections(address, ch, nftCollectionOpts);
        return [ch, r] as const;
      }),
    ),
    Promise.all(
      nftChains.map(async (chain) => {
        const ch = chain.trim().toLowerCase();
        const r = walletNftFetchDisabled(disabled, ch)
          ? disabledApiStub(`walletNfts_${ch}`)
          : await fetchMoralisWalletNfts(address, ch, nftPerChainLimit);
        return [ch, r] as const;
      }),
    ),
  ]);

  const nftCollectionsByChain = Object.fromEntries(nftCollectionsPairs) as Record<
    string,
    MoralisWalletTokensResult
  >;
  const nftsByChain = Object.fromEntries(nftsPairs) as Record<string, MoralisWalletTokensResult>;

  const nftCollectionsBase =
    nftCollectionsByChain.base ?? disabledApiStub("nftCollectionsBase");
  const nftCollectionsEth =
    nftCollectionsByChain.eth ?? disabledApiStub("nftCollectionsEth");
  const nfts = nftsByChain.base ?? disabledApiStub("nftsBase");

  const nftColMs = Date.now() - nftColT0;

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
  let defiProtocolPositions: Record<string, MoralisWalletTokensResult> | undefined;
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

  /** ~5000 CU por protocolo; limitado por env para controlar coste en sync. */
  const protocolDetailOn =
    defiOn &&
    !/^0|false|no$/i.test(String(process.env.MORALIS_SYNC_WALLET_DEFI_PROTOCOL_DETAILS ?? "1"));
  const protocolMax = Math.max(
    1,
    Math.min(50, Math.floor(Number(process.env.MORALIS_SYNC_WALLET_DEFI_PROTOCOL_MAX ?? 25) || 25)),
  );
  if (protocolDetailOn && defiSummary?.ok) {
    const ids = extractProtocolIdsFromDefiSummary(defiSummary).slice(0, protocolMax);
    if (ids.length > 0) {
      const tProto = Date.now();
      const chains = ["ethereum", "base"] as const;
      const pairs = await Promise.all(
        ids.map(async (protocolId) => {
          const r = await fetchMoralisWalletDefiPositionsByProtocol(address, chains, { limit: 50 });
          return [protocolId, r] as const;
        }),
      );
      defiProtocolPositions = Object.fromEntries(pairs);
      walletSnapshotLog("defi protocol positions prefetched", {
        address: `${address.slice(0, 10)}…`,
        requested: ids.length,
        ms: Date.now() - tProto,
        ok: pairs.filter(([, r]) => r.ok).length,
      });
    }
  }

  walletSnapshotLog("wallet snapshot built (evm)", {
    address: `${address.slice(0, 10)}…`,
    totalMs: Date.now() - t0,
    coreMs,
    nftColMs,
    extraMs,
    coreOk: {
      nw: nw.ok,
      nwEth: nwEth.ok,
      tokBase: tokBase.ok,
      tokEth: tokEth.ok,
      nfts: nfts.ok,
      nftChains: nftChains.length,
      nftCollectionsBase: nftCollectionsBase.ok,
      nftCollectionsEth: nftCollectionsEth.ok,
      txBase: txBase.ok,
      txEth: txEth.ok,
      pnlBase: pnlBase.ok,
      pnlEth: pnlEth.ok,
      nativeBase: nativeBase.ok,
      nativeEth: nativeEth.ok,
    },
    extraEnabled: { crossChainOn, defiOn, pnlDetailOn, approvalsOn, protocolDetailOn },
    extraOk: {
      tokensCrossChain: tokensCrossChain?.ok,
      defiSummary: defiSummary?.ok,
      defiPositions: defiPositions?.ok,
      defiProtocolPositions:
        defiProtocolPositions &&
        Object.keys(defiProtocolPositions).length > 0 &&
        Object.values(defiProtocolPositions).every((x) => x.ok),
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
    nftCollectionsBase,
    nftCollectionsEth,
    nftCollectionsByChain,
    nftsByChain,
    weekBase,
    interactBase,
    ...(crossChainOn ? { tokensCrossChain } : {}),
    ...(defiOn ? { defiSummary, defiPositions } : {}),
    ...(defiProtocolPositions && Object.keys(defiProtocolPositions).length > 0
      ? { defiProtocolPositions }
      : {}),
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
  if (s.defiProtocolPositions && Object.keys(s.defiProtocolPositions).length > 0) {
    base.defiProtocolPositions_allOk = Object.values(s.defiProtocolPositions).every((x) => x.ok);
  }
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
  if (s.nftCollectionsByChain && Object.keys(s.nftCollectionsByChain).length > 0) {
    for (const [ch, r] of Object.entries(s.nftCollectionsByChain)) {
      base[`nftCollections_${ch}`] = r.ok;
    }
  } else {
    if (s.nftCollectionsBase !== undefined) base.nftCollectionsBase = s.nftCollectionsBase.ok;
    if (s.nftCollectionsEth !== undefined) base.nftCollectionsEth = s.nftCollectionsEth.ok;
  }
  if (s.nftsByChain && Object.keys(s.nftsByChain).length > 0) {
    for (const [ch, r] of Object.entries(s.nftsByChain)) {
      base[`walletNfts_${ch}`] = r.ok;
    }
  } else {
    base.nftsBase = s.nfts.ok;
  }
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

function mapApiRowToCrossChain(row: Record<string, unknown>): CrossChainTokenRow {
  return {
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
    securityScore: typeof row.securityScore === "number" ? (row.securityScore as number) : null,
    verifiedContract: Boolean(row.verifiedContract),
    possibleSpam: Boolean(row.possibleSpam),
    nativeToken: Boolean(row.nativeToken),
  };
}

/** Map Moralis / Universal API `chainId` values to a short human label (for charts and tables). */
export function chainLabelFromChainId(raw: unknown): string {
  const v = String(raw ?? "").toLowerCase();
  if (v === "0x1" || v === "ethereum" || v === "eth") return "Ethereum";
  if (v === "0x2105" || v === "base") return "Base";
  if (v === "0x89" || v === "polygon" || v === "matic") return "Polygon";
  if (v === "0xa" || v === "optimism" || v === "op") return "Optimism";
  if (v === "0xa4b1" || v === "arbitrum") return "Arbitrum";
  if (v === "0x38" || v === "binance" || v === "bsc") return "BNB Chain";
  if (v === "0xa86a" || v === "avalanche") return "Avalanche";
  if (v === "0xe708" || v === "linea") return "Linea";
  if (v === "solana-mainnet" || v === "sol") return "Solana";
  return raw ? String(raw) : "—";
}

/** All chains from a Universal API `/wallets/.../tokens` payload (multi-chain). */
export function crossChainTokenRowsAll(data: unknown): CrossChainTokenRow[] {
  const payload = data as { result?: Record<string, unknown>[] } | null;
  const arr = Array.isArray(payload?.result) ? (payload.result as Record<string, unknown>[]) : [];
  const rows = arr.map(mapApiRowToCrossChain).filter((r) => !r.possibleSpam);
  rows.sort((a, b) => {
    if (a.nativeToken && !b.nativeToken) return -1;
    if (!a.nativeToken && b.nativeToken) return 1;
    return (b.usdValue ?? 0) - (a.usdValue ?? 0);
  });
  return rows;
}

/** Legacy per-chain Moralis balances as unified rows (Base + Ethereum snapshots). */
export function legacyTokenRowsAsCrossChain(tokBaseData: unknown, tokEthData: unknown): CrossChainTokenRow[] {
  const out: CrossChainTokenRow[] = [];
  const num = (v: unknown): number | null => {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() !== "") {
      const n = Number(v);
      if (Number.isFinite(n)) return n;
    }
    return null;
  };
  for (const t of tokenRowsFromMoralis(tokBaseData)) {
    const row = t as Record<string, unknown>;
    const usd = Number(row.usd_value ?? 0);
    const balanceN =
      num(row.balance_formatted) ??
      num(row.balance) ??
      num(row.amount);
    const priceN =
      num(row.usd_price) ??
      num(row.token_price_usd) ??
      num(row.usdPrice) ??
      (balanceN != null && balanceN > 0 ? usd / balanceN : null);
    out.push({
      tokenAddress: String(row.token_address ?? ""),
      chainId: "0x2105",
      name: row.name == null ? null : String(row.name),
      symbol: row.symbol == null ? null : String(row.symbol),
      decimals: typeof row.decimals === "number"
        ? (row.decimals as number)
        : null,
      logo: erc20LogoUrl(row),
      balance:
        row.balance_formatted == null
          ? null
          : String(row.balance_formatted),
      balanceRaw: String(row.balance ?? ""),
      usdPrice: priceN,
      usdValue: Number.isFinite(usd) ? usd : 0,
      usdPrice24hrPercentChange: null,
      portfolioPercentage: null,
      securityScore: null,
      verifiedContract: false,
      possibleSpam: false,
      nativeToken: Boolean(row.native_token),
    });
  }
  for (const t of tokenRowsFromMoralis(tokEthData)) {
    const row = t as Record<string, unknown>;
    const usd = Number(row.usd_value ?? 0);
    const balanceN =
      num(row.balance_formatted) ??
      num(row.balance) ??
      num(row.amount);
    const priceN =
      num(row.usd_price) ??
      num(row.token_price_usd) ??
      num(row.usdPrice) ??
      (balanceN != null && balanceN > 0 ? usd / balanceN : null);
    out.push({
      tokenAddress: String(row.token_address ?? ""),
      chainId: "0x1",
      name: row.name == null ? null : String(row.name),
      symbol: row.symbol == null ? null : String(row.symbol),
      decimals: typeof row.decimals === "number"
        ? (row.decimals as number)
        : null,
      logo: erc20LogoUrl(row),
      balance:
        row.balance_formatted == null
          ? null
          : String(row.balance_formatted),
      balanceRaw: String(row.balance ?? ""),
      usdPrice: priceN,
      usdValue: Number.isFinite(usd) ? usd : 0,
      usdPrice24hrPercentChange: null,
      portfolioPercentage: null,
      securityScore: null,
      verifiedContract: false,
      possibleSpam: false,
      nativeToken: Boolean(row.native_token),
    });
  }
  const totalUsd = out.reduce((s, r) => s + (r.usdValue ?? 0), 0);
  if (totalUsd > 0) {
    for (const r of out) {
      const usd = r.usdValue ?? 0;
      r.portfolioPercentage = usd > 0 ? (usd / totalUsd) * 100 : 0;
    }
  }
  out.sort((a, b) => (b.usdValue ?? 0) - (a.usdValue ?? 0));
  return out;
}

export type WalletChainFilterId =
  | "all"
  | "ethereum"
  | "base"
  | "polygon"
  | "arbitrum"
  | "optimism"
  | "bsc"
  | "avalanche"
  | "linea";

const CHAIN_FILTER_IDS: Record<Exclude<WalletChainFilterId, "all">, string[]> = {
  ethereum: ["0x1", "ethereum", "eth"],
  base: ["0x2105", "base"],
  polygon: ["0x89", "polygon", "matic"],
  arbitrum: ["0xa4b1", "arbitrum", "arb"],
  optimism: ["0xa", "optimism", "op"],
  bsc: ["0x38", "bsc", "binance"],
  avalanche: ["0xa86a", "avalanche", "avax"],
  linea: ["0xe708", "linea"],
};

export function filterCrossChainRowsByChain(
  rows: CrossChainTokenRow[],
  filter: WalletChainFilterId,
): CrossChainTokenRow[] {
  if (filter === "all") return rows;
  const ids = CHAIN_FILTER_IDS[filter];
  return rows.filter((r) => ids.includes(String(r.chainId).toLowerCase()));
}

/** Ordered chain filters that appear in `rows` (for pill UI). */
export function chainFiltersPresentInRows(rows: CrossChainTokenRow[]): Exclude<WalletChainFilterId, "all">[] {
  const order: Exclude<WalletChainFilterId, "all">[] = [
    "ethereum",
    "base",
    "arbitrum",
    "optimism",
    "polygon",
    "bsc",
    "avalanche",
    "linea",
  ];
  const present = new Set<Exclude<WalletChainFilterId, "all">>();
  for (const r of rows) {
    const id = String(r.chainId).toLowerCase();
    for (const key of order) {
      if (CHAIN_FILTER_IDS[key].includes(id)) {
        present.add(key);
        break;
      }
    }
  }
  return order.filter((k) => present.has(k));
}

export type WalletChartSlice = { label: string; value: number; color: string };

export const WALLET_CHART_COLORS = [
  "#22d3ee", // cyan
  "#a78bfa", // violet
  "#f472b6", // pink
  "#f59e0b", // amber
  "#34d399", // emerald
  "#60a5fa", // blue
  "#fb7185", // rose
  "#facc15", // yellow
  "#c084fc", // purple
  "#2dd4bf", // teal
  "#f97316", // orange
  "#93c5fd", // light blue
];

function nwChainUsd(c: Record<string, unknown>): number {
  const raw = c.networth_usd ?? c.netWorthUsd;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "object" && raw != null) {
    const o = raw as Record<string, unknown>;
    const inner = o.usd ?? o.value ?? o.amount;
    if (typeof inner === "number" && Number.isFinite(inner)) return inner;
  }
  const s = Number(raw);
  return Number.isFinite(s) ? s : 0;
}

/** Donut slices: USD per chain from token rows; falls back to net-worth `chains[]` if needed. */
export function buildChainChartSlices(
  rows: CrossChainTokenRow[],
  nwChains?: Record<string, unknown>[],
): WalletChartSlice[] {
  const byLabel = new Map<string, number>();
  for (const r of rows) {
    const lab = chainLabelFromChainId(r.chainId);
    const v = r.usdValue ?? 0;
    if (v > 0) byLabel.set(lab, (byLabel.get(lab) ?? 0) + v);
  }
  if (byLabel.size === 0 && nwChains?.length) {
    for (const c of nwChains) {
      const lab = chainLabelFromChainId((c as Record<string, unknown>).chain);
      const v = nwChainUsd(c as Record<string, unknown>);
      if (v > 0) byLabel.set(lab, (byLabel.get(lab) ?? 0) + v);
    }
  }
  const entries = [...byLabel.entries()].sort((a, b) => b[1] - a[1]);
  return entries.map(([label, value], i) => ({
    label,
    value,
    color: WALLET_CHART_COLORS[i % WALLET_CHART_COLORS.length],
  }));
}

/** Top tokens by USD plus “Otros”. */
export function buildAssetChartSlices(rows: CrossChainTokenRow[], topN = 5): WalletChartSlice[] {
  const sorted = [...rows].filter((r) => (r.usdValue ?? 0) > 0).sort((a, b) => (b.usdValue ?? 0) - (a.usdValue ?? 0));
  const top = sorted.slice(0, topN);
  const rest = sorted.slice(topN);
  const restSum = rest.reduce((s, r) => s + (r.usdValue ?? 0), 0);
  const slices: WalletChartSlice[] = top.map((r, i) => ({
    label: (r.symbol || r.name || "?").slice(0, 14),
    value: r.usdValue ?? 0,
    color: WALLET_CHART_COLORS[i % WALLET_CHART_COLORS.length],
  }));
  if (restSum > 0) {
    slices.push({
      label: "Otros",
      value: restSum,
      color: WALLET_CHART_COLORS[slices.length % WALLET_CHART_COLORS.length],
    });
  }
  return slices;
}

/** Value-weighted average 24h % change from token rows (Universal API). */
export function portfolioWeightedChange24h(rows: CrossChainTokenRow[]): number | null {
  let num = 0;
  let den = 0;
  for (const r of rows) {
    const v = r.usdValue ?? 0;
    const p = r.usdPrice24hrPercentChange;
    if (v > 0 && p != null && Number.isFinite(p)) {
      num += v * p;
      den += v;
    }
  }
  if (den <= 0) return null;
  return num / den;
}

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
    .map(mapApiRowToCrossChain)
    .filter((r) => !r.possibleSpam);

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
