import { component$, useSignal, $, useVisibleTask$ } from "@builder.io/qwik";
import { Link, routeLoader$, useLocation } from "@builder.io/qwik-city";
import { LuCopy, LuExternalLink } from "@qwikest/icons/lucide";
import { useDashboardAuth } from "../../layout";
import { getWalletSnapshotJson } from "~/server/crypto-ghost/api-snapshot-sync";
import { isEvmAddress } from "~/server/crypto-ghost/market-queries";
import { TokenLogoImg } from "~/components/crypto-dashboard/token-logo";
import { WalletPnlSnapshot } from "~/components/crypto-dashboard/wallet-pnl-snapshot";
import { formatUsdBalance } from "~/utils/format-market";
import {
  baseActivityFromTransactions,
  erc20LogoUrl,
  interactionStats,
  nftImage,
  nftItemsFromMoralis,
  tokenRowsFromMoralis,
  txRowsFromMoralis,
  walletBaseActivityForUi,
} from "~/server/crypto-ghost/wallet-snapshot";
import { EvmAddrLinks, TxHashLink } from "~/components/crypto-dashboard/evm-dash-links";
import {
  buildMoralisWalletLiveUrl,
  MORALIS_WALLET_LIVE_KINDS,
  moralisLiveSlotKey,
  type MoralisWalletLiveKind,
} from "~/components/crypto-dashboard/moralis-wallet-live-api";
import { WalletMoralisLiveBlock } from "~/components/crypto-dashboard/wallet-moralis-live-block";
import { WalletMoralisProDashboard, type ProLiveSlot } from "~/components/crypto-dashboard/wallet-moralis-pro-dashboard";

function staleErr(msg: string) {
  return { ok: false as const, error: msg };
}

export const useWalletPageLoader = routeLoader$(async (ev) => {
  const raw = ev.params.address?.trim() || "";
  if (!isEvmAddress(raw)) {
    throw ev.error(400, { message: "Invalid wallet address" });
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

  const walletAddr = String(v.address || "").toLowerCase();

  const whKind = useSignal<MoralisWalletLiveKind>("history");
  const whChain = useSignal<"base" | "eth">("base");
  const whLoading = useSignal(false);
  const whErr = useSignal("");
  const whPayload = useSignal<unknown>(null);

  const proLiveSlots = useSignal<Record<string, ProLiveSlot>>({});
  const proLiveLoading = useSignal(false);

  const fetchAllProMoralis$ = $(async (rawAddr: string) => {
    const addr = rawAddr.trim().toLowerCase();
    if (!/^0x[a-f0-9]{40}$/i.test(addr)) return;
    proLiveLoading.value = true;
    try {
      const enc = encodeURIComponent(addr);
      const entries = await Promise.all(
        MORALIS_WALLET_LIVE_KINDS.flatMap(({ id }) =>
          (["base", "eth"] as const).map(async (chain) => {
            const key = moralisLiveSlotKey(id, chain);
            try {
              const url = buildMoralisWalletLiveUrl(id, chain, enc);
              const res = await fetch(url, { credentials: "include" });
              const j = (await res.json()) as { ok?: boolean; error?: string; data?: unknown };
              if (!res.ok || !j.ok) {
                return [key, { error: j.error || `HTTP ${res.status}` } as ProLiveSlot] as const;
              }
              return [key, { data: j.data } as ProLiveSlot] as const;
            } catch (e) {
              return [key, { error: e instanceof Error ? e.message : String(e) } as ProLiveSlot] as const;
            }
          }),
        ),
      );
      proLiveSlots.value = Object.fromEntries(entries) as Record<string, ProLiveSlot>;
    } finally {
      proLiveLoading.value = false;
    }
  });

  useVisibleTask$(async ({ track }) => {
    track(() => loc.params.address);
    track(() => dash.value.hasPro);
    const addr = String(loc.params.address ?? "")
      .trim()
      .toLowerCase();
    if (!dash.value.hasPro || !/^0x[a-f0-9]{40}$/i.test(addr)) {
      proLiveSlots.value = {};
      return;
    }
    await fetchAllProMoralis$(addr);
  });

  const loadWalletMoralisLive = $(async () => {
    whLoading.value = true;
    whErr.value = "";
    try {
      if (!walletAddr) return;
      const addr = encodeURIComponent(walletAddr);
      const ch = whChain.value;
      const url = buildMoralisWalletLiveUrl(whKind.value, ch, addr);
      const res = await fetch(url, { credentials: "include" });
      const j = (await res.json()) as { ok?: boolean; error?: string; data?: unknown };
      if (!res.ok || !j.ok) {
        whErr.value = j.error || `HTTP ${res.status}`;
        whPayload.value = null;
        return;
      }
      whPayload.value = j.data;
    } catch (e) {
      whErr.value = e instanceof Error ? e.message : String(e);
      whPayload.value = null;
    } finally {
      whLoading.value = false;
    }
  });

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
  const nwChains = Array.isArray(nwData?.chains) ? (nwData.chains as Record<string, unknown>[]) : [];

  const tokRows =
    tokenTab.value === "base"
      ? tokenRowsFromMoralis(v.tokBase?.ok ? v.tokBase.data : null)
      : tokenRowsFromMoralis(v.tokEth?.ok ? v.tokEth.data : null);
  const tokOk = tokenTab.value === "base" ? v.tokBase?.ok : v.tokEth?.ok;
  const tokErr = tokenTab.value === "base" ? v.tokBase?.error : v.tokEth?.error;

  const txRows =
    txTab.value === "base"
      ? txRowsFromMoralis(v.txBase?.ok ? v.txBase.data : null)
      : txRowsFromMoralis(v.txEth?.ok ? v.txEth.data : null);
  const txOk = txTab.value === "base" ? v.txBase?.ok : v.txEth?.ok;
  const txErr = txTab.value === "base" ? v.txBase?.error : v.txEth?.error;

  const nfts = nftItemsFromMoralis(v.nfts?.ok ? v.nfts.data : null);
  const baseAct = walletBaseActivityForUi(v.weekBase);
  const maxBaseAct = Math.max(...(baseAct?.buckets.map((b) => b.count) ?? [0]), 1);

  const explorerBase = `https://basescan.org/address/${v.address}`;
  const explorerEth = `https://etherscan.io/address/${v.address}`;

  return (
    <div class="max-w-6xl">
      <nav class="mb-4 text-sm" aria-label="Migas de pan">
        <Link href={`/${L}/dashboard/top-traders/`} class="text-[#04E6E6] hover:underline">
          ← Watchlist de traders
        </Link>
      </nav>

      <header class="mb-8 rounded-2xl border border-[#043234] bg-[#001a1c]/80 p-5 shadow-lg shadow-black/20">
        <p class="text-xs font-medium uppercase tracking-wide text-gray-500">Cartera EVM · snapshot</p>
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

      <section class="rounded-xl border border-[#043234] bg-[#001a1c] p-4 mb-6">
        <h2 class="text-sm font-semibold text-gray-300 mb-2">Patrimonio neto (snapshot · Base + Ethereum)</h2>
        {v.nw?.ok && nwData ? (
          <div>
            {nwTotal != null && String(nwTotal) !== "" ? (
              <p class="text-2xl font-semibold text-white tabular-nums">
                ≈ ${formatUsdBalance(nwTotal)}
                <span class="text-sm font-normal text-gray-400 ml-2">USD total</span>
              </p>
            ) : null}
            {nwChains.length > 0 ? (
              <ul class="mt-4 space-y-2 text-sm">
                {nwChains.map((c: Record<string, unknown>, i: number) => (
                  <li
                    key={`${String(c.chain ?? "chain")}-${i}`}
                    class="flex flex-wrap justify-between gap-2 border-b border-[#043234] border-opacity-60 pb-2 last:border-0"
                  >
                    <span class="font-mono text-[#04E6E6]/90 uppercase">{String(c.chain ?? "—")}</span>
                    <span class="text-gray-200 tabular-nums">
                      ${formatUsdBalance(c.networth_usd ?? 0)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : (
          <p class="text-sm text-amber-400">
            {showSync ? v.nw?.error || "No data" : "No hay datos de patrimonio en el último snapshot."}
          </p>
        )}
      </section>

      <div class="grid gap-6 lg:grid-cols-2 mb-6">
        <section class="rounded-xl border border-[#043234] bg-[#001a1c] p-4">
          <h2 class="mb-4 text-sm font-semibold text-gray-300">PnL agregado (snapshot)</h2>
          <div class="grid gap-4">
            <WalletPnlSnapshot
              chainLabel="Base"
              ok={!!v.pnlBase?.ok}
              data={v.pnlBase?.ok ? v.pnlBase.data : null}
              error={v.pnlBase?.error}
              showSync={showSync}
              emptyMessage="No disponible en el snapshot actual."
            />
            <WalletPnlSnapshot
              chainLabel="Ethereum"
              ok={!!v.pnlEth?.ok}
              data={v.pnlEth?.ok ? v.pnlEth.data : null}
              error={v.pnlEth?.error}
              showSync={showSync}
              emptyMessage="No disponible en el snapshot actual."
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
              No hay fechas legibles en las transacciones del snapshot (revisa tras el próximo sync).
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
                    <Link key={a} href={`/${L}/dashboard/wallet/${a}/`} class="text-[#04E6E6] hover:underline mr-1">
                      {a.slice(0, 8)}…
                    </Link>
                  ))}
                </p>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>

      <section class="rounded-xl border border-[#043234] bg-[#001a1c] p-4 mb-6">
        <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h2 class="text-sm font-semibold text-gray-300">ERC-20 tokens</h2>
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
        {tokOk && tokRows.length > 0 ? (
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
                      ${formatUsdBalance(t.usd_value ?? 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : tokOk ? (
          <p class="text-sm text-gray-500">Sin tokens en esta cadena.</p>
        ) : (
          <p class="text-sm text-amber-400">
            {showSync ? tokErr || "No data" : "No hay datos de tokens en el último snapshot."}
          </p>
        )}
      </section>

      <section class="rounded-xl border border-[#043234] bg-[#001a1c] p-4 mb-6">
        <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h2 class="text-sm font-semibold text-gray-300">Transacciones recientes</h2>
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
          <p class="text-sm text-gray-500">Sin transacciones en el sample.</p>
        ) : (
          <p class="text-sm text-amber-400">
            {showSync ? txErr || "No data" : "No hay transacciones en el último snapshot."}
          </p>
        )}
      </section>

      <section class="rounded-xl border border-[#043234] bg-[#001a1c] p-4 mb-6">
        <h2 class="text-sm font-semibold text-gray-300 mb-3">NFTs (Base)</h2>
        {v.nfts?.ok && nfts.length > 0 ? (
          <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {nfts.map((n: Record<string, unknown>) => {
              const img = nftImage(n);
              const name = String((n.normalized_metadata as { name?: string })?.name ?? n.name ?? n.symbol ?? "NFT");
              const ca = String(n.token_address ?? "").toLowerCase();
              const tid = String(n.token_id ?? "");
              const nftDash =
                /^0x[a-f0-9]{40}$/.test(ca) && tid
                  ? `/${L}/dashboard/nfts/${ca}/${encodeURIComponent(tid)}/?chain=base`
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
          <p class="text-sm text-gray-500">Sin NFTs en Base (sample).</p>
        ) : (
          <p class="text-sm text-amber-400">
            {showSync ? v.nfts?.error || "No data" : "No hay datos de NFTs en el último snapshot."}
          </p>
        )}
      </section>

      <section class="rounded-xl border border-[#043234] bg-[#001a1c] p-4 mb-6">
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
                /^0x[a-f0-9]{40}$/.test(ca) ? `/${L}/dashboard/nfts/${ca}/?chain=${chainQ}` : null;
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

      <section class="rounded-xl border border-[#043234] bg-[#001a1c] p-4 mb-6">
        <h2 class="text-sm font-semibold text-gray-300 mb-2">Historial y actividad (en vivo)</h2>

        {dash.value.hasPro ? (
          <>
            <div class="flex flex-wrap items-center justify-between gap-3 mb-3">
              <p class="text-[11px] text-gray-400 max-w-3xl leading-relaxed">
                Datos en vivo (sesión requerida; no sustituyen el resumen en caché de arriba).{" "}
                <span class="mr-1.5 inline-flex items-center rounded-md bg-[#04E6E6]/15 px-2 py-0.5 align-middle text-[10px] font-semibold text-[#04E6E6] ring-1 ring-[#04E6E6]/25">
                  Pro
                </span>
                Se cargan solos los 9 tipos × Base y Ethereum; usa <strong class="font-medium text-gray-300">Actualizar todo</strong> para repetir.
                Opcional: un tipo y una red con el selector y <strong class="font-medium text-gray-300">Consultar</strong>.
              </p>
            </div>

            <div class="mb-6 space-y-4">
              <div class="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#04E6E6]/20 bg-[#04E6E6]/5 px-3 py-2.5">
                <p class="text-[11px] text-gray-400">
                  Vista completa: 9 tipos × Base + Ethereum (18 peticiones en paralelo al cargar).
                </p>
                <button
                  type="button"
                  disabled={proLiveLoading.value}
                  class="shrink-0 rounded-lg bg-[#04E6E6]/20 px-3 py-1.5 text-xs font-medium text-[#04E6E6] ring-1 ring-[#04E6E6]/30 hover:bg-[#04E6E6]/30 disabled:opacity-50"
                  onClick$={() => fetchAllProMoralis$(walletAddr)}
                >
                  {proLiveLoading.value ? "Actualizando…" : "Actualizar todo"}
                </button>
              </div>
              <WalletMoralisProDashboard locale={L} slots={proLiveSlots.value} loading={proLiveLoading.value} />
            </div>

            <p class="mb-3 text-[10px] text-gray-500">
              Consulta puntual (opcional): elige tipo, red y Consultar; JSON en «Ver respuesta JSON cruda».
            </p>

            <div class="flex flex-wrap items-center gap-2 mb-3">
              <label class="text-[10px] text-gray-500 uppercase tracking-wide">Tipo</label>
              <select
                class="rounded-lg border border-[#043234] bg-[#000D0E] px-2 py-1.5 text-xs text-white"
                value={whKind.value}
                onChange$={(e) => {
                  whKind.value = (e.target as HTMLSelectElement).value as MoralisWalletLiveKind;
                }}
              >
                <option value="history">Wallet history</option>
                <option value="erc20">ERC20 por wallet</option>
                <option value="swaps">Swaps DEX</option>
                <option value="nftTrades">NFT trades</option>
                <option value="verbose">Txs nativas decodificadas</option>
                <option value="nativeRaw">Txs nativas raw</option>
                <option value="insight">Wallet insight</option>
                <option value="stats">Wallet stats</option>
                <option value="activeChains">Cadenas activas</option>
              </select>
              <div class="flex rounded-lg border border-[#043234] overflow-hidden text-xs">
                <button
                  type="button"
                  class={`px-3 py-1.5 ${whChain.value === "base" ? "bg-[#04E6E6]/20 text-[#04E6E6]" : "text-gray-400"}`}
                  onClick$={() => {
                    whChain.value = "base";
                  }}
                >
                  Base
                </button>
                <button
                  type="button"
                  class={`px-3 py-1.5 ${whChain.value === "eth" ? "bg-[#04E6E6]/20 text-[#04E6E6]" : "text-gray-400"}`}
                  onClick$={() => {
                    whChain.value = "eth";
                  }}
                >
                  Ethereum
                </button>
              </div>
              <button
                type="button"
                disabled={whLoading.value}
                class="rounded-lg bg-[#04E6E6]/15 px-3 py-1.5 text-xs font-medium text-[#04E6E6] ring-1 ring-[#04E6E6]/30 hover:bg-[#04E6E6]/25 disabled:opacity-50"
                onClick$={loadWalletMoralisLive}
              >
                {whLoading.value ? "Cargando…" : "Consultar"}
              </button>
            </div>
            {whErr.value ? <p class="text-sm text-amber-400 mb-2">{whErr.value}</p> : null}
            {whPayload.value != null ? (
              <div class="space-y-3">
                <WalletMoralisLiveBlock
                  kind={whKind.value}
                  chain={whChain.value}
                  locale={L}
                  payload={whPayload.value}
                />

                <details class="group rounded-lg border border-[#043234]/80 bg-black/20">
                  <summary class="cursor-pointer list-inside px-3 py-2 text-[11px] text-gray-500 marker:text-gray-600 hover:text-gray-400">
                    Ver respuesta JSON cruda
                  </summary>
                  <pre class="max-h-80 overflow-auto border-t border-[#043234]/60 bg-[#000D0E] p-3 text-[10px] leading-relaxed text-slate-400 font-mono whitespace-pre-wrap break-all">
                    {JSON.stringify(whPayload.value, null, 2)}
                  </pre>
                </details>
              </div>
            ) : (
              <p class="text-sm text-gray-500">
                Sin vista puntual todavía: elige tipo + red y <span class="text-gray-400">Consultar</span>, o revisa el resumen
                Pro arriba.
              </p>
            )}
          </>
        ) : (
          <div class="rounded-xl border border-amber-500/35 bg-gradient-to-br from-amber-950/40 to-[#001a1c] p-4 sm:p-5">
            <p class="text-sm font-medium text-amber-100/95">
              Plan <span class="text-[#04E6E6]">Pro</span> requerido para el historial en vivo en esta pantalla.
            </p>
            <p class="mt-2 text-[12px] leading-relaxed text-gray-400">
              Con Pro desbloqueas la carga automática de los 9 tipos (historial, ERC-20, swaps, NFT trades, txs nativas,
              insight, stats, cadenas activas) en <strong class="text-gray-300">Base y Ethereum</strong>, tablas, tarjetas de
              métricas y JSON detallado. El resumen en caché de esta página sigue visible arriba.
            </p>
            <ul class="mt-3 list-inside list-disc space-y-1 text-[11px] text-gray-500">
              <li>Activa la suscripción o verifica el pago en Overview.</li>
              <li>Si ya pagaste, espera unos minutos o vuelve a iniciar sesión.</li>
            </ul>
            <div class="mt-4 flex flex-wrap gap-2">
              <Link
                href={`/${L}/dashboard/overview/`}
                class="inline-flex items-center rounded-lg bg-[#04E6E6]/20 px-4 py-2 text-xs font-semibold text-[#04E6E6] ring-1 ring-[#04E6E6]/35 hover:bg-[#04E6E6]/30"
              >
                Ir a Overview · planes Pro →
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
