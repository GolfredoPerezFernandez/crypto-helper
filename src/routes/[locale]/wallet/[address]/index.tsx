import { component$, useSignal, $ } from "@builder.io/qwik";
import { Link, routeLoader$, useLocation } from "@builder.io/qwik-city";
import { LuCopy, LuExternalLink } from "@qwikest/icons/lucide";
import { useDashboardAuth } from "../../layout";
import { getWalletSnapshotJson } from "~/server/crypto-helper/api-snapshot-sync";
import { isEvmAddress } from "~/server/crypto-helper/market-queries";
import { TokenLogoImg } from "~/components/crypto-dashboard/token-logo";
import { WalletPnlSnapshot } from "~/components/crypto-dashboard/wallet-pnl-snapshot";
import { formatUsdBalance } from "~/utils/format-market";
import {
  baseActivityFromTransactions,
  buildAssetChartSlices,
  buildChainChartSlices,
  chainFiltersPresentInRows,
  chainLabelFromChainId,
  crossChainTokenRowsAll,
  filterCrossChainRowsByChain,
  interactionStats,
  legacyTokenRowsAsCrossChain,
  nftImage,
  nftItemsFromMoralis,
  portfolioWeightedChange24h,
  txRowsFromMoralis,
  walletBaseActivityForUi,
} from "~/server/crypto-helper/wallet-snapshot";
import type { CrossChainTokenRow, WalletChainFilterId } from "~/server/crypto-helper/wallet-snapshot";
import { WalletActivityLineChart, WalletDonutChart } from "~/components/wallet/wallet-dashboard-charts";
import { EvmAddrLinks, TxHashLink } from "~/components/crypto-dashboard/evm-dash-links";
import {
  MORALIS_NFT_DEFAULT_MAINNET_CHAINS,
  moralisNftChainLabel,
} from "~/server/crypto-helper/moralis-nft-sync-chains";

function staleErr(msg: string) {
  return { ok: false as const, error: msg };
}

/**
 * Detect upstream Moralis/Express errors that we don't want to surface as a "service down" banner
 * (404s on legacy paths, HTML gateway responses, etc.). When we get one of these, we return an
 * empty string so the calling render can fall back to a neutral empty-state message.
 *
 * Genuine errors (rate limits, auth, real 5XX with JSON detail) still pass through, capped to a
 * short user-friendly summary.
 */
function cleanErrorText(raw: unknown): string {
  if (raw == null) return "";
  const s = String(raw).trim();
  if (!s) return "";
  const lower = s.slice(0, 120).toLowerCase();
  // Upstream-not-found / HTML pages should still be visible as a soft warning.
  if (
    lower.startsWith("<!doctype") ||
    lower.startsWith("<html") ||
    lower.includes("cannot get ") ||
    lower.includes("404 not found") ||
    lower.startsWith("http 404") ||
    lower.includes("upstream returned html")
  ) {
    return "El proveedor upstream no devolvió datos estructurados para esta consulta (respuesta no JSON).";
  }
  // Rate limit / auth → short hint.
  if (lower.includes("429") || lower.includes("rate limit")) {
    return "Límite de uso alcanzado en la API upstream. Reintenta en unos minutos.";
  }
  if (lower.includes("401") || lower.includes("403") || lower.includes("unauthorized")) {
    return "No autorizado por la API upstream.";
  }
  return s.length > 200 ? `${s.slice(0, 200)}…` : s;
}

type WalletViewData = {
  address: string;
  invalidAddress?: boolean;
  snapshotMissing?: boolean;
  nw?: { ok?: boolean; data?: unknown; error?: unknown };
  tokBase?: { ok?: boolean; data?: unknown; error?: unknown };
  tokEth?: { ok?: boolean; data?: unknown; error?: unknown };
  tokensCrossChain?: { ok?: boolean; data?: unknown; error?: unknown };
  nfts?: { ok?: boolean; data?: unknown; error?: unknown };
  txBase?: { ok?: boolean; data?: unknown; error?: unknown };
  txEth?: { ok?: boolean; data?: unknown; error?: unknown };
  pnlBase?: { ok?: boolean; data?: unknown; error?: unknown };
  pnlEth?: { ok?: boolean; data?: unknown; error?: unknown };
  weekBase?: unknown;
  interactBase?: { sentN: number; recvN: number; sentPreview: string[] } | null;
  defiSummary?: { ok?: boolean; data?: unknown; error?: unknown };
  defiPositions?: { ok?: boolean; data?: unknown; error?: unknown };
  nftCollectionsByChain?: Record<string, { ok?: boolean; data?: unknown; error?: unknown }>;
  nftsByChain?: Record<string, { ok?: boolean; data?: unknown; error?: unknown }>;
  nftCollectionsBase?: { ok?: boolean; data?: unknown; error?: unknown };
  nftCollectionsEth?: { ok?: boolean; data?: unknown; error?: unknown };
};

function walletLegendPct(part: number, total: number): string {
  if (total <= 0) return "—";
  const p = (part / total) * 100;
  if (p > 0 && p < 0.1) return "< 0.1%";
  return `${p.toFixed(1)}%`;
}

function truncateWalletAddr(addr: string): string {
  const a = addr.trim();
  if (a.length < 14) return a;
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function formatTxNativeAmount(tx: Record<string, unknown>, chain: "base" | "eth"): string {
  const symbol = chain === "base" ? "ETH (Base)" : "ETH";
  const direct = tx.value_formatted ?? tx.valueFormatted ?? tx.amount_formatted ?? tx.amountFormatted;
  if (typeof direct === "number" && Number.isFinite(direct)) {
    return `${direct.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${symbol}`;
  }
  if (typeof direct === "string" && direct.trim()) {
    const n = Number(direct);
    if (Number.isFinite(n)) {
      return `${n.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${symbol}`;
    }
  }
  const raw = tx.value ?? tx.amount;
  if (typeof raw === "string" && /^\d+$/.test(raw)) {
    try {
      const wei = BigInt(raw);
      const base = 10n ** 18n;
      const whole = wei / base;
      const frac = wei % base;
      const frac6 = Number((frac * 1_000_000n) / base);
      if (frac6 === 0) return `${whole.toString()} ${symbol}`;
      return `${whole.toString()}.${String(frac6).padStart(6, "0").replace(/0+$/, "")} ${symbol}`;
    } catch {
      /* ignore */
    }
  }
  if (typeof raw === "number" && Number.isFinite(raw)) {
    const n = raw > 1e12 ? raw / 1e18 : raw;
    return `${n.toLocaleString(undefined, { maximumFractionDigits: 6 })} ${symbol}`;
  }
  return "—";
}

function sortNftSnapshotChains(a: string, b: string): number {
  const ia = MORALIS_NFT_DEFAULT_MAINNET_CHAINS.indexOf(a);
  const ib = MORALIS_NFT_DEFAULT_MAINNET_CHAINS.indexOf(b);
  if (ia !== -1 && ib !== -1) return ia - ib;
  if (ia !== -1) return -1;
  if (ib !== -1) return 1;
  return a.localeCompare(b);
}

/** Cadenas presentes en el snapshot NFT (sync diario Moralis). */
function nftSnapshotChainKeys(v: {
  nftCollectionsByChain?: Record<string, unknown>;
  nftsByChain?: Record<string, unknown>;
  nftCollectionsBase?: unknown;
  nftCollectionsEth?: unknown;
  nfts?: unknown;
}): string[] {
  const col =
    v.nftCollectionsByChain && typeof v.nftCollectionsByChain === "object"
      ? Object.keys(v.nftCollectionsByChain as Record<string, unknown>)
      : [];
  const ids =
    v.nftsByChain && typeof v.nftsByChain === "object"
      ? Object.keys(v.nftsByChain as Record<string, unknown>)
      : [];
  const merged = [...new Set([...col, ...ids])].map((x) => x.trim().toLowerCase()).filter(Boolean);
  if (merged.length > 0) return [...merged].sort(sortNftSnapshotChains);
  const fallback: string[] = [];
  if (v.nftCollectionsBase != null || v.nfts != null) fallback.push("base");
  if (v.nftCollectionsEth != null) fallback.push("eth");
  return fallback.sort(sortNftSnapshotChains);
}

function nftCollectionsResultForChain(
  v: {
    nftCollectionsByChain?: Record<string, { ok?: boolean; data?: unknown; error?: unknown }>;
    nftCollectionsBase?: { ok?: boolean; data?: unknown; error?: unknown };
    nftCollectionsEth?: { ok?: boolean; data?: unknown; error?: unknown };
  },
  chain: string,
) {
  const ch = chain.trim().toLowerCase();
  return v.nftCollectionsByChain?.[ch] ?? (ch === "base" ? v.nftCollectionsBase : ch === "eth" ? v.nftCollectionsEth : undefined);
}

function walletNftsResultForChain(
  v: {
    nftsByChain?: Record<string, { ok?: boolean; data?: unknown; error?: unknown }>;
    nfts?: { ok?: boolean; data?: unknown; error?: unknown };
  },
  chain: string,
) {
  const ch = chain.trim().toLowerCase();
  return v.nftsByChain?.[ch] ?? (ch === "base" ? v.nfts : undefined);
}

const CHAIN_PILL_META: Record<WalletChainFilterId, { label: string; dot: string }> = {
  all: { label: "Todas las cadenas", dot: "bg-slate-500" },
  ethereum: { label: "Ethereum", dot: "bg-[#627eea]" },
  base: { label: "Base", dot: "bg-[#0052ff]" },
  polygon: { label: "Polygon", dot: "bg-[#8247e5]" },
  arbitrum: { label: "Arbitrum", dot: "bg-[#28a0f0]" },
  optimism: { label: "Optimism", dot: "bg-[#ff0420]" },
  bsc: { label: "BNB Chain", dot: "bg-[#f0b90b]" },
  avalanche: { label: "Avalanche", dot: "bg-[#e84142]" },
  linea: { label: "Linea", dot: "bg-slate-600 ring-1 ring-white/25" },
};

/**
 * Convert a Moralis chainId (`0x1`, `0x2105`, …) or slug (`ethereum`, `eth`, …) into the
 * Universal-API `chains=` value. Returns `""` when unsupported.
 */
function chainLabelToUniversalSlug(raw: unknown): string {
  const v = String(raw ?? "").toLowerCase();
  if (v === "0x1" || v === "ethereum" || v === "eth") return "ethereum";
  if (v === "0x2105" || v === "base") return "base";
  if (v === "0x89" || v === "polygon" || v === "matic") return "polygon";
  if (v === "0xa" || v === "optimism" || v === "op") return "optimism";
  if (v === "0xa4b1" || v === "arbitrum" || v === "arb") return "arbitrum";
  if (v === "0x38" || v === "binance" || v === "bsc") return "binance";
  if (v === "0xa86a" || v === "avalanche" || v === "avax") return "avalanche";
  if (v === "0xfa" || v === "fantom") return "fantom";
  if (v === "0xe708" || v === "linea") return "linea";
  return v;
}

/** Per Universal API, USD totals are typed as `object | null` but in practice come as numbers
 * or `{ value: number }` (legacy). Coerce to a finite number, or null. */
function pickUsd(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    for (const k of ["usd", "value", "amount"]) {
      const v = obj[k];
      if (v != null) return pickUsd(v);
    }
  }
  return null;
}

export const useWalletPageLoader = routeLoader$(async (ev) => {
  const raw = ev.params.address?.trim() || "";
  if (!isEvmAddress(raw)) {
    return {
      address: raw.toLowerCase(),
      invalidAddress: true,
      snapshotMissing: true,
      nw: staleErr("Dirección inválida. Usa una EVM address de 42 caracteres (0x + 40 hex)."),
      nwEth: staleErr("—"),
      tokBase: staleErr("—"),
      tokEth: staleErr("—"),
      nfts: staleErr("—"),
      nftCollectionsBase: staleErr("—"),
      nftCollectionsEth: staleErr("—"),
      txBase: staleErr("—"),
      txEth: staleErr("—"),
      pnlBase: staleErr("—"),
      pnlEth: staleErr("—"),
      nativeBase: staleErr("—"),
      nativeEth: staleErr("—"),
      weekBase: null,
      interactBase: null,
      defiSummary: staleErr("—"),
      defiPositions: staleErr("—"),
    };
  }
  const address = raw.toLowerCase();
  const snap = await getWalletSnapshotJson(address);
  if (!snap) {
    return {
      address,
      snapshotMissing: true,
      nw: staleErr("Sin datos en caché para esta wallet. Ejecuta el sync diario o vuelve más tarde."),
      nwEth: staleErr("—"),
      tokBase: staleErr("—"),
      tokEth: staleErr("—"),
      nfts: staleErr("—"),
      nftCollectionsBase: staleErr("—"),
      nftCollectionsEth: staleErr("—"),
      txBase: staleErr("—"),
      txEth: staleErr("—"),
      pnlBase: staleErr("—"),
      pnlEth: staleErr("—"),
      nativeBase: staleErr("—"),
      nativeEth: staleErr("—"),
      weekBase: null,
      interactBase: null,
    };
  }
  /** Prefer fresh histogram + peers from raw tx payload (fixes older snapshots with weak timestamp parsing). */
  let weekBase = snap.weekBase;
  let interactBase = snap.interactBase;
  if (snap.txBase?.ok && snap.txBase.data) {
    weekBase = baseActivityFromTransactions(snap.txBase.data);
    interactBase = interactionStats(snap.txBase.data, address);
  }
  return {
    address,
    invalidAddress: false,
    snapshotMissing: false,
    ...snap,
    weekBase,
    interactBase,
  };
});

export default component$(() => {
  const dash = useDashboardAuth();
  const d = useWalletPageLoader();
  const loc = useLocation();
  const L = loc.params.locale || "en-us";
  const v = d.value as WalletViewData;
  const invalidAddress = !!v.invalidAddress;

  const assetsTab = useSignal<"tokens" | "nfts" | "defi">("tokens");
  const tokenChainFilter = useSignal<WalletChainFilterId>("all");
  const tokenCompact = useSignal(true);
  const tokenPage = useSignal(1);
  const txTab = useSignal<"base" | "eth">("base");
  const copied = useSignal(false);

  /** Cadena Moralis para vista NFT del snapshot (multichain; sync diario). */
  const nftMcChain = useSignal(nftSnapshotChainKeys(v)[0] ?? "base");

  /** DeFi drill-down per protocol (Universal API v1 — `/wallets/:a/defi/:protocol/positions`). */
  const protoOpenId = useSignal<string>("");
  const protoLoading = useSignal(false);
  const protoErr = useSignal("");
  const protoPayload = useSignal<Record<string, unknown> | null>(null);

  const walletAddr = String(v.address || "").toLowerCase();

  /** Universal API v1 — DeFi summary (multi-chain). Falls back to legacy per-chain payload. */
  const defiSummaryUni = (v.defiSummary?.ok ? v.defiSummary.data : null) as
    | { result?: Record<string, unknown>; meta?: Record<string, unknown> }
    | null;
  const defiSummaryResult = (defiSummaryUni?.result ?? null) as Record<string, unknown> | null;
  const defiActiveProtocols =
    typeof defiSummaryResult?.activeProtocols === "number"
      ? (defiSummaryResult.activeProtocols as number)
      : 0;
  const defiTotalPositions =
    typeof defiSummaryResult?.totalPositions === "number"
      ? (defiSummaryResult.totalPositions as number)
      : 0;
  const defiTotalUsd = pickUsd(defiSummaryResult?.totalUsd);
  const defiUnclaimedUsd = pickUsd(defiSummaryResult?.totalUnclaimedUsd);
  const defiProtocols = Array.isArray(defiSummaryResult?.protocols)
    ? (defiSummaryResult.protocols as Record<string, unknown>[])
    : [];
  const defiSummaryError = !v.defiSummary?.ok ? cleanErrorText(v.defiSummary?.error) : "";

  /** Universal API v1 — DeFi positions. */
  const defiPositionsUni = (v.defiPositions?.ok ? v.defiPositions.data : null) as
    | { result?: Record<string, unknown>[] }
    | null;
  const defiPositionsList = Array.isArray(defiPositionsUni?.result)
    ? (defiPositionsUni.result as Record<string, unknown>[])
    : [];
  const defiPositionsError = !v.defiPositions?.ok ? cleanErrorText(v.defiPositions?.error) : "";

  /** Drill-down on a single DeFi protocol. Pulls Universal API v1 detailed positions. */
  const loadProtocolPositions = $(async (protocolId: string, chainId: unknown) => {
    if (!walletAddr || !protocolId) return;
    if (protoOpenId.value === protocolId && protoPayload.value) {
      // toggle close
      protoOpenId.value = "";
      protoPayload.value = null;
      protoErr.value = "";
      return;
    }
    protoOpenId.value = protocolId;
    protoLoading.value = true;
    protoErr.value = "";
    protoPayload.value = null;
    try {
      const addr = encodeURIComponent(walletAddr);
      const proto = encodeURIComponent(protocolId);
      const chain = chainLabelToUniversalSlug(chainId);
      const qs = chain ? `?chains=${encodeURIComponent(chain)}&limit=50` : `?limit=50`;
      const res = await fetch(
        `/api/crypto/moralis/wallet/${addr}/defi/${proto}/positions${qs}`,
        { credentials: "include" },
      );
      const j = (await res.json()) as { ok?: boolean; error?: string; data?: unknown };
      if (!res.ok || !j.ok) {
        protoErr.value = j.error || `HTTP ${res.status}`;
        return;
      }
      protoPayload.value = (j.data ?? null) as Record<string, unknown> | null;
    } catch (e) {
      protoErr.value = e instanceof Error ? e.message : String(e);
    } finally {
      protoLoading.value = false;
    }
  });

  const copyAddress = $(async (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    const addr = String(loc.params.address || "")
      .trim()
      .toLowerCase();
    if (!addr || typeof navigator === "undefined") return;
    try {
      await navigator.clipboard.writeText(addr);
      copied.value = true;
      setTimeout(() => {
        copied.value = false;
      }, 2000);
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = addr;
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        copied.value = true;
        setTimeout(() => {
          copied.value = false;
        }, 2000);
      } catch {
        /* ignore */
      }
    }
  });

  const nwData = v.nw?.ok ? (v.nw.data as Record<string, unknown>) : null;
  const nwTotal = nwData?.total_networth_usd;
  const nwTotalUsd = pickUsd(nwTotal);
  const nwChains = Array.isArray(nwData?.chains) ? (nwData.chains as Record<string, unknown>[]) : [];

  /**
   * Prefer Universal API `tokensCrossChain` (single multi-chain payload). Fallback: merge legacy
   * `tokBase` / `tokEth` into unified rows for charts, filters, and one token table.
   */
  const useCrossChain = !!v.tokensCrossChain?.ok;
  const allRowsUnified: CrossChainTokenRow[] = useCrossChain
    ? crossChainTokenRowsAll(v.tokensCrossChain?.ok ? v.tokensCrossChain.data : null)
    : legacyTokenRowsAsCrossChain(v.tokBase?.ok ? v.tokBase.data : null, v.tokEth?.ok ? v.tokEth.data : null);

  const tokRowsCross = filterCrossChainRowsByChain(allRowsUnified, tokenChainFilter.value);

  const tokOk = useCrossChain ? !!v.tokensCrossChain?.ok : !!(v.tokBase?.ok || v.tokEth?.ok);
  const tokErr = useCrossChain
    ? cleanErrorText(v.tokensCrossChain?.error)
    : [cleanErrorText(v.tokBase?.error), cleanErrorText(v.tokEth?.error)].filter(Boolean).join(" · ");

  const tokRowCount = tokRowsCross.length;
  const tokenCountAll = allRowsUnified.length;
  const tokenPageSize = 25;
  const tokenTotalPages = Math.max(1, Math.ceil(tokRowsCross.length / tokenPageSize));
  const tokenCurrentPage = Math.min(Math.max(1, tokenPage.value), tokenTotalPages);
  const tokenRowsVisible = tokRowsCross.slice(
    (tokenCurrentPage - 1) * tokenPageSize,
    tokenCurrentPage * tokenPageSize,
  );

  const chainSlices = buildChainChartSlices(allRowsUnified, nwChains);
  const assetSlices = buildAssetChartSlices(allRowsUnified, 6);
  const change24h = portfolioWeightedChange24h(allRowsUnified);
  const chainsForPills: WalletChainFilterId[] = ["all", ...chainFiltersPresentInRows(allRowsUnified)];

  const chainSliceTotal = chainSlices.reduce((s, x) => s + x.value, 0);
  const assetSliceTotal = assetSlices.reduce((s, x) => s + x.value, 0);

  const defiTabCount =
    defiTotalPositions || defiProtocols.length || defiPositionsList.length || 0;

  const txRows =
    txTab.value === "base"
      ? txRowsFromMoralis(v.txBase?.ok ? v.txBase.data : null)
      : txRowsFromMoralis(v.txEth?.ok ? v.txEth.data : null);
  const txOk = txTab.value === "base" ? v.txBase?.ok : v.txEth?.ok;
  const txErr = cleanErrorText(
    txTab.value === "base" ? v.txBase?.error : v.txEth?.error,
  );

  const walletNftSnap = walletNftsResultForChain(v, nftMcChain.value);
  const nfts = nftItemsFromMoralis(walletNftSnap?.ok ? walletNftSnap.data : null);
  const nftsErr = cleanErrorText(walletNftSnap?.error ?? v.nfts?.error);
  const nftMcKeys = nftSnapshotChainKeys(v);
  const baseAct = walletBaseActivityForUi(
    v.weekBase as Parameters<typeof walletBaseActivityForUi>[0],
  );

  const explorerBase = `https://basescan.org/address/${v.address}`;
  const explorerEth = `https://etherscan.io/address/${v.address}`;

  return (
    <div class="mx-auto w-full max-w-[1600px] 2xl:max-w-[1760px]">
      <nav class="mb-4 text-sm" aria-label="Migas de pan">
        <Link
          href={`/${L}/top-traders/`}
          class="inline-flex items-center gap-1 rounded-lg border border-[#043234]/80 bg-[#000D0E]/40 px-3 py-1.5 text-[#04E6E6] transition hover:border-[#04E6E6]/35 hover:bg-[#001a1c]/80"
        >
          ← Watchlist de traders
        </Link>
      </nav>

      <header class="mb-8 rounded-2xl border border-[#043234] bg-[#001a1c]/80 p-5 shadow-lg shadow-black/20">
        <p class="text-xs font-medium uppercase tracking-wide text-gray-500">Cartera EVM · datos de mercado y cadena</p>
        <h1 class="mt-1 text-2xl font-bold text-white sm:text-3xl">Resumen de wallet</h1>
        <div class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p class="min-w-0 break-all font-mono text-sm text-[#04E6E6]/90">{v.address}</p>
          <div class="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick$={copyAddress}
              aria-label="Copiar dirección"
              class="inline-flex items-center gap-1.5 rounded-lg border border-[#043234] bg-[#000D0E]/60 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-[#04E6E6]/40 hover:text-white"
            >
              <LuCopy class="h-3.5 w-3.5 shrink-0 opacity-80" />
              {copied.value ? "Copiado" : "Copiar"}
            </button>
            <a
              href={explorerBase}
              target="_blank"
              rel="noreferrer"
              class="inline-flex items-center gap-1.5 rounded-lg border border-[#043234] bg-[#000D0E]/60 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-[#04E6E6]/40 hover:text-white"
            >
              BaseScan
              <LuExternalLink class="h-3.5 w-3.5 shrink-0 opacity-70" />
            </a>
            <a
              href={explorerEth}
              target="_blank"
              rel="noreferrer"
              class="inline-flex items-center gap-1.5 rounded-lg border border-[#043234] bg-[#000D0E]/60 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:border-[#04E6E6]/40 hover:text-white"
            >
              Etherscan
              <LuExternalLink class="h-3.5 w-3.5 shrink-0 opacity-70" />
            </a>
          </div>
        </div>
      </header>
      {invalidAddress ? (
        <p class="rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200 mb-4">
          La dirección de wallet no es válida. Debe tener formato EVM: <span class="font-mono">0x + 40 hex</span>.
        </p>
      ) : null}
      {v.snapshotMissing ? (
        <p class="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200 mb-4">
          Aún no hay un resumen guardado para esta cartera. Vuelve a intentarlo más tarde.
        </p>
      ) : null}
      <p class="mb-4 text-xs text-slate-500">
        Los importes y el historial se basan en datos actualizados de forma periódica, no en tiempo real en cada visita.
      </p>

      <section class="mb-6 overflow-hidden rounded-2xl border border-[#043234] bg-[#001a1c]/80 shadow-lg shadow-black/25 motion-safe:animate-[walletFade_0.55s_ease-out_both]">
        <div class="relative">
          <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(4,230,230,0.07),transparent_52%)]" />
          <div class="relative grid gap-0 lg:grid-cols-12">
            <div class="border-b border-[#043234]/80 p-6 sm:p-8 lg:col-span-7 lg:border-b-0 lg:border-r lg:border-[#043234]/80">
              <p class="text-xs font-medium uppercase tracking-wide text-slate-500">Patrimonio total (estimado)</p>
              {v.nw?.ok && nwTotalUsd != null ? (
                <p class="mt-2 text-4xl font-bold tabular-nums tracking-tight text-white sm:text-5xl">
                  ${formatUsdBalance(nwTotalUsd)}
                </p>
              ) : (
                <p class="mt-2 text-2xl font-semibold text-slate-500">—</p>
              )}
              <div class="mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-2">
                {change24h != null ? (
                  <span
                    class={
                      change24h >= 0
                        ? "text-base font-semibold tabular-nums text-emerald-300"
                        : "text-base font-semibold tabular-nums text-rose-300"
                    }
                  >
                    {change24h >= 0 ? "+" : ""}
                    {change24h.toFixed(2)}%
                    <span class="ml-2 text-xs font-normal text-slate-500">24h · ponderado por tokens</span>
                  </span>
                ) : (
                  <span class="text-sm text-slate-500">Variación 24h no disponible en este snapshot</span>
                )}
              </div>
              <p class="mt-6 font-mono text-sm text-[#04E6E6]/90" title={walletAddr}>
                {truncateWalletAddr(walletAddr)}
              </p>
            </div>
            <div class="flex flex-col gap-6 p-6 sm:p-8 lg:col-span-5">
              <div>
                <p class="text-xs font-medium uppercase tracking-wide text-slate-500">Cadenas con balance</p>
                <p class="mt-1 text-3xl font-bold tabular-nums text-white">
                  {Math.max(0, chainsForPills.length - 1)}
                </p>
                {chainsForPills.length > 1 ? (
                  <div class="mt-3 flex flex-wrap gap-2">
                    {chainsForPills
                      .filter((cid) => cid !== "all")
                      .map((cid) => (
                        <span
                          key={cid}
                          class="inline-flex items-center gap-2 rounded-full border border-[#043234] bg-[#000D0E]/70 px-3 py-1.5 text-xs font-medium text-slate-200 motion-safe:transition-colors motion-safe:duration-200 hover:border-[#04E6E6]/40"
                        >
                          <span class={`h-2 w-2 shrink-0 rounded-full ${CHAIN_PILL_META[cid].dot}`} />
                          {CHAIN_PILL_META[cid].label}
                        </span>
                      ))}
                  </div>
                ) : (
                  <p class="mt-2 text-xs text-slate-500">Sin cadenas con saldo en el snapshot.</p>
                )}
              </div>
              {v.interactBase ? (
                <div class="border-t border-[#043234]/80 pt-5">
                  <p class="text-xs font-semibold uppercase tracking-wide text-slate-400">Contrapartes (muestra Base)</p>
                  <p class="mt-1.5 text-[11px] leading-snug text-slate-500">
                    Direcciones a las que esta wallet envió en la muestra de transacciones en caché; no es el historial
                    on-chain completo.
                  </p>
                  <dl class="mt-3 grid grid-cols-2 gap-3 text-xs">
                    <div class="rounded-lg border border-[#043234]/60 bg-[#000D0E]/50 px-3 py-2">
                      <dt class="text-[10px] uppercase tracking-wide text-slate-500">Envíos (muestra)</dt>
                      <dd class="mt-0.5 font-semibold tabular-nums text-white">{v.interactBase.sentN}</dd>
                    </div>
                    <div class="rounded-lg border border-[#043234]/60 bg-[#000D0E]/50 px-3 py-2">
                      <dt class="text-[10px] uppercase tracking-wide text-slate-500">Únicas recibidas</dt>
                      <dd class="mt-0.5 font-semibold tabular-nums text-white">{v.interactBase.recvN}</dd>
                    </div>
                  </dl>
                  {v.interactBase.sentPreview.length > 0 ? (
                    <>
                      <p class="mt-4 text-[10px] font-medium uppercase tracking-wide text-slate-500">
                        Destinos en la muestra
                      </p>
                      <ul class="mt-2 max-h-52 space-y-2 overflow-y-auto overscroll-contain pr-1">
                        {v.interactBase.sentPreview.slice(0, 8).map((a: string, i: number) => (
                          <li
                            key={a}
                            class="motion-safe:animate-[walletFade_0.45s_ease-out_both]"
                            style={{ animationDelay: `${i * 45}ms` }}
                          >
                            <Link
                              href={`/${L}/wallet/${a}/`}
                              title={a}
                              class="flex items-center justify-between gap-2 rounded-xl border border-[#043234] bg-[#000D0E]/55 px-3 py-2.5 transition hover:border-[#04E6E6]/45 hover:bg-[#001014]/90"
                            >
                              <span class="min-w-0 truncate font-mono text-sm text-[#04E6E6]">
                                {truncateWalletAddr(a)}
                              </span>
                              <span class="shrink-0 text-[10px] font-medium text-slate-500">Resumen</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                      {v.interactBase.sentPreview.length > 8 ? (
                        <p class="mt-2 text-[11px] text-slate-500">
                          +{v.interactBase.sentPreview.length - 8} direcciones más en esta muestra (no listadas).
                        </p>
                      ) : null}
                    </>
                  ) : (
                    <p class="mt-3 text-xs text-slate-500">No hay direcciones de destino en la vista previa.</p>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section class="mb-6 rounded-2xl border border-[#043234]/90 bg-gradient-to-b from-[#0a1416] to-[#050a0c] p-5 shadow-lg shadow-black/35 motion-safe:animate-[walletFade_0.7s_ease-out_both]">
        <WalletActivityLineChart
          labels={baseAct?.buckets.map((b) => b.label) ?? []}
          values={baseAct?.buckets.map((b) => b.count) ?? []}
        />
        {baseAct?.note ? <p class="mt-2 text-[10px] text-slate-500">{baseAct.note}</p> : null}
        {!baseAct && v.txBase?.ok && !v.snapshotMissing ? (
          <p class="mt-2 text-sm text-slate-500">No hay fechas legibles en las transacciones de la muestra.</p>
        ) : null}
      </section>

      <section class="mb-6 rounded-2xl border border-[#043234]/90 bg-gradient-to-b from-[#001a1c]/95 to-[#050a0c] p-5 sm:p-6 shadow-lg shadow-black/25 motion-safe:animate-[walletFade_0.9s_ease-out_both]">
        <div class="mb-4 flex items-center justify-between gap-3">
          <h3 class="text-xs font-semibold uppercase tracking-wide text-slate-500">Distribución de cartera</h3>
          <span class="text-[10px] uppercase tracking-wide text-slate-600">Cadenas y activos</span>
        </div>
        <div class="grid gap-5 xl:grid-cols-2">
          <section class="rounded-2xl border border-[#043234]/80 bg-[#000D0E]/45 p-4">
            <h4 class="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Chain breakdown</h4>
            <div class="mt-4 flex flex-col items-stretch gap-5 sm:flex-row sm:items-center">
              <WalletDonutChart slices={chainSlices} ariaLabel="Distribución del patrimonio por cadena" />
              <ul class="flex min-w-0 flex-1 flex-col gap-2">
                {chainSlices.length === 0 ? (
                  <li class="text-sm text-slate-500">Sin desglose por cadena.</li>
                ) : (
                  chainSlices.map((s) => (
                    <li
                      key={s.label}
                      class="flex items-center gap-3 rounded-xl border border-[#043234]/70 bg-[#000D0E]/60 px-3 py-2.5 transition-all duration-300 hover:border-[#04E6E6]/35 hover:bg-[#001014]/80"
                    >
                      <span class="h-3 w-3 shrink-0 rounded-full shadow-sm" style={{ backgroundColor: s.color }} />
                      <span class="min-w-0 flex-1 truncate text-sm text-slate-200">{s.label}</span>
                      <span class="shrink-0 tabular-nums text-sm text-slate-300">${formatUsdBalance(s.value)}</span>
                      <span class="w-14 shrink-0 text-right text-xs text-slate-500">
                        {walletLegendPct(s.value, chainSliceTotal)}
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </section>
          <section class="rounded-2xl border border-[#043234]/80 bg-[#000D0E]/45 p-4">
            <h4 class="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Asset allocation</h4>
            <div class="mt-4 flex flex-col items-stretch gap-5 sm:flex-row sm:items-center">
              <WalletDonutChart slices={assetSlices} ariaLabel="Distribución por activo" />
              <ul class="flex min-w-0 flex-1 flex-col gap-2">
                {assetSlices.length === 0 ? (
                  <li class="text-sm text-slate-500">Sin tokens con valor en USD.</li>
                ) : (
                  assetSlices.map((s) => (
                    <li
                      key={s.label}
                      class="flex items-center gap-3 rounded-xl border border-[#043234]/70 bg-[#000D0E]/60 px-3 py-2.5 transition-all duration-300 hover:border-[#04E6E6]/35 hover:bg-[#001014]/80"
                    >
                      <span class="h-3 w-3 shrink-0 rounded-full shadow-sm" style={{ backgroundColor: s.color }} />
                      <span class="min-w-0 flex-1 truncate text-sm font-medium text-slate-100">{s.label}</span>
                      <span class="shrink-0 tabular-nums text-sm text-slate-300">${formatUsdBalance(s.value)}</span>
                      <span class="w-14 shrink-0 text-right text-xs text-slate-500">
                        {walletLegendPct(s.value, assetSliceTotal)}
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </section>
        </div>
      </section>

      <section class="mb-8 rounded-2xl border border-[#043234] bg-[#001a1c]/90 p-4 shadow-lg shadow-black/20 sm:p-5">
        <h2 class="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-500">PnL agregado</h2>
        <div class="grid gap-4 lg:grid-cols-2">
          <WalletPnlSnapshot
            chainLabel="Base"
            ok={!!v.pnlBase?.ok}
            data={v.pnlBase?.ok ? v.pnlBase.data : null}
            emptyMessage="No hay datos de PnL disponibles para esta red en este momento."
          />
          <WalletPnlSnapshot
            chainLabel="Ethereum"
            ok={!!v.pnlEth?.ok}
            data={v.pnlEth?.ok ? v.pnlEth.data : null}
            emptyMessage="No hay datos de PnL disponibles para esta red en este momento."
          />
        </div>
      </section>

      <div class="mb-4 flex flex-wrap gap-6 border-b border-[#043234]/70 pb-0">
        <button
          type="button"
          class={`relative pb-3 text-sm font-semibold transition-colors ${
            assetsTab.value === "tokens" ? "text-[#04E6E6]" : "text-slate-500 hover:text-slate-300"
          }`}
          onClick$={() => {
            assetsTab.value = "tokens";
          }}
        >
          Tokens ({tokenCountAll})
          {assetsTab.value === "tokens" ? (
            <span class="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-[#04E6E6] shadow-[0_0_12px_rgba(4,230,230,0.45)]" />
          ) : null}
        </button>
        <button
          type="button"
          class={`relative pb-3 text-sm font-semibold transition-colors ${
            assetsTab.value === "nfts" ? "text-[#04E6E6]" : "text-slate-500 hover:text-slate-300"
          }`}
          onClick$={() => {
            assetsTab.value = "nfts";
          }}
        >
          NFTs ({nfts.length})
          {assetsTab.value === "nfts" ? (
            <span class="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-[#04E6E6] shadow-[0_0_12px_rgba(4,230,230,0.45)]" />
          ) : null}
        </button>
        <button
          type="button"
          class={`relative pb-3 text-sm font-semibold transition-colors ${
            assetsTab.value === "defi" ? "text-[#04E6E6]" : "text-slate-500 hover:text-slate-300"
          }`}
          onClick$={() => {
            assetsTab.value = "defi";
          }}
        >
          DeFi ({defiTabCount})
          {assetsTab.value === "defi" ? (
            <span class="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-[#04E6E6] shadow-[0_0_12px_rgba(4,230,230,0.45)]" />
          ) : null}
        </button>
      </div>

      {assetsTab.value === "tokens" ? (
        <>
          <div class="mb-5 flex flex-wrap gap-2">
            {chainsForPills.map((cid) => (
              <button
                type="button"
                key={cid}
                class={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
                  tokenChainFilter.value === cid
                    ? "scale-[1.02] border border-[#04E6E6]/50 bg-[#043234]/90 text-[#04E6E6] shadow-lg shadow-[#04E6E6]/15"
                    : "border border-transparent bg-[#000D0E]/80 text-slate-300 ring-1 ring-[#043234] hover:bg-[#001014]/90 hover:ring-[#04E6E6]/25"
                }`}
                onClick$={() => {
                  tokenChainFilter.value = cid;
                  tokenPage.value = 1;
                }}
              >
                <span class={`h-2 w-2 shrink-0 rounded-full ${CHAIN_PILL_META[cid].dot}`} />
                {CHAIN_PILL_META[cid].label}
              </button>
            ))}
          </div>

          <div class="mb-6 grid gap-6 xl:grid-cols-12">
            <section class="rounded-2xl border border-[#043234]/90 bg-[#001a1c]/70 p-4 shadow-lg shadow-black/20 sm:p-5 xl:col-span-7">
              <div class="mb-4 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h2 class="text-sm font-semibold tracking-wide text-slate-100">Tokens ({tokRowCount})</h2>
                  <p class="mt-0.5 text-[11px] text-slate-500">
                    {tokOk && tokRowCount > 0
                      ? `${useCrossChain ? "Universal API · precio, 24h y % cartera cuando existan" : "Snapshot por cadena"}`
                      : "Balances ERC-20"}
                  </p>
                </div>
                <div class="flex items-center gap-2 text-[11px]">
                  <button
                    type="button"
                    class={`rounded-md border px-2 py-1 transition ${
                      tokenCompact.value
                        ? "border-[#04E6E6]/40 bg-[#043234] text-[#04E6E6]"
                        : "border-[#043234] bg-[#000D0E]/60 text-slate-400 hover:text-slate-200"
                    }`}
                    onClick$={() => {
                      tokenCompact.value = !tokenCompact.value;
                    }}
                  >
                    {tokenCompact.value ? "Vista compacta" : "Vista expandida"}
                  </button>
                </div>
              </div>
              {tokOk && tokRowsCross.length > 0 ? (
                <div class="overflow-x-auto">
                  <table class="w-full text-left text-xs">
                    <thead class="sticky top-0 z-[1] bg-[#001217]/95 backdrop-blur-sm">
                      <tr class="border-b border-[#043234]/60 text-[10px] uppercase tracking-wide text-slate-500">
                        <th class="py-2 pr-2 font-medium">Token</th>
                        {tokenChainFilter.value === "all" ? (
                          <th class="py-2 pr-2 font-medium">Red</th>
                        ) : null}
                        <th class="py-2 pr-2 font-medium">Balance</th>
                        <th class="py-2 pr-2 font-medium text-right">Precio</th>
                        <th class="py-2 pr-2 font-medium text-right">24h</th>
                        <th class="py-2 pr-2 font-medium text-right">% cartera</th>
                        <th class="py-2 font-medium text-right">USD</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tokenRowsVisible.map((t) => {
                        const change = t.usdPrice24hrPercentChange;
                        const changeCls =
                          change == null
                            ? "text-gray-500"
                            : change > 0
                              ? "text-emerald-300"
                              : change < 0
                                ? "text-rose-300"
                                : "text-gray-400";
                        const changeText =
                          change == null ? "—" : `${change > 0 ? "+" : ""}${change.toFixed(2)}%`;
                        return (
                          <tr
                            key={`${t.tokenAddress}-${t.chainId}`}
                            class={`border-b border-[#043234]/35 text-slate-300 transition-colors hover:bg-[#04E6E6]/[0.03] ${
                              tokenCompact.value ? "" : "align-top"
                            }`}
                          >
                            <td class={`${tokenCompact.value ? "py-1.5" : "py-2"} pr-2`}>
                              <div class="flex min-w-0 items-center gap-2">
                                <TokenLogoImg src={t.logo} symbol={t.symbol ?? "?"} size={28} />
                                <div class="min-w-0">
                                  <span class="font-semibold text-slate-100">
                                    {t.symbol ?? "?"}
                                    {t.nativeToken ? (
                                      <span class="ml-1.5 align-middle text-[8px] uppercase tracking-wide text-[#04E6E6]/90">
                                        native
                                      </span>
                                    ) : null}
                                  </span>
                                  <span class="block max-w-[180px] truncate text-[10px] text-slate-500">
                                    {t.name ?? ""}
                                  </span>
                                  <span class="mt-0.5 flex flex-wrap items-center gap-1">
                                    <EvmAddrLinks
                                      locale={L}
                                      moralisChain={t.chainId}
                                      address={t.tokenAddress}
                                      variant="token"
                                    />
                                    {t.verifiedContract ? (
                                      <span
                                        class="rounded border border-emerald-500/30 bg-emerald-500/10 px-1 py-0 text-[8px] uppercase text-emerald-300"
                                        title="Contrato verificado"
                                      >
                                        verified
                                      </span>
                                    ) : null}
                                    {t.securityScore != null ? (
                                      <span
                                        class={`rounded border px-1 py-0 text-[8px] tabular-nums ${
                                          t.securityScore >= 80
                                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                                            : t.securityScore >= 50
                                              ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
                                              : "border-rose-500/30 bg-rose-500/10 text-rose-200"
                                        }`}
                                        title="Security score"
                                      >
                                        {t.securityScore}
                                      </span>
                                    ) : null}
                                  </span>
                                </div>
                              </div>
                            </td>
                            {tokenChainFilter.value === "all" ? (
                              <td class={`${tokenCompact.value ? "py-1.5" : "py-2"} pr-2 text-[11px] text-slate-400 whitespace-nowrap`}>
                                {chainLabelFromChainId(t.chainId)}
                              </td>
                            ) : null}
                            <td class={`${tokenCompact.value ? "py-1.5" : "py-2"} pr-2 font-mono tabular-nums text-slate-400`}>{t.balance ?? "0"}</td>
                            <td class={`${tokenCompact.value ? "py-1.5" : "py-2"} pr-2 text-right tabular-nums text-slate-300`}>
                              {t.usdPrice != null ? `$${formatUsdBalance(t.usdPrice)}` : "—"}
                            </td>
                            <td class={`${tokenCompact.value ? "py-1.5" : "py-2"} pr-2 text-right tabular-nums ${changeCls}`}>{changeText}</td>
                            <td class={`${tokenCompact.value ? "py-1.5" : "py-2"} pr-2 text-right tabular-nums text-slate-400`}>
                              {t.portfolioPercentage != null ? `${t.portfolioPercentage.toFixed(2)}%` : "—"}
                            </td>
                            <td class={`${tokenCompact.value ? "py-1.5" : "py-2"} text-right tabular-nums text-slate-50`}>
                              ${formatUsdBalance(t.usdValue ?? 0)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : null}
              {tokOk && tokRowsCross.length > 0 ? (
                <div class="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                  <span>
                    Mostrando {(tokenCurrentPage - 1) * tokenPageSize + 1}-
                    {Math.min(tokenCurrentPage * tokenPageSize, tokRowsCross.length)} de {tokRowsCross.length}
                  </span>
                  <div class="flex items-center gap-1">
                    <button
                      type="button"
                      class="rounded border border-[#043234] bg-[#000D0E]/60 px-2 py-1 disabled:opacity-40"
                      disabled={tokenCurrentPage <= 1}
                      onClick$={() => {
                        tokenPage.value = Math.max(1, tokenCurrentPage - 1);
                      }}
                    >
                      Anterior
                    </button>
                    <span class="px-1 tabular-nums">
                      {tokenCurrentPage}/{tokenTotalPages}
                    </span>
                    <button
                      type="button"
                      class="rounded border border-[#043234] bg-[#000D0E]/60 px-2 py-1 disabled:opacity-40"
                      disabled={tokenCurrentPage >= tokenTotalPages}
                      onClick$={() => {
                        tokenPage.value = Math.min(tokenTotalPages, tokenCurrentPage + 1);
                      }}
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              ) : tokOk ? (
                <WalletEmptyState
                  title={`Sin tokens${tokenChainFilter.value === "all" ? "" : ` en ${CHAIN_PILL_META[tokenChainFilter.value].label}`}`}
                  hint="Probá “Todas las cadenas” o otra red."
                />
              ) : tokErr ? (
                <WalletEmptyState
                  title="No se pudieron cargar los tokens"
                  hint="Vuelve a intentarlo en unos minutos. Si el problema continúa, prueba recargar la página."
                  tone="warn"
                />
              ) : (
                <WalletEmptyState title="Sin datos de tokens" hint="Aún no se han registrado balances." />
              )}
            </section>

            <section class="rounded-2xl border border-[#043234]/90 bg-[#001a1c]/70 p-4 shadow-lg shadow-black/20 sm:p-5 xl:col-span-5">
              <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 class="text-sm font-semibold tracking-wide text-slate-100">Transacciones recientes</h2>
                  <p class="mt-0.5 text-[11px] text-slate-500">
                    {txOk && txRows.length
                      ? `${txRows.length} en ${txTab.value === "base" ? "Base" : "Ethereum"}`
                      : "Más recientes primero"}
                  </p>
                </div>
                <div class="flex overflow-hidden rounded-full border border-[#043234] bg-[#000D0E]/60 text-xs">
                  <button
                    type="button"
                    class={`px-3 py-1.5 ${txTab.value === "base" ? "bg-[#043234] text-[#04E6E6] ring-1 ring-[#04E6E6]/35" : "text-slate-400 hover:text-slate-200"}`}
                    onClick$={() => {
                      txTab.value = "base";
                    }}
                  >
                    Base
                  </button>
                  <button
                    type="button"
                    class={`px-3 py-1.5 ${txTab.value === "eth" ? "bg-[#043234] text-[#04E6E6] ring-1 ring-[#04E6E6]/35" : "text-slate-400 hover:text-slate-200"}`}
                    onClick$={() => {
                      txTab.value = "eth";
                    }}
                  >
                    Ethereum
                  </button>
                </div>
              </div>
              {txOk && txRows.length > 0 ? (
                <div class="overflow-x-auto">
                  <table class="w-full min-w-[520px] border-collapse text-left text-[11px] text-slate-200">
                    <thead class="sticky top-0 z-[1] bg-[#001217]/95 backdrop-blur-sm">
                      <tr class="border-b border-[#043234]/60 text-[10px] uppercase tracking-wide text-slate-500">
                        <th class="px-1 py-2 font-medium">Hash</th>
                        <th class="px-1 py-2 font-medium">Fecha</th>
                        <th class="px-1 py-2 font-medium text-right">Monto</th>
                        <th class="px-1 py-2 font-medium">Desde</th>
                        <th class="px-1 py-2 font-medium">Hacia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {txRows.map((tx: Record<string, unknown>) => {
                        const h = String(tx.hash ?? "");
                        return (
                          <tr key={h} class="border-b border-[#043234]/30 transition-colors hover:bg-[#04E6E6]/[0.03]">
                            <td class="whitespace-nowrap px-1 py-1.5 align-top">
                              <TxHashLink locale={L} moralisChain={txTab.value} hash={h} mode="hash10" />
                            </td>
                            <td class="whitespace-nowrap px-1 py-1.5 align-top text-slate-500">
                              {String(tx.block_timestamp ?? "").replace("T", " ").slice(0, 19)}
                            </td>
                            <td class="whitespace-nowrap px-1 py-1.5 align-top text-right tabular-nums text-slate-300">
                              {formatTxNativeAmount(tx, txTab.value)}
                            </td>
                            <td class="px-1 py-1.5 align-top">
                              <EvmAddrLinks
                                locale={L}
                                moralisChain={txTab.value}
                                address={tx.from_address ?? tx.from}
                              />
                            </td>
                            <td class="px-1 py-1.5 align-top">
                              <EvmAddrLinks
                                locale={L}
                                moralisChain={txTab.value}
                                address={tx.to_address ?? tx.to}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : txOk ? (
                <WalletEmptyState
                  title={`Sin transacciones recientes en ${txTab.value === "base" ? "Base" : "Ethereum"}`}
                  hint="No detectamos actividad reciente en este momento."
                />
              ) : txErr ? (
                <WalletEmptyState
                  title="No se pudieron cargar las transacciones"
                  hint="Vuelve a intentarlo en unos minutos. Si el problema continúa, prueba recargar la página."
                  tone="warn"
                />
              ) : (
                <WalletEmptyState
                  title={`Sin transacciones en ${txTab.value === "base" ? "Base" : "Ethereum"}`}
                  hint="Aún no se han registrado movimientos."
                />
              )}
            </section>
          </div>
        </>
      ) : null}

      {assetsTab.value === "nfts" ? (
      <div class="mb-6">
        {nftMcKeys.length > 1 ? (
          <div class="mb-3 flex flex-wrap gap-2">
            {nftMcKeys.map((ch) => (
              <button
                type="button"
                key={ch}
                class={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  nftMcChain.value === ch
                    ? "border-[#04E6E6]/50 bg-[#043234] text-[#04E6E6] ring-1 ring-inset ring-[#04E6E6]/25"
                    : "border-[#043234] bg-[#000D0E]/60 text-slate-400 hover:border-[#04E6E6]/25 hover:text-slate-200"
                }`}
                onClick$={() => {
                  nftMcChain.value = ch;
                }}
              >
                {moralisNftChainLabel(ch)}
              </button>
            ))}
          </div>
        ) : null}
        <p class="mb-4 text-[11px] text-slate-500">
          Vista previa NFT por cadena (Moralis). Datos del sync diario; la lista de redes viene de{" "}
          <span class="font-mono text-[10px] text-slate-400">MORALIS_SYNC_WALLET_NFT_CHAINS</span> (por defecto
          varias mainnets).
        </p>
        <div class="grid gap-6 xl:grid-cols-12">
      <section class="rounded-2xl border border-[#043234] bg-[#001a1c]/90 p-4 shadow-lg shadow-black/20 sm:p-5 xl:col-span-5">
        <h2 class="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Ítems NFT · {moralisNftChainLabel(nftMcChain.value)}
        </h2>
        {walletNftSnap?.ok && nfts.length > 0 ? (
          <div class="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {nfts.map((n: Record<string, unknown>) => {
              const img = nftImage(n);
              const name = String((n.normalized_metadata as { name?: string })?.name ?? n.name ?? n.symbol ?? "NFT");
              const ca = String(n.token_address ?? "").toLowerCase();
              const tid = String(n.token_id ?? "");
              const chainQ = encodeURIComponent(nftMcChain.value);
              const nftDash =
                /^0x[a-f0-9]{40}$/.test(ca) && tid
                  ? `/${L}/nfts/${ca}/${encodeURIComponent(tid)}/?chain=${chainQ}`
                  : null;
              const inner = (
                <>
                  {img ? (
                    <img src={img} alt="" class="w-full aspect-square object-cover" width={120} height={120} loading="lazy" />
                  ) : (
                    <div class="aspect-square bg-[#043234]/30 flex items-center justify-center text-[10px] text-gray-500 px-1 text-center">
                      {String(n.symbol ?? "?")}
                    </div>
                  )}
                  <p class="truncate px-1 py-1 text-[10px] text-slate-400" title={name}>
                    {name}
                  </p>
                </>
              );
              return (
                <div key={`${String(n.token_address)}-${String(n.token_id)}`} class="rounded-lg overflow-hidden border border-[#043234] bg-black/20">
                  {nftDash ? (
                    <Link href={nftDash} class="block hover:opacity-90 transition-opacity">
                      {inner}
                    </Link>
                  ) : (
                    inner
                  )}
                </div>
              );
            })}
          </div>
        ) : walletNftSnap?.ok ? (
          <WalletEmptyState
            title={`Sin NFTs en ${moralisNftChainLabel(nftMcChain.value)}`}
            hint="No hay ítems en la muestra de esta cadena del último sync."
          />
        ) : nftsErr ? (
          <WalletEmptyState
            title="No se pudieron cargar los NFTs"
            hint="Vuelve a intentarlo en unos minutos. Si el problema continúa, prueba recargar la página."
            tone="warn"
          />
        ) : (
          <WalletEmptyState
            title="Sin NFTs registrados"
            hint="Aún no hay datos de NFTs para esta wallet."
          />
        )}
      </section>

      <section class="rounded-2xl border border-[#043234] bg-[#001a1c]/90 p-4 shadow-lg shadow-black/20 sm:p-5 xl:col-span-7">
        <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 class="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Colecciones NFT · {moralisNftChainLabel(nftMcChain.value)}
            </h2>
            <p class="mt-1 text-[11px] text-slate-500">
              Agregado por contrato · mismo cadena que la rejilla izquierda · sync diario.
            </p>
          </div>
        </div>
        {(() => {
          const colSnap = nftCollectionsResultForChain(v, nftMcChain.value);
          const colPayload =
            colSnap?.ok && colSnap.data != null && typeof colSnap.data === "object"
              ? (colSnap.data as Record<string, unknown>)
              : null;
          const colRows = Array.isArray(colPayload?.result)
            ? (colPayload!.result as Record<string, unknown>[])
            : [];
          const colErr =
            colSnap !== undefined && !colSnap.ok ? cleanErrorText(colSnap.error) : "";
          const colStale =
            colSnap === undefined && !v.snapshotMissing
              ? "Los snapshots antiguos no traían este bloque; tras el próximo sync verás las colecciones aquí."
              : "";

          if (colErr) {
            return <p class="text-sm text-amber-400">{colErr}</p>;
          }
          if (colStale) {
            return <p class="text-sm text-gray-500">{colStale}</p>;
          }
          if (colRows.length > 0) {
            return (
              <ul class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {colRows.map((c) => {
                  const ca = String(c.token_address ?? "").toLowerCase();
                  const name = String(c.name ?? c.symbol ?? "Collection");
                  const sym = String(c.symbol ?? "");
                  const logo = typeof c.collection_logo === "string" ? c.collection_logo : "";
                  const count = typeof c.count === "number" ? c.count : null;
                  const floorUsd = c.floor_price_usd != null ? String(c.floor_price_usd) : "";
                  const chainQ = nftMcChain.value;
                  const href =
                    /^0x[a-f0-9]{40}$/.test(ca)
                      ? `/${L}/nfts/${ca}/?chain=${encodeURIComponent(chainQ)}`
                      : null;
                  return (
                    <li
                      key={`${chainQ}-${ca}`}
                      class="flex gap-3 rounded-lg border border-[#043234] bg-[#000D0E]/60 p-3 text-xs"
                    >
                      {logo ? (
                        <img src={logo} alt="" class="h-14 w-14 shrink-0 rounded-lg object-cover" width={56} height={56} loading="lazy" />
                      ) : (
                        <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-[#043234]/40 text-[10px] text-gray-500">
                          NFT
                        </div>
                      )}
                      <div class="min-w-0 flex-1">
                        <p class="font-medium text-gray-200 truncate" title={name}>
                          {name}
                        </p>
                        {sym ? <p class="text-[10px] text-gray-500 truncate">{sym}</p> : null}
                        <div class="mt-0.5">
                          <EvmAddrLinks locale={L} moralisChain={nftMcChain.value} address={ca} variant="nft" />
                        </div>
                        <div class="mt-1 flex flex-wrap gap-2 text-[10px] text-gray-400">
                          {count != null ? <span>{count} en wallet</span> : null}
                          {floorUsd ? <span>Floor ~${floorUsd} USD</span> : null}
                        </div>
                        {href ? (
                          <div class="mt-2">
                            <Link href={href} class="inline-block text-[#04E6E6] hover:underline">
                              Ver colección →
                            </Link>
                          </div>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            );
          }
          return (
            <p class="text-sm text-gray-500">
              Sin colecciones con saldo en {moralisNftChainLabel(nftMcChain.value)} según el último sync.
            </p>
          );
        })()}
      </section>
        </div>
      </div>
      ) : null}

      {assetsTab.value === "defi" ? (
      <section class="mb-6 rounded-2xl border border-[#043234] bg-[#001a1c]/90 p-4 shadow-lg shadow-black/20 sm:p-5">
        <div class="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 class="text-xs font-semibold uppercase tracking-wide text-slate-500">DeFi · multi-chain</h2>
            <p class="mt-1 text-[11px] text-slate-500">
              Lending, liquidez, staking y rewards en Ethereum y Base. Datos del último análisis en caché.
            </p>
          </div>
          {defiSummaryResult ? (
            <span class="rounded-full border border-[#04E6E6]/30 bg-[#04E6E6]/10 px-2.5 py-0.5 text-[10px] font-medium text-[#04E6E6]">
              Universal API v1
            </span>
          ) : null}
        </div>

        {dash.value.hasPro ? (
          defiSummaryError && !defiSummaryResult ? (
            <p class="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
              No se pudo cargar el resumen DeFi: {defiSummaryError}
            </p>
          ) : !defiSummaryResult && !defiPositionsList.length ? (
            <p class="text-xs text-gray-500">
              Sin posiciones DeFi detectadas para esta wallet con los datos disponibles.
            </p>
          ) : (
            <div class="space-y-5">
              <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <DefiKpi
                  label="Total DeFi"
                  value={defiTotalUsd != null ? `$${formatUsdBalance(defiTotalUsd)}` : "—"}
                  hint="USD agregado en todos los protocolos"
                />
                <DefiKpi
                  label="Recompensas pendientes"
                  value={defiUnclaimedUsd != null ? `$${formatUsdBalance(defiUnclaimedUsd)}` : "—"}
                  hint="Sin reclamar (claimable)"
                  accent={defiUnclaimedUsd && defiUnclaimedUsd > 0 ? "emerald" : "neutral"}
                />
                <DefiKpi
                  label="Protocolos activos"
                  value={String(defiActiveProtocols)}
                  hint="Número de protocolos con saldo"
                />
                <DefiKpi
                  label="Posiciones"
                  value={String(defiTotalPositions || defiPositionsList.length)}
                  hint="Total de posiciones detectadas"
                />
              </div>

              {defiProtocols.length > 0 ? (
                <div>
                  <div class="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                    <h3 class="text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Protocolos
                    </h3>
                    <p class="text-[10px] text-gray-500">
                      Pulsa <span class="text-gray-300">Detalle</span> para cargar las posiciones específicas (Universal API).
                    </p>
                  </div>
                  <div class="overflow-x-auto">
                    <table class="w-full min-w-[680px] border-collapse text-left text-[12px] text-slate-200">
                      <thead>
                        <tr class="border-b border-[#043234] text-[10px] uppercase tracking-wide text-gray-500">
                          <th class="px-2 py-2 font-medium">Protocolo</th>
                          <th class="px-2 py-2 font-medium">Red</th>
                          <th class="px-2 py-2 font-medium text-right">Posiciones</th>
                          <th class="px-2 py-2 font-medium text-right">USD</th>
                          <th class="px-2 py-2 font-medium text-right">Sin reclamar</th>
                          <th class="px-2 py-2 font-medium text-right">Detalle</th>
                        </tr>
                      </thead>
                      <tbody>
                        {defiProtocols.map((p, idx) => {
                          const protocolId = String(p.protocolId ?? p.protocolName ?? `proto-${idx}`);
                          const rowKey = `${protocolId}-${String(p.chainId ?? "")}-${idx}`;
                          const name = String(p.protocolName ?? p.protocolId ?? "Protocolo");
                          const logo = typeof p.protocolLogo === "string" ? (p.protocolLogo as string) : "";
                          const url = typeof p.protocolUrl === "string" ? (p.protocolUrl as string) : "";
                          const usd = pickUsd(p.totalUsd);
                          const unclaimed = pickUsd(p.totalUnclaimedUsd);
                          const positions = typeof p.positionCount === "number" ? (p.positionCount as number) : 0;
                          const isOpen = protoOpenId.value === protocolId;
                          const isLoading = isOpen && protoLoading.value;
                          return (
                            <>
                              <tr key={rowKey} class="border-b border-[#043234]/40">
                                <td class="px-2 py-2">
                                  <div class="flex items-center gap-2 min-w-0">
                                    {logo ? (
                                      <img src={logo} alt="" class="h-6 w-6 rounded-md object-cover" width={24} height={24} loading="lazy" />
                                    ) : (
                                      <div class="flex h-6 w-6 items-center justify-center rounded-md bg-[#043234]/40 text-[9px] text-gray-500">
                                        {name.slice(0, 2).toUpperCase()}
                                      </div>
                                    )}
                                    <div class="min-w-0">
                                      {url ? (
                                        <a
                                          href={url}
                                          target="_blank"
                                          rel="noreferrer"
                                          class="truncate font-medium text-slate-100 hover:text-[#04E6E6]"
                                        >
                                          {name}
                                        </a>
                                      ) : (
                                        <span class="truncate font-medium text-slate-100">{name}</span>
                                      )}
                                      <span class="block truncate text-[10px] text-gray-500">{protocolId}</span>
                                    </div>
                                  </div>
                                </td>
                                <td class="px-2 py-2 text-[11px] text-gray-400">
                                  {chainLabelFromChainId(p.chainId)}
                                </td>
                                <td class="px-2 py-2 text-right tabular-nums text-gray-300">
                                  {positions}
                                </td>
                                <td class="px-2 py-2 text-right tabular-nums text-slate-100">
                                  {usd != null ? `$${formatUsdBalance(usd)}` : "—"}
                                </td>
                                <td
                                  class={`px-2 py-2 text-right tabular-nums ${unclaimed && unclaimed > 0 ? "text-emerald-300" : "text-gray-500"}`}
                                >
                                  {unclaimed != null ? `$${formatUsdBalance(unclaimed)}` : "—"}
                                </td>
                                <td class="px-2 py-2 text-right">
                                  <button
                                    type="button"
                                    disabled={isLoading}
                                    class={`rounded-md border px-2 py-1 text-[10px] font-medium transition disabled:opacity-50 ${
                                      isOpen
                                        ? "border-[#04E6E6]/50 bg-[#04E6E6]/15 text-[#04E6E6]"
                                        : "border-[#043234] bg-[#000D0E]/50 text-gray-300 hover:border-[#04E6E6]/30 hover:text-[#04E6E6]"
                                    }`}
                                    onClick$={() => loadProtocolPositions(protocolId, p.chainId)}
                                  >
                                    {isLoading
                                      ? "Cargando…"
                                      : isOpen
                                        ? "Cerrar"
                                        : "Detalle"}
                                  </button>
                                </td>
                              </tr>
                              {isOpen ? (
                                <tr key={`${rowKey}-detail`} class="border-b border-[#043234]/60 bg-[#000d0e]/40">
                                  <td colSpan={6} class="px-3 py-3">
                                    {protoErr.value ? (
                                      <p class="text-[11px] text-amber-300">{protoErr.value}</p>
                                    ) : protoLoading.value ? (
                                      <p class="text-[11px] text-gray-400">Cargando posiciones de {name}…</p>
                                    ) : protoPayload.value ? (
                                      <DefiProtocolDetail payload={protoPayload.value} />
                                    ) : (
                                      <p class="text-[11px] text-gray-500">Sin datos.</p>
                                    )}
                                  </td>
                                </tr>
                              ) : null}
                            </>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}

              {defiPositionsList.length > 0 ? (
                <div>
                  <div class="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                    <h3 class="text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Posiciones detectadas
                    </h3>
                    <p class="text-[10px] text-gray-500">
                      Mostrando {Math.min(defiPositionsList.length, 12)} de {defiPositionsList.length}
                    </p>
                  </div>
                  <ul class="grid gap-2 sm:grid-cols-2">
                    {defiPositionsList.slice(0, 12).map((row, idx) => {
                      const protocolName = String(row.protocolName ?? row.protocolId ?? "Protocolo");
                      const protocolUrl = typeof row.protocolUrl === "string" ? (row.protocolUrl as string) : "";
                      const protocolLogo = typeof row.protocolLogo === "string" ? (row.protocolLogo as string) : "";
                      const chain = chainLabelFromChainId(row.chainId);
                      const pos = (row.position ?? {}) as Record<string, unknown>;
                      const label = String(pos.label ?? "other");
                      const balanceUsd = pickUsd(pos.balanceUsd);
                      const unclaimedUsd = pickUsd(pos.unclaimedUsd);
                      const tokens = Array.isArray(pos.tokens) ? (pos.tokens as Record<string, unknown>[]) : [];
                      return (
                        <li
                          key={`${protocolName}-${idx}`}
                          class="rounded-lg border border-[#043234] bg-[#000D0E]/60 p-3 text-[11px]"
                        >
                          <div class="flex items-center gap-2 mb-1.5">
                            {protocolLogo ? (
                              <img src={protocolLogo} alt="" class="h-5 w-5 rounded object-cover" width={20} height={20} loading="lazy" />
                            ) : null}
                            {protocolUrl ? (
                              <a href={protocolUrl} target="_blank" rel="noreferrer" class="truncate font-semibold text-slate-100 hover:text-[#04E6E6]">
                                {protocolName}
                              </a>
                            ) : (
                              <span class="truncate font-semibold text-slate-100">{protocolName}</span>
                            )}
                            <span class="ml-auto inline-flex items-center rounded-full border border-[#043234] bg-[#001a1c] px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-gray-400">
                              {label}
                            </span>
                            <span class="rounded-full bg-[#043234]/50 px-1.5 py-0.5 text-[9px] text-gray-400">
                              {chain}
                            </span>
                          </div>
                          <div class="flex flex-wrap gap-x-4 gap-y-0.5 text-gray-300 mb-1">
                            <span>
                              <span class="text-gray-500">Saldo:</span>{" "}
                              <span class="tabular-nums">
                                {balanceUsd != null ? `$${formatUsdBalance(balanceUsd)}` : "—"}
                              </span>
                            </span>
                            {unclaimedUsd && unclaimedUsd > 0 ? (
                              <span>
                                <span class="text-gray-500">Sin reclamar:</span>{" "}
                                <span class="tabular-nums text-emerald-300">
                                  ${formatUsdBalance(unclaimedUsd)}
                                </span>
                              </span>
                            ) : null}
                          </div>
                          {tokens.length > 0 ? (
                            <div class="mt-1 flex flex-wrap gap-1">
                              {tokens.slice(0, 4).map((tk, i) => {
                                const sym = String(tk.symbol ?? tk.name ?? "?");
                                const tt = String(tk.tokenType ?? "");
                                const cls =
                                  tt === "borrowed"
                                    ? "border-rose-500/30 bg-rose-500/10 text-rose-200"
                                    : tt === "reward"
                                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
                                      : tt === "lp"
                                        ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
                                        : "border-[#04E6E6]/25 bg-[#04E6E6]/10 text-[#04E6E6]";
                                return (
                                  <span
                                    key={`${sym}-${i}`}
                                    class={`inline-flex items-center rounded border px-1.5 py-0.5 text-[9px] uppercase ${cls}`}
                                    title={tt || undefined}
                                  >
                                    {sym}
                                  </span>
                                );
                              })}
                              {tokens.length > 4 ? (
                                <span class="rounded border border-[#043234] bg-[#001a1c] px-1.5 py-0.5 text-[9px] text-gray-500">
                                  +{tokens.length - 4}
                                </span>
                              ) : null}
                            </div>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}

              {defiPositionsError ? (
                <p class="text-[11px] text-amber-300/80">
                  Error cargando posiciones detalladas: {defiPositionsError}
                </p>
              ) : null}
            </div>
          )
        ) : (
          <div class="rounded-xl border border-amber-500/35 bg-gradient-to-br from-amber-950/40 to-[#001a1c] p-4 sm:p-5">
            <p class="text-sm font-medium text-amber-100/95">
              Plan <span class="text-[#04E6E6]">Pro</span> requerido para ver DeFi avanzado.
            </p>
            <p class="mt-2 text-[12px] leading-relaxed text-gray-400">
              Con Pro desbloqueas <strong class="text-gray-300">resumen DeFi multi-chain</strong> (lending, liquidez,
              staking, rewards) en Ethereum y Base, con datos que se actualizan de forma regular.
            </p>
            <div class="mt-4 flex flex-wrap gap-2">
              <Link
                href={`/${L}/home/`}
                class="inline-flex items-center rounded-lg bg-[#04E6E6]/20 px-4 py-2 text-xs font-semibold text-[#04E6E6] ring-1 ring-[#04E6E6]/35 hover:bg-[#04E6E6]/30"
              >
                Ver planes Pro →
              </Link>
              <Link
                href={`/${L}/profile/`}
                class="inline-flex items-center rounded-lg border border-[#043234] bg-[#000D0E]/80 px-4 py-2 text-xs font-medium text-gray-300 hover:border-[#04E6E6]/30"
              >
                Perfil de cuenta
              </Link>
            </div>
          </div>
        )}
      </section>
      ) : null}

      <p class="mt-10 border-t border-[#043234]/50 pt-4 text-center text-[11px] text-slate-600">
        La información se actualiza de forma periódica.
      </p>
    </div>
  );
});

type WalletEmptyStateProps = {
  title: string;
  hint?: string;
  tone?: "neutral" | "warn";
};

/** Friendly empty-state used everywhere we don't want to surface upstream errors. */
const WalletEmptyState = component$<WalletEmptyStateProps>((props) => {
  const tone = props.tone === "warn" ? "warn" : "neutral";
  const containerCls =
    tone === "warn"
      ? "border-amber-500/25 bg-amber-500/5"
      : "border-[#043234] bg-[#000D0E]/40";
  const titleCls = tone === "warn" ? "text-amber-100/95" : "text-gray-300";
  return (
    <div class={`rounded-lg border ${containerCls} px-4 py-6 text-center`}>
      <p class={`text-sm font-medium ${titleCls}`}>{props.title}</p>
      {props.hint ? <p class="mt-1.5 text-[11px] text-gray-500">{props.hint}</p> : null}
    </div>
  );
});

type DefiProtocolDetailProps = {
  payload: Record<string, unknown>;
};

/**
 * Renders the result of `GET /v1/wallets/:a/defi/:protocol/positions` (Universal API v1).
 * Shows protocol totals, per-position health factor (when lending), and tokens broken down
 * by `supplied / borrowed / reward / lp`.
 */
const DefiProtocolDetail = component$<DefiProtocolDetailProps>((props) => {
  const result = (props.payload?.result ?? null) as Record<string, unknown> | null;
  const protocolName = String(result?.protocolName ?? result?.protocolId ?? "Protocolo");
  const chain = chainLabelFromChainId(result?.chainId);
  const totalUsd = pickUsd(result?.totalUsd);
  const totalUnclaimedUsd = pickUsd(result?.totalUnclaimedUsd);
  const positions = Array.isArray(result?.positions)
    ? (result.positions as Record<string, unknown>[])
    : [];

  return (
    <div class="space-y-3">
      <div class="flex flex-wrap items-baseline gap-3 text-[11px] text-gray-400">
        <span class="font-semibold text-slate-100">{protocolName}</span>
        <span class="rounded-full bg-[#043234]/60 px-2 py-0.5 text-[10px] text-gray-300">{chain}</span>
        {totalUsd != null ? (
          <span>
            <span class="text-gray-500">Total:</span>{" "}
            <span class="tabular-nums text-slate-100">${formatUsdBalance(totalUsd)}</span>
          </span>
        ) : null}
        {totalUnclaimedUsd != null && totalUnclaimedUsd > 0 ? (
          <span>
            <span class="text-gray-500">Sin reclamar:</span>{" "}
            <span class="tabular-nums text-emerald-300">${formatUsdBalance(totalUnclaimedUsd)}</span>
          </span>
        ) : null}
      </div>

      {positions.length === 0 ? (
        <p class="text-[11px] text-gray-500">No hay posiciones detectadas para este protocolo.</p>
      ) : (
        <ul class="grid gap-2 sm:grid-cols-2">
          {positions.map((pos, i) => {
            const label = String(pos.label ?? "other");
            const balanceUsd = pickUsd(pos.balanceUsd);
            const unclaimedUsd = pickUsd(pos.unclaimedUsd);
            const tokens = Array.isArray(pos.tokens) ? (pos.tokens as Record<string, unknown>[]) : [];
            const details = (pos.details ?? null) as Record<string, unknown> | null;
            const isDebt = Boolean(details?.isDebt);
            const lending = (details?.lending ?? null) as Record<string, unknown> | null;
            const liquidity = (details?.liquidity ?? null) as Record<string, unknown> | null;
            const healthRaw = lending?.healthFactor;
            const health =
              typeof healthRaw === "number" && Number.isFinite(healthRaw)
                ? healthRaw
                : typeof healthRaw === "string" && Number.isFinite(Number(healthRaw))
                  ? Number(healthRaw)
                  : null;
            const healthCls =
              health == null
                ? "text-gray-400"
                : health < 1.1
                  ? "text-rose-300"
                  : health < 1.5
                    ? "text-amber-300"
                    : "text-emerald-300";
            const supplied = tokens.filter((t) => String(t.tokenType) === "supplied");
            const borrowed = tokens.filter((t) => String(t.tokenType) === "borrowed");
            const rewards = tokens.filter((t) => String(t.tokenType) === "reward");
            const lp = tokens.filter((t) => String(t.tokenType) === "lp");

            return (
              <li
                key={`pos-${i}`}
                class="rounded-lg border border-[#043234] bg-[#001a1c]/80 p-3 text-[11px]"
              >
                <div class="mb-2 flex flex-wrap items-center gap-1.5">
                  <span class="rounded-full border border-[#04E6E6]/30 bg-[#04E6E6]/10 px-2 py-0.5 text-[9px] uppercase text-[#04E6E6]">
                    {label}
                  </span>
                  {isDebt ? (
                    <span class="rounded-full border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[9px] uppercase text-rose-200">
                      Debt
                    </span>
                  ) : null}
                  <span class="ml-auto tabular-nums text-slate-100">
                    {balanceUsd != null ? `$${formatUsdBalance(balanceUsd)}` : "—"}
                  </span>
                </div>

                {health != null ? (
                  <p class="mb-1.5 text-[10px] text-gray-500">
                    Health factor: <span class={`tabular-nums font-semibold ${healthCls}`}>{health.toFixed(2)}</span>
                    {health < 1.1 ? <span class="ml-2 text-rose-300">⚠ Riesgo de liquidación</span> : null}
                  </p>
                ) : null}

                {liquidity?.poolAddress ? (
                  <p class="mb-1.5 break-all font-mono text-[9px] text-gray-500">
                    Pool: {String(liquidity.poolAddress)}
                  </p>
                ) : null}

                {unclaimedUsd != null && unclaimedUsd > 0 ? (
                  <p class="mb-1.5 text-[10px] text-emerald-300">
                    Recompensas sin reclamar: ${formatUsdBalance(unclaimedUsd)}
                  </p>
                ) : null}

                {supplied.length > 0 ? (
                  <DefiTokenList title="Suministrado" tone="cyan" tokens={supplied} />
                ) : null}
                {borrowed.length > 0 ? (
                  <DefiTokenList title="Tomado prestado" tone="rose" tokens={borrowed} />
                ) : null}
                {lp.length > 0 ? (
                  <DefiTokenList title="LP" tone="amber" tokens={lp} />
                ) : null}
                {rewards.length > 0 ? (
                  <DefiTokenList title="Recompensas" tone="emerald" tokens={rewards} />
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
});

type DefiTokenListProps = {
  title: string;
  tone: "cyan" | "rose" | "amber" | "emerald";
  tokens: Record<string, unknown>[];
};

const DefiTokenList = component$<DefiTokenListProps>((props) => {
  const toneCls =
    props.tone === "rose"
      ? "text-rose-200"
      : props.tone === "amber"
        ? "text-amber-200"
        : props.tone === "emerald"
          ? "text-emerald-200"
          : "text-[#04E6E6]";
  return (
    <div class="mt-1.5">
      <p class={`text-[9px] uppercase tracking-wide ${toneCls}`}>{props.title}</p>
      <ul class="mt-1 space-y-1">
        {props.tokens.map((tk, i) => {
          const sym = String(tk.symbol ?? tk.name ?? "?");
          const balance = String(tk.balanceFormatted ?? tk.balance ?? "");
          const usd = pickUsd(tk.usdValue);
          return (
            <li key={`${sym}-${i}`} class="flex items-center justify-between gap-2 text-gray-300">
              <span class="truncate">
                <span class="font-semibold text-slate-100">{sym}</span>
                {balance ? <span class="ml-2 text-gray-500 tabular-nums">{balance}</span> : null}
              </span>
              <span class="tabular-nums text-gray-300">
                {usd != null ? `$${formatUsdBalance(usd)}` : "—"}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
});

type DefiKpiProps = {
  label: string;
  value: string;
  hint?: string;
  accent?: "neutral" | "emerald";
};

const DefiKpi = component$<DefiKpiProps>((props) => {
  const accentCls =
    props.accent === "emerald"
      ? "border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-[#001a1c]"
      : "border-[#043234] bg-[#000D0E]/60";
  const valueCls = props.accent === "emerald" ? "text-emerald-200" : "text-slate-100";
  return (
    <div class={`rounded-xl border ${accentCls} p-3.5`}>
      <p class="text-[10px] uppercase tracking-wide text-gray-500">{props.label}</p>
      <p class={`mt-1 text-xl font-semibold tabular-nums ${valueCls}`}>{props.value}</p>
      {props.hint ? <p class="mt-1 text-[10px] text-gray-500">{props.hint}</p> : null}
    </div>
  );
});
