import { component$, useSignal, $ } from "@builder.io/qwik";
import { Link, routeLoader$, useLocation } from "@builder.io/qwik-city";
import { LuCopy, LuExternalLink } from "@qwikest/icons/lucide";
import { useDashboardAuth } from "../../../layout";
import { getWalletSnapshotJson } from "~/server/crypto-ghost/api-snapshot-sync";
import { isEvmAddress } from "~/server/crypto-ghost/market-queries";
import { TokenLogoImg } from "~/components/crypto-dashboard/token-logo";
import { WalletPnlSnapshot } from "~/components/crypto-dashboard/wallet-pnl-snapshot";
import { formatUsdBalance } from "~/utils/format-market";
import {
  baseActivityFromTransactions,
  crossChainTokenRowsForChain,
  erc20LogoUrl,
  interactionStats,
  nftImage,
  nftItemsFromMoralis,
  tokenRowsFromMoralis,
  txRowsFromMoralis,
  walletBaseActivityForUi,
} from "~/server/crypto-ghost/wallet-snapshot";
import type { CrossChainTokenRow } from "~/server/crypto-ghost/wallet-snapshot";
import { EvmAddrLinks, TxHashLink } from "~/components/crypto-dashboard/evm-dash-links";

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
  // Upstream-not-found / HTML pages → treat as "no data" silently.
  if (
    lower.startsWith("<!doctype") ||
    lower.startsWith("<html") ||
    lower.includes("cannot get ") ||
    lower.includes("404 not found") ||
    lower.startsWith("http 404") ||
    lower.includes("upstream returned html")
  ) {
    return "";
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

/** Map Moralis chainIds (0x1, 0x2105, …) and slugs to a short human label. */
function chainLabelFromId(raw: unknown): string {
  const v = String(raw ?? "").toLowerCase();
  if (v === "0x1" || v === "ethereum" || v === "eth") return "Ethereum";
  if (v === "0x2105" || v === "base") return "Base";
  if (v === "0x89" || v === "polygon" || v === "matic") return "Polygon";
  if (v === "0xa" || v === "optimism" || v === "op") return "Optimism";
  if (v === "0xa4b1" || v === "arbitrum") return "Arbitrum";
  if (v === "0x38" || v === "binance" || v === "bsc") return "BNB Chain";
  if (v === "0xa86a" || v === "avalanche") return "Avalanche";
  if (v === "solana-mainnet" || v === "sol") return "Solana";
  return raw ? String(raw) : "—";
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
  const showSync = dash.value.showSyncDebug;
  const d = useWalletPageLoader();
  const loc = useLocation();
  const L = loc.params.locale || "en-us";
  const v = d.value as any;
  const invalidAddress = !!v.invalidAddress;

  const tokenTab = useSignal<"base" | "eth">("base");
  const txTab = useSignal<"base" | "eth">("base");
  const copied = useSignal(false);

  const nftColLoading = useSignal(false);
  const nftColErr = useSignal("");
  const nftColPayload = useSignal<Record<string, unknown> | null>(null);
  const nftColChain = useSignal<"base" | "eth">("base");
  const nftTokLoading = useSignal(false);
  const nftTokErr = useSignal("");
  const nftTokContract = useSignal("");
  const nftTokPayload = useSignal<unknown>(null);

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

  const loadNftCollections = $(async () => {
    nftColLoading.value = true;
    nftColErr.value = "";
    try {
      if (!walletAddr) return;
      const addr = encodeURIComponent(walletAddr);
      const chain = nftColChain.value;
      const res = await fetch(
        `/api/crypto/moralis/wallet/${addr}/nft/collections?chain=${chain}&limit=50&exclude_spam=true&token_counts=true&include_prices=true`,
        { credentials: "include" },
      );
      const j = (await res.json()) as { ok?: boolean; error?: string; data?: unknown };
      if (!res.ok || !j.ok) {
        nftColErr.value = j.error || `HTTP ${res.status}`;
        nftColPayload.value = null;
        return;
      }
      nftColPayload.value = (j.data ?? null) as Record<string, unknown> | null;
    } catch (e) {
      nftColErr.value = e instanceof Error ? e.message : String(e);
      nftColPayload.value = null;
    } finally {
      nftColLoading.value = false;
    }
  });

  /** Moralis GET /nft/{contract} — proxied as …/wallet/:wallet/nft/:contract (sesión). */
  const loadNftContractTokens = $(async (contract: string) => {
    nftTokLoading.value = true;
    nftTokErr.value = "";
    try {
      if (!walletAddr) return;
      const ca = String(contract).trim().toLowerCase();
      if (!/^0x[a-f0-9]{40}$/.test(ca)) return;
      const w = encodeURIComponent(walletAddr);
      const c = encodeURIComponent(ca);
      const chain = nftColChain.value;
      const res = await fetch(
        `/api/crypto/moralis/wallet/${w}/nft/${c}?chain=${chain}&limit=24&media_items=true&include_prices=true`,
        { credentials: "include" },
      );
      const j = (await res.json()) as { ok?: boolean; error?: string; data?: unknown };
      if (!res.ok || !j.ok) {
        nftTokErr.value = j.error || `HTTP ${res.status}`;
        nftTokPayload.value = null;
        nftTokContract.value = "";
        return;
      }
      nftTokContract.value = ca;
      nftTokPayload.value = j.data;
    } catch (e) {
      nftTokErr.value = e instanceof Error ? e.message : String(e);
      nftTokPayload.value = null;
      nftTokContract.value = "";
    } finally {
      nftTokLoading.value = false;
    }
  });

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
   * Prefer Universal API `tokensCrossChain` (single multi-chain payload, includes 24h % change,
   * portfolioPercentage, securityScore). Fallback to legacy per-chain `tokBase`/`tokEth` for
   * snapshots taken before the cross-chain field was synced.
   */
  const useCrossChain = !!v.tokensCrossChain?.ok;
  const tokRowsCross: CrossChainTokenRow[] = useCrossChain
    ? crossChainTokenRowsForChain(v.tokensCrossChain.data, tokenTab.value)
    : [];
  const tokRows: Record<string, unknown>[] = useCrossChain
    ? []
    : tokenTab.value === "base"
      ? tokenRowsFromMoralis(v.tokBase?.ok ? v.tokBase.data : null)
      : tokenRowsFromMoralis(v.tokEth?.ok ? v.tokEth.data : null);
  const tokOk = useCrossChain
    ? true
    : tokenTab.value === "base"
      ? v.tokBase?.ok
      : v.tokEth?.ok;
  const tokErr = useCrossChain
    ? ""
    : cleanErrorText(tokenTab.value === "base" ? v.tokBase?.error : v.tokEth?.error);
  const tokRowCount = useCrossChain ? tokRowsCross.length : tokRows.length;

  const txRows =
    txTab.value === "base"
      ? txRowsFromMoralis(v.txBase?.ok ? v.txBase.data : null)
      : txRowsFromMoralis(v.txEth?.ok ? v.txEth.data : null);
  const txOk = txTab.value === "base" ? v.txBase?.ok : v.txEth?.ok;
  const txErr = cleanErrorText(
    txTab.value === "base" ? v.txBase?.error : v.txEth?.error,
  );

  const nfts = nftItemsFromMoralis(v.nfts?.ok ? v.nfts.data : null);
  const nftsErr = cleanErrorText(v.nfts?.error);
  const baseAct = walletBaseActivityForUi(v.weekBase);
  const maxBaseAct = Math.max(...(baseAct?.buckets.map((b) => b.count) ?? [0]), 1);

  const explorerBase = `https://basescan.org/address/${v.address}`;
  const explorerEth = `https://etherscan.io/address/${v.address}`;

  return (
    <div class="mx-auto w-full max-w-[1600px] 2xl:max-w-[1760px]">
      <nav class="mb-4 text-sm" aria-label="Migas de pan">
        <Link href={`/${L}/top-traders/`} class="text-[#04E6E6] hover:underline">
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
          {showSync ? (
            <>
              No hay datos guardados para esta wallet. Los balances se rellenan en el job diario (sync) para la
              watchlist, usuarios registrados y traders destacados. Vuelve tras ejecutar el sync o pide que se añada la
              dirección al job.
            </>
          ) : (
            <>No hay datos guardados para esta wallet todavía. Prueba de nuevo más tarde.</>
          )}
        </p>
      ) : null}
      <p class="text-xs text-gray-600 mb-6">
        {showSync
          ? "Vista desde caché del último sync. Sin consultas en vivo por cada visita."
          : "Vista desde datos en caché (actualizados periódicamente)."}
      </p>

      <section class="rounded-xl border border-[#043234] bg-[#001a1c] p-4 sm:p-5 mb-6">
        <h2 class="text-sm font-semibold text-gray-300 mb-3">Patrimonio neto (Base + Ethereum)</h2>
        {v.nw?.ok && nwData ? (
          <div class="grid gap-5 lg:grid-cols-3 lg:items-center">
            {nwTotalUsd != null ? (
              <div class="lg:col-span-1">
                <p class="text-3xl font-semibold text-white tabular-nums sm:text-4xl">
                  ≈ ${formatUsdBalance(nwTotalUsd)}
                </p>
                <p class="mt-1 text-xs text-gray-500">USD total · Base + Ethereum</p>
              </div>
            ) : null}
            {nwChains.length > 0 ? (
              <ul class="grid gap-2 text-sm sm:grid-cols-2 lg:col-span-2 lg:gap-3">
                {nwChains.map((c: Record<string, unknown>, i: number) => (
                  <li
                    key={`${String(c.chain ?? "chain")}-${i}`}
                    class="flex items-center justify-between gap-3 rounded-lg border border-[#043234] bg-[#000D0E]/60 px-3 py-2.5"
                  >
                    <span class="font-mono text-[11px] uppercase text-[#04E6E6]/90">
                      {String(c.chain ?? "—")}
                    </span>
                    <span class="tabular-nums text-slate-100">
                      ${formatUsdBalance(pickUsd(c.networth_usd) ?? 0)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : (
          <WalletEmptyState
            title="Sin datos de patrimonio"
            hint="Aún no se han registrado balances de esta wallet."
          />
        )}
      </section>

      <div class="grid gap-6 lg:grid-cols-2 mb-6">
        <section class="rounded-xl border border-[#043234] bg-[#001a1c] p-4">
          <h2 class="mb-4 text-sm font-semibold text-gray-300">PnL agregado</h2>
          <div class="grid gap-4">
            <WalletPnlSnapshot
              chainLabel="Base"
              ok={!!v.pnlBase?.ok}
              data={v.pnlBase?.ok ? v.pnlBase.data : null}
              error={v.pnlBase?.error}
              showSync={showSync}
              emptyMessage="No disponible actualmente."
            />
            <WalletPnlSnapshot
              chainLabel="Ethereum"
              ok={!!v.pnlEth?.ok}
              data={v.pnlEth?.ok ? v.pnlEth.data : null}
              error={v.pnlEth?.error}
              showSync={showSync}
              emptyMessage="No disponible actualmente."
            />
          </div>
        </section>

        <section class="rounded-xl border border-[#043234] bg-[#001a1c] p-4">
          <h2 class="text-sm font-semibold text-gray-300 mb-1">Actividad en Base (muestra)</h2>
          {baseAct?.note ? (
            <p class="text-[11px] text-gray-500 mb-3">{baseAct.note}</p>
          ) : (
            <p class="text-[11px] text-gray-500 mb-3">
              Transacciones por día (UTC). Si no hay barras recientes, se usan todos los timestamps de la muestra.
            </p>
          )}
          {baseAct ? (
            <div class="overflow-x-auto mb-4 -mx-1 px-1">
              <div
                class="flex items-end gap-0.5 min-h-28 border-b border-[#043234] pb-1"
                style={{
                  minWidth: baseAct.buckets.length > 12 ? `${Math.max(320, baseAct.buckets.length * 14)}px` : undefined,
                }}
              >
                {baseAct.buckets.map((b, i) => {
                  const h = Math.round((b.count / maxBaseAct) * 100);
                  return (
                    <div
                      key={`${b.label}-${i}`}
                      class="flex min-w-[12px] flex-1 flex-col items-center gap-1"
                      style={{ flex: "1 0 12px", maxWidth: "28px" }}
                    >
                      <div class="w-full rounded-t bg-[#04E6E6]/80" style={{ height: `${Math.max(h, 4)}%` }} />
                      <span class="text-[8px] leading-tight text-gray-500 text-center max-w-[40px] truncate">
                        {b.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : v.txBase?.ok && !v.snapshotMissing ? (
            <p class="text-sm text-gray-500 mb-4">
              No hay fechas legibles en las transacciones disponibles en este momento.
            </p>
          ) : null}
          {v.interactBase ? (
            <div class="text-xs text-gray-400 space-y-2">
              <p>
                <span class="text-gray-500">Contrapartes (aprox., desde txs Base):</span> enviado a{" "}
                <span class="text-white">{v.interactBase.sentN}</span> · recibido de{" "}
                <span class="text-white">{v.interactBase.recvN}</span>
              </p>
              {v.interactBase.sentPreview.length > 0 ? (
                <p class="break-all">
                  <span class="text-gray-500">To (sample):</span>{" "}
                  {v.interactBase.sentPreview.map((a: string) => (
                    <Link key={a} href={`/${L}/wallet/${a}/`} class="text-[#04E6E6] hover:underline mr-1">
                      {a.slice(0, 8)}…
                    </Link>
                  ))}
                </p>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>

      <div class="grid gap-6 xl:grid-cols-12 mb-6">
      <section class="rounded-xl border border-[#043234] bg-[#001a1c] p-4 sm:p-5 xl:col-span-7">
        <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div>
            <h2 class="text-sm font-semibold text-gray-200">ERC-20 tokens</h2>
            <p class="mt-0.5 text-[11px] text-gray-500">
              {tokOk && tokRowCount > 0
                ? `${tokRowCount} tokens en ${tokenTab.value === "base" ? "Base" : "Ethereum"}${useCrossChain ? " · vía Universal API (24h, % cartera, security)" : ""}`
                : "Top tokens por valor"}
            </p>
          </div>
          <div class="flex rounded-lg border border-[#043234] overflow-hidden text-xs">
            <button
              type="button"
              class={`px-3 py-1.5 ${tokenTab.value === "base" ? "bg-[#04E6E6]/20 text-[#04E6E6]" : "text-gray-400"}`}
              onClick$={() => {
                tokenTab.value = "base";
              }}
            >
              Base
            </button>
            <button
              type="button"
              class={`px-3 py-1.5 ${tokenTab.value === "eth" ? "bg-[#04E6E6]/20 text-[#04E6E6]" : "text-gray-400"}`}
              onClick$={() => {
                tokenTab.value = "eth";
              }}
            >
              Ethereum
            </button>
          </div>
        </div>
        {tokOk && useCrossChain && tokRowsCross.length > 0 ? (
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead>
                <tr class="border-b border-[#043234] text-gray-500">
                  <th class="py-2 pr-2 font-medium">Token</th>
                  <th class="py-2 pr-2 font-medium">Balance</th>
                  <th class="py-2 pr-2 font-medium text-right">Precio</th>
                  <th class="py-2 pr-2 font-medium text-right">24h</th>
                  <th class="py-2 pr-2 font-medium text-right">% cartera</th>
                  <th class="py-2 font-medium text-right">USD</th>
                </tr>
              </thead>
              <tbody>
                {tokRowsCross.map((t) => {
                  const change = t.usdPrice24hrPercentChange;
                  const changeCls =
                    change == null
                      ? "text-gray-500"
                      : change > 0
                        ? "text-emerald-300"
                        : change < 0
                          ? "text-rose-300"
                          : "text-gray-400";
                  const changeText = change == null
                    ? "—"
                    : `${change > 0 ? "+" : ""}${change.toFixed(2)}%`;
                  return (
                    <tr
                      key={`${t.tokenAddress}-${t.chainId}`}
                      class="border-b border-[#043234] border-opacity-40 text-gray-300"
                    >
                      <td class="py-2 pr-2">
                        <div class="flex min-w-0 items-center gap-2">
                          <TokenLogoImg src={t.logo} symbol={t.symbol ?? "?"} size={28} />
                          <div class="min-w-0">
                            <span class="font-semibold text-gray-200">
                              {t.symbol ?? "?"}
                              {t.nativeToken ? (
                                <span class="ml-1.5 align-middle text-[8px] uppercase tracking-wide text-[#04E6E6]/80">
                                  native
                                </span>
                              ) : null}
                            </span>
                            <span class="block text-[10px] text-gray-500 truncate max-w-[180px]">
                              {t.name ?? ""}
                            </span>
                            <span class="mt-0.5 flex flex-wrap items-center gap-1">
                              <EvmAddrLinks
                                locale={L}
                                moralisChain={tokenTab.value}
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
                      <td class="py-2 pr-2 font-mono tabular-nums text-gray-400">
                        {t.balance ?? "0"}
                      </td>
                      <td class="py-2 pr-2 text-right tabular-nums text-gray-300">
                        {t.usdPrice != null ? `$${formatUsdBalance(t.usdPrice)}` : "—"}
                      </td>
                      <td class={`py-2 pr-2 text-right tabular-nums ${changeCls}`}>
                        {changeText}
                      </td>
                      <td class="py-2 pr-2 text-right tabular-nums text-gray-400">
                        {t.portfolioPercentage != null
                          ? `${t.portfolioPercentage.toFixed(2)}%`
                          : "—"}
                      </td>
                      <td class="py-2 text-right tabular-nums text-slate-100">
                        ${formatUsdBalance(t.usdValue ?? 0)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : tokOk && !useCrossChain && tokRows.length > 0 ? (
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead>
                <tr class="border-b border-[#043234] text-gray-500">
                  <th class="py-2 pr-2 font-medium">Token</th>
                  <th class="py-2 pr-2 font-medium">Balance</th>
                  <th class="py-2 font-medium text-right">USD</th>
                </tr>
              </thead>
              <tbody>
                {tokRows.map((t: Record<string, unknown>) => (
                  <tr
                    key={String(t.token_address)}
                    class="border-b border-[#043234] border-opacity-40 text-gray-300"
                  >
                    <td class="py-2 pr-2">
                      <div class="flex min-w-0 items-center gap-2">
                        <TokenLogoImg
                          src={erc20LogoUrl(t)}
                          symbol={String(t.symbol ?? "?")}
                          size={28}
                        />
                        <div class="min-w-0">
                          <span class="font-semibold text-gray-200">{String(t.symbol ?? "?")}</span>
                          <span class="block text-[10px] text-gray-500 truncate max-w-[160px]">
                            {String(t.name ?? "")}
                          </span>
                          <span class="mt-0.5 block">
                            <EvmAddrLinks locale={L} moralisChain={tokenTab.value} address={t.token_address} variant="token" />
                          </span>
                        </div>
                      </div>
                    </td>
                    <td class="py-2 pr-2 font-mono tabular-nums text-gray-400">
                      {String(t.balance_formatted ?? t.balance ?? "0")}
                    </td>
                    <td class="py-2 text-right tabular-nums">
                      ${formatUsdBalance(Number(t.usd_value ?? 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : tokOk ? (
          <WalletEmptyState
            title={`Sin tokens en ${tokenTab.value === "base" ? "Base" : "Ethereum"}`}
            hint="Esta wallet no tiene balances ERC-20 detectados en esta red."
          />
        ) : tokErr ? (
          <WalletEmptyState
            title="No se pudieron cargar los tokens"
            hint={showSync ? tokErr : "Vuelve a intentarlo después del próximo sync."}
            tone="warn"
          />
        ) : (
          <WalletEmptyState
            title="Sin datos de tokens"
            hint="Aún no se han registrado balances."
          />
        )}
      </section>

      <section class="rounded-xl border border-[#043234] bg-[#001a1c] p-4 sm:p-5 xl:col-span-5">
        <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div>
            <h2 class="text-sm font-semibold text-gray-200">Transacciones recientes</h2>
            <p class="mt-0.5 text-[11px] text-gray-500">
              {txOk && txRows.length
                ? `${txRows.length} transacciones en ${txTab.value === "base" ? "Base" : "Ethereum"}`
                : "Movimientos más recientes primero"}
            </p>
          </div>
          <div class="flex rounded-lg border border-[#043234] overflow-hidden text-xs">
            <button
              type="button"
              class={`px-3 py-1.5 ${txTab.value === "base" ? "bg-[#04E6E6]/20 text-[#04E6E6]" : "text-gray-400"}`}
              onClick$={() => {
                txTab.value = "base";
              }}
            >
              Base
            </button>
            <button
              type="button"
              class={`px-3 py-1.5 ${txTab.value === "eth" ? "bg-[#04E6E6]/20 text-[#04E6E6]" : "text-gray-400"}`}
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
              <thead>
                <tr class="border-b border-[#043234] text-[10px] uppercase tracking-wide text-gray-500">
                  <th class="px-1 py-2 font-medium">Hash</th>
                  <th class="px-1 py-2 font-medium">Fecha</th>
                  <th class="px-1 py-2 font-medium">Desde</th>
                  <th class="px-1 py-2 font-medium">Hacia</th>
                </tr>
              </thead>
              <tbody>
                {txRows.map((tx: Record<string, unknown>) => {
                  const h = String(tx.hash ?? "");
                  return (
                    <tr key={h} class="border-b border-[#043234]/50">
                      <td class="whitespace-nowrap px-1 py-1.5 align-top">
                        <TxHashLink locale={L} moralisChain={txTab.value} hash={h} mode="hash10" />
                      </td>
                      <td class="whitespace-nowrap px-1 py-1.5 align-top text-gray-500">
                        {String(tx.block_timestamp ?? "").replace("T", " ").slice(0, 19)}
                      </td>
                      <td class="px-1 py-1.5 align-top">
                        <EvmAddrLinks locale={L} moralisChain={txTab.value} address={tx.from_address ?? tx.from} />
                      </td>
                      <td class="px-1 py-1.5 align-top">
                        <EvmAddrLinks locale={L} moralisChain={txTab.value} address={tx.to_address ?? tx.to} />
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
            hint={showSync ? txErr : "Vuelve a intentarlo después del próximo sync."}
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

      <div class="grid gap-6 xl:grid-cols-12 mb-6">
      <section class="rounded-xl border border-[#043234] bg-[#001a1c] p-4 sm:p-5 xl:col-span-5">
        <h2 class="text-sm font-semibold text-gray-300 mb-3">NFTs (Base)</h2>
        {v.nfts?.ok && nfts.length > 0 ? (
          <div class="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {nfts.map((n: Record<string, unknown>) => {
              const img = nftImage(n);
              const name = String((n.normalized_metadata as { name?: string })?.name ?? n.name ?? n.symbol ?? "NFT");
              const ca = String(n.token_address ?? "").toLowerCase();
              const tid = String(n.token_id ?? "");
              const nftDash =
                /^0x[a-f0-9]{40}$/.test(ca) && tid
                  ? `/${L}/nfts/${ca}/${encodeURIComponent(tid)}/?chain=base`
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
                  <p class="text-[10px] text-gray-400 truncate px-1 py-1" title={name}>
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
        ) : v.nfts?.ok ? (
          <WalletEmptyState
            title="Sin NFTs en Base"
            hint="Esta wallet no tiene NFTs detectados. Usa “Cargar colecciones” abajo para consultar en vivo."
          />
        ) : nftsErr ? (
          <WalletEmptyState
            title="No se pudieron cargar los NFTs"
            hint={showSync ? nftsErr : "Vuelve a intentarlo después del próximo sync."}
            tone="warn"
          />
        ) : (
          <WalletEmptyState
            title="Sin NFTs registrados"
            hint="Aún no hay datos de NFTs para esta wallet."
          />
        )}
      </section>

      <section class="rounded-xl border border-[#043234] bg-[#001a1c] p-4 sm:p-5 xl:col-span-7">
        <div class="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div>
            <h2 class="text-sm font-semibold text-gray-300">Colecciones NFT (en vivo)</h2>
            <p class="text-[11px] text-gray-500 mt-1">
              Carga las colecciones detectadas en tu wallet en la red elegida (requiere sesión).
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <div class="flex rounded-lg border border-[#043234] overflow-hidden text-xs">
              <button
                type="button"
                class={`px-3 py-1.5 ${nftColChain.value === "base" ? "bg-[#04E6E6]/20 text-[#04E6E6]" : "text-gray-400"}`}
                onClick$={() => {
                  nftColChain.value = "base";
                }}
              >
                Base
              </button>
              <button
                type="button"
                class={`px-3 py-1.5 ${nftColChain.value === "eth" ? "bg-[#04E6E6]/20 text-[#04E6E6]" : "text-gray-400"}`}
                onClick$={() => {
                  nftColChain.value = "eth";
                }}
              >
                Ethereum
              </button>
            </div>
            <button
              type="button"
              disabled={nftColLoading.value}
              class="rounded-lg bg-[#04E6E6]/15 px-3 py-1.5 text-xs font-medium text-[#04E6E6] ring-1 ring-[#04E6E6]/30 hover:bg-[#04E6E6]/25 disabled:opacity-50"
              onClick$={loadNftCollections}
            >
              {nftColLoading.value ? "Cargando…" : "Cargar colecciones"}
            </button>
          </div>
        </div>
        {nftColErr.value ? (
          <p class="text-sm text-amber-400 mb-2">{nftColErr.value}</p>
        ) : null}
        {nftColPayload.value && Array.isArray(nftColPayload.value.result) && (nftColPayload.value.result as unknown[]).length > 0 ? (
          <ul class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(nftColPayload.value.result as Record<string, unknown>[]).map((c) => {
              const ca = String(c.token_address ?? "").toLowerCase();
              const name = String(c.name ?? c.symbol ?? "Collection");
              const sym = String(c.symbol ?? "");
              const logo = typeof c.collection_logo === "string" ? c.collection_logo : "";
              const count = typeof c.count === "number" ? c.count : null;
              const floorUsd = c.floor_price_usd != null ? String(c.floor_price_usd) : "";
              const chainQ = nftColChain.value;
              const href =
                /^0x[a-f0-9]{40}$/.test(ca) ? `/${L}/nfts/${ca}/?chain=${chainQ}` : null;
              return (
                <li
                  key={ca}
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
                      <EvmAddrLinks locale={L} moralisChain={nftColChain.value} address={ca} variant="nft" />
                    </div>
                    <div class="mt-1 flex flex-wrap gap-2 text-[10px] text-gray-400">
                      {count != null ? <span>{count} en wallet</span> : null}
                      {floorUsd ? <span>Floor ~${floorUsd} USD</span> : null}
                    </div>
                    <div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                      {href ? (
                        <Link href={href} class="inline-block text-[#04E6E6] hover:underline">
                          Ver colección →
                        </Link>
                      ) : null}
                      {/^0x[a-f0-9]{40}$/.test(ca) ? (
                        <button
                          type="button"
                          disabled={nftTokLoading.value}
                          class="text-[10px] text-slate-400 hover:text-[#04E6E6] disabled:opacity-50"
                          onClick$={() => loadNftContractTokens(ca)}
                        >
                          {nftTokLoading.value && nftTokContract.value === ca
                            ? "Cargando tokens…"
                            : "Ver JSON de la colección"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : nftColPayload.value && !nftColErr.value ? (
          <p class="text-sm text-gray-500">Sin colecciones en esta red (o respuesta vacía).</p>
        ) : (
          <p class="text-sm text-gray-500">
            Pulsa <span class="text-gray-400">Cargar colecciones</span> para listar NFT por contrato (sesión requerida).
          </p>
        )}
        {nftTokErr.value ? <p class="text-sm text-amber-400 mt-3">{nftTokErr.value}</p> : null}
        {nftTokPayload.value != null && nftTokContract.value ? (
          <div class="mt-4">
            <p class="text-[10px] text-gray-500 mb-1 font-mono break-all">
              Detalle de colección · {nftTokContract.value} · red {nftColChain.value}
            </p>
            <pre class="max-h-80 overflow-auto rounded-lg border border-[#043234] bg-[#000D0E] p-3 text-[10px] leading-relaxed text-slate-300 font-mono whitespace-pre-wrap break-all">
              {JSON.stringify(nftTokPayload.value, null, 2)}
            </pre>
          </div>
        ) : null}
      </section>
      </div>

      <section class="rounded-xl border border-[#043234] bg-[#001a1c] p-4 sm:p-5 mb-6">
        <div class="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 class="text-sm font-semibold text-gray-200">DeFi · multi-chain</h2>
            <p class="mt-1 text-[11px] text-gray-500">
              Lending, liquidez, staking y rewards · Ethereum + Base · cacheado por el sync diario.
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
              Sin posiciones DeFi detectadas para esta wallet en el último sync.
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
                                  {chainLabelFromId(p.chainId)}
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
                      const chain = chainLabelFromId(row.chainId);
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
              Con Pro desbloqueas <strong class="text-gray-300">resumen DeFi multi-chain</strong> (lending, liquidez, staking,
              rewards) en Ethereum y Base, obtenido del sync diario.
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

      {showSync ? (
        <p class="text-xs text-gray-600">Datos del último sync diario.</p>
      ) : (
        <p class="text-xs text-gray-600">Datos actualizados periódicamente.</p>
      )}
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
  const chain = chainLabelFromId(result?.chainId);
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
