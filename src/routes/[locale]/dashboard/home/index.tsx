import { component$, useSignal, $, useVisibleTask$ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";
import { Link, routeLoader$, useLocation } from "@builder.io/qwik-city";
import {
  LuActivity,
  LuArrowRight,
  LuBarChart3,
  LuBell,
  LuImage,
  LuLayers,
  LuLoader2,
  LuRadar,
  LuRadio,
  LuRefreshCw,
  LuSparkles,
} from "@qwikest/icons/lucide";
import { TokenLogoImg } from "~/components/crypto-dashboard/token-logo";
import { triggerCmcMarketSync, triggerOwnerFullMarketSync } from "~/server/crypto-ghost-actions";
import { useDashboardAuth } from "../layout";
import { effectiveSyncDurationMs, formatDurationMs } from "~/utils/format-duration";
import { formatTokenUsdPrice, formatUsdBalance, formatUsdLiquidity } from "~/utils/format-market";

export const head: DocumentHead = {
  title: "Crypto Dashboard Overview | Crypto Helper",
  meta: [
    {
      name: "description",
      content:
        "Explore crypto market overview, token rankings, bubbles, NFT collections, and trader dashboards in Crypto Helper.",
    },
  ],
};

export const useDashboardHomeLoader = routeLoader$(async (ev) => {
  const { loadDashboardHome } = await import("~/server/crypto-ghost/dashboard-home-loader");
  return loadDashboardHome(ev);
});

export default component$(() => {
  const dash = useDashboardAuth();
  const showSync = dash.value.showSyncDebug;
  const canFullSync = dash.value.canTriggerFullMarketSync;
  const data = useDashboardHomeLoader();
  const loc = useLocation();
  const L = loc.params.locale || "en-us";
  const base = `/${L}`;

  const syncBusy = useSignal(false);
  const syncError = useSignal("");
  const fullSyncBusy = useSignal(false);
  const fullSyncError = useSignal("");

  const runFullMarketSync = $(async () => {
    fullSyncBusy.value = true;
    fullSyncError.value = "";
    let willReload = false;
    try {
      const r = await triggerOwnerFullMarketSync();
      if (r.ok) {
        willReload = true;
        window.location.reload();
        return;
      }
      fullSyncError.value = r.error || "Sync fallido";
    } catch (e: unknown) {
      fullSyncError.value = e instanceof Error ? e.message : "Sync fallido";
    } finally {
      if (!willReload) fullSyncBusy.value = false;
    }
  });

  const runCmcSync = $(async () => {
    syncBusy.value = true;
    syncError.value = "";
    let willReload = false;
    try {
      const r = await triggerCmcMarketSync();
      if (r.ok) {
        willReload = true;
        window.location.reload();
        return;
      }
      syncError.value = r.error || "Sync failed";
    } catch (e: unknown) {
      syncError.value = e instanceof Error ? e.message : "Sync failed";
    } finally {
      if (!willReload) syncBusy.value = false;
    }
  });

  const w = data.value.wallet;
  const cacheEmpty = data.value.meme.length === 0 && data.value.ai.length === 0;
  const { hasPro } = data.value.access;
  const st = data.value.stats;
  const last = st.lastSync;
  const lastSyncFinishedLabel =
    last?.finishedAt != null
      ? new Date(last.finishedAt * 1000).toLocaleString(undefined, {
          dateStyle: "medium",
          timeStyle: "medium",
        })
      : last?.startedAt != null
        ? `En curso · inicio ${new Date(last.startedAt * 1000).toLocaleString(undefined, { timeStyle: "short" })}`
        : "—";
  const lastSyncDurationLabel =
    last?.finishedAt != null ? formatDurationMs(effectiveSyncDurationMs(last)) : null;

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get("pro") === "required") {
      const el = document.getElementById("pro-offer");
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });

  const quickLinks = [
    {
      href: `${base}/bubbles/`,
      title: "Crypto bubbles",
      desc: "Mapa por volumen, FDV y timeframes.",
      icon: LuBarChart3,
    },
    {
      href: `${base}/volume-coins/`,
      title: "Top volume",
      desc: showSync ? "Ranking 24h desde datos de mercado sincronizados." : "Ranking 24h por volumen.",
      icon: LuActivity,
    },
    {
      href: `${base}/trending-coins/`,
      title: "Trending",
      desc: data.value.trending.usedFallback ? "Proxy 7d % desde board volumen." : "Gainers / losers (ranking).",
      icon: LuSparkles,
    },
    {
      href: `${base}/tokens/`,
      title: "Todos los tokens",
      desc: showSync
        ? `${st.totalTokens.toLocaleString()} tokens en caché.`
        : `${st.totalTokens.toLocaleString()} tokens en la base.`,
      icon: LuLayers,
    },
    {
      href: `${base}/nfts/`,
      title: "NFT collections",
      desc:
        data.value.nftGlobal.ok && data.value.nftGlobal.hottestCount > 0
          ? `Explorar colecciones (snapshot · ${data.value.nftGlobal.hottestCount} hottest).`
          : "Colecciones y detalle por contrato y token ID.",
      icon: LuImage,
    },
    {
      href: `${base}/top-traders/`,
      title: "Traders",
      desc: "Watchlist de wallets rentables y vista cartera (Base/Eth).",
      icon: LuRadar,
    },
    {
      href: `${base}/notifications-settings/`,
      title: "Notificaciones",
      desc: "Push y preferencias de señales.",
      icon: LuBell,
    },
  ];

  const anySyncBusy = fullSyncBusy.value || syncBusy.value;

  return (
    <>
      {anySyncBusy ? (
        <div
          class="fixed inset-0 z-[250] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
          role="alertdialog"
          aria-busy="true"
          aria-live="polite"
          aria-label="Sincronización en curso"
        >
          <div class="w-full max-w-sm rounded-2xl border border-[#043234] bg-[#001a1c] px-6 py-8 shadow-2xl shadow-black/50 text-center space-y-4">
            <LuLoader2 class="mx-auto h-12 w-12 text-[#04E6E6] animate-spin" />
            <div>
              <p class="text-sm font-semibold text-white">
                {fullSyncBusy.value
                  ? "Sync completo en curso…"
                  : "Sincronizando mercado…"}
              </p>
              <p class="mt-2 text-xs text-slate-400 leading-relaxed">
                Actualizamos rankings de mercado y datos auxiliares. Puede tardar varios minutos; no cierres la pestaña.
              </p>
            </div>
          </div>
        </div>
      ) : null}
      <div class="max-w-6xl mx-auto space-y-10">
      <header class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p class="text-xs font-medium uppercase tracking-wider text-[#04E6E6]/80">Crypto Helper</p>
          <h1 class="text-3xl font-bold text-white mt-1">Overview</h1>
          <p class="text-gray-400 text-sm mt-2 max-w-xl leading-relaxed">
            {showSync ? (
              <>
                Mercado <strong class="text-gray-300">agregado</strong> (precio, pares DEX, analytics y swaps en ficha
                token), <strong class="text-gray-300">NFTs</strong> por contrato, burbujas, traders y señales en vivo para
                Pro.
              </>
            ) : (
              <>
                Mercado, NFTs, cartera Base, burbujas y señales — todo enlazado desde aquí.
              </>
            )}
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-2 text-xs text-gray-500">
          <span class="rounded-lg border border-[#043234] bg-[#001a1c] px-3 py-2 leading-snug">
            <span class="text-[10px] uppercase tracking-wide text-gray-600">Última actualización (sync)</span>
            <span class="block text-gray-300 mt-0.5 tabular-nums">{lastSyncFinishedLabel}</span>
            {lastSyncDurationLabel ? (
              <span class="block text-gray-500 mt-0.5">
                Duración: <span class="text-gray-400">{lastSyncDurationLabel}</span>
                <span class="text-gray-600"> · </span>
                Estado: <span class="text-gray-400">{last?.status ?? "—"}</span>
              </span>
            ) : (
              <span class="block text-gray-500 mt-0.5">
                Estado: <span class="text-gray-400">{last?.status ?? "—"}</span>
              </span>
            )}
          </span>
          {showSync ? (
            <a
              href="/api/crypto/sync/status"
              class="rounded-lg border border-[#043234] px-3 py-1.5 text-[#04E6E6] hover:bg-[#043234]/40 transition-colors"
              target="_blank"
              rel="noreferrer"
            >
              Estado de sincronización
            </a>
          ) : null}
          {canFullSync ? (
            <div class="flex flex-col gap-1 w-full sm:w-auto sm:items-end">
              <button
                type="button"
                disabled={fullSyncBusy.value}
                onClick$={runFullMarketSync}
                class="inline-flex items-center justify-center gap-2 rounded-lg border border-amber-500/50 bg-amber-500/15 px-3 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-500/25 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                title="Sincronización completa de mercado y datos auxiliares"
              >
                {fullSyncBusy.value ? (
                  <>
                    <LuLoader2 class="h-3.5 w-3.5 animate-spin" />
                    Sincronizando todo…
                  </>
                ) : (
                  <>
                    <LuRefreshCw class="h-3.5 w-3.5" />
                    Sync completo
                  </>
                )}
              </button>
              {fullSyncError.value ? (
                <p class="text-[11px] text-amber-400/95 max-w-xs text-right">{fullSyncError.value}</p>
              ) : null}
            </div>
          ) : null}
        </div>
      </header>

      {showSync && st.syncHistory.length > 0 ? (
        <section class="rounded-xl border border-[#043234] bg-[#001318]/80 overflow-hidden">
          <div class="px-4 py-3 border-b border-[#043234] flex flex-wrap items-center justify-between gap-2">
            <h2 class="text-sm font-semibold text-[#04E6E6]">Historial de sincronizaciones</h2>
            <span class="text-[10px] text-gray-500">Últimas {st.syncHistory.length} corridas</span>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs text-gray-400">
              <thead class="bg-[#001a1c]/90 text-[10px] uppercase tracking-wide text-gray-500">
                <tr>
                  <th class="px-4 py-2 font-medium">Fin</th>
                  <th class="px-4 py-2 font-medium">Duración</th>
                  <th class="px-4 py-2 font-medium">Estado</th>
                  <th class="px-4 py-2 font-medium">Origen</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#043234]/70">
                {st.syncHistory.map((row) => {
                  const fin =
                    row.finishedAt != null
                      ? new Date(row.finishedAt * 1000).toLocaleString(undefined, {
                          dateStyle: "short",
                          timeStyle: "medium",
                        })
                      : "—";
                  const dur =
                    row.finishedAt != null ? formatDurationMs(effectiveSyncDurationMs(row)) : "—";
                  return (
                    <tr key={row.id} class="hover:bg-[#001a1c]/50">
                      <td class="px-4 py-2 tabular-nums text-gray-300 whitespace-nowrap">{fin}</td>
                      <td class="px-4 py-2 tabular-nums">{dur}</td>
                      <td class="px-4 py-2">
                        <span
                          class={
                            row.status === "success"
                              ? "text-emerald-400/90"
                              : row.status === "error"
                                ? "text-rose-400/90"
                                : "text-amber-400/90"
                          }
                        >
                          {row.status}
                        </span>
                      </td>
                      <td class="px-4 py-2 max-w-[10rem] truncate" title={row.source ?? ""}>
                        {row.source ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {loc.url.searchParams.get("pro") === "required" ? (
        <div class="rounded-xl border border-amber-500/40 bg-amber-950/25 px-4 py-3 text-sm text-amber-100/95">
          Esta sección requiere plan <strong class="text-amber-200">Pro</strong>. Consulta los beneficios abajo o
          mejora a Pro en Overview o verifica tu pago.
        </div>
      ) : null}

      <section class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <div class="rounded-xl border border-[#043234] bg-gradient-to-br from-[#001a1c] to-[#000D0E] p-4">
          <p class="text-[11px] uppercase tracking-wide text-gray-500">Tokens indexados</p>
          <p class="text-2xl font-semibold text-white mt-1 tabular-nums">{st.totalTokens.toLocaleString()}</p>
          <p class="text-xs text-gray-500 mt-2">
            {showSync ? "Tokens en caché (todas las categorías)." : "Tokens en todas las categorías."}
          </p>
        </div>
        <div class="rounded-xl border border-[#043234] bg-[#001a1c]/80 p-4">
          <p class="text-[11px] uppercase tracking-wide text-gray-500">NFT hottest (sample)</p>
          <p class="text-2xl font-semibold text-[#04E6E6] mt-1 tabular-nums">
            {data.value.nftGlobal.ok ? data.value.nftGlobal.hottestCount : "—"}
          </p>
          <p class="text-xs text-gray-500 mt-2">
            {showSync ? (
              <Link href={`${base}/nfts/`} class="text-[#04E6E6]/90 hover:underline">
                Abrir NFTs →
              </Link>
            ) : (
              "Colecciones en caché."
            )}
          </p>
        </div>
        <div class="rounded-xl border border-[#043234] bg-[#001a1c]/80 p-4">
          <p class="text-[11px] uppercase tracking-wide text-gray-500">Whale alerts (24h)</p>
          <p class="text-2xl font-semibold text-[#04E6E6] mt-1 tabular-nums">{st.signals24h.whales}</p>
          <p class="text-xs text-gray-500 mt-2">{showSync ? "Señales guardadas en el servidor." : "Señales en tiempo casi real."}</p>
        </div>
        <div class="rounded-xl border border-[#043234] bg-[#001a1c]/80 p-4">
          <p class="text-[11px] uppercase tracking-wide text-gray-500">Trader signals (24h)</p>
          <p class="text-2xl font-semibold text-[#04E6E6] mt-1 tabular-nums">{st.signals24h.traders}</p>
          <p class="text-xs text-gray-500 mt-2">Smart money / traders.</p>
        </div>
        <div class="rounded-xl border border-[#043234] bg-[#001a1c]/80 p-4">
          <p class="text-[11px] uppercase tracking-wide text-gray-500">USDT smart (24h)</p>
          <p class="text-2xl font-semibold text-[#04E6E6] mt-1 tabular-nums">{st.signals24h.smart}</p>
          <p class="text-xs text-gray-500 mt-2">
            {showSync ? "Watcher + análisis on-chain." : "Análisis on-chain."}
          </p>
        </div>
      </section>

      <section class="rounded-xl border border-[#043234]/80 bg-[#001318]/50 p-4 md:p-5">
        <h2 class="text-sm font-semibold text-[#04E6E6] mb-3">Qué incluye este dashboard</h2>
        <ul class="grid gap-2 sm:grid-cols-2 text-xs text-gray-400 leading-relaxed">
          <li>
            <strong class="text-gray-300">Tokens</strong> — tablas por categoría, ficha con cotización, precio y pares
            DEX, analytics opcional, gráfico TradingView, swaps y tabs de holders/traders.
          </li>
          <li>
            <strong class="text-gray-300">NFTs</strong> — listado hottest/top, colección por{" "}
            <code class="text-gray-500">0x…</code> (metadata + stats + grid) y detalle por{" "}
            <code class="text-gray-500">tokenId</code>.
          </li>
          <li>
            <strong class="text-gray-300">Traders &amp; señales</strong> — watchlist, cartera snapshot, feeds smart /
            DEX / whales y contadores 24h arriba.
          </li>
          <li>
            <strong class="text-gray-300">Pro</strong> — DB insight (IA), señales en vivo (smart money / ballenas) y alertas
            smart USDT. Se desbloquea <strong class="text-gray-300">enviando USDT</strong> y verificando la transacción
            en <strong class="text-gray-300">Upgrade Pro</strong> (barra superior); no es activación manual por admin.
            Las notificaciones push del menú son aparte (solo dispositivo y preferencias).
          </li>
        </ul>
        {showSync && data.value.nftGlobal.error ? (
          <p class="mt-3 text-[11px] text-amber-400/85">
            NFT snapshot: {data.value.nftGlobal.error.slice(0, 160)}
            {data.value.nftGlobal.error.length > 160 ? "…" : ""}
          </p>
        ) : null}
      </section>

      <section class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {quickLinks.map((q) => {
          const Icon = q.icon ?? LuLayers;
          return (
            <Link
              key={q.href}
              href={q.href}
              class="group rounded-xl border border-[#043234] bg-[#001a1c]/60 p-4 transition hover:border-[#04E6E6]/35 hover:bg-[#001a1c]"
            >
              <div class="flex items-start justify-between gap-2">
                <span class="rounded-lg bg-[#04E6E6]/10 p-2 text-[#04E6E6]">
                  <Icon class="h-5 w-5" />
                </span>
                <LuArrowRight class="h-4 w-4 text-gray-600 group-hover:text-[#04E6E6] transition-colors shrink-0 mt-1" />
              </div>
              <h3 class="font-semibold text-white mt-3">{q.title}</h3>
              <p class="text-xs text-gray-500 mt-1 leading-relaxed">{q.desc}</p>
            </Link>
          );
        })}
      </section>

      {!hasPro ? (
        <section
          id="pro-offer"
          class="rounded-2xl border border-amber-500/30 bg-[#1a1408]/50 p-6 md:p-8 scroll-mt-24"
        >
          <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div class="flex gap-4">
              <span class="rounded-xl bg-amber-500/15 p-3 text-amber-300 h-fit">
                <LuRadio class="h-6 w-6" />
              </span>
              <div>
                <h2 class="text-xl font-bold text-white">Crypto Helper Pro</h2>
                <p class="text-sm text-gray-400 mt-2 max-w-lg leading-relaxed">
                  Con Pro obtienes <strong class="text-gray-300">DB insight (IA)</strong> sobre datos agregados en el
                  servidor, <strong class="text-gray-300">señales en vivo</strong> (smart money y ballenas) y{" "}
                  <strong class="text-gray-300">alertas smart USDT</strong> en los paneles del menú. Para activarlo{" "}
                  <strong class="text-gray-300">debes enviar USDT</strong>: importe, red y dirección de tesorería salen en
                  el modal; luego verificas la transacción ahí mismo — no sustituye abrir las{" "}
                  <strong class="text-gray-300">notificaciones push</strong> del menú: esas solo registran tu dispositivo y
                  preferencias; el acceso Pro depende del pago verificado.
                </p>
              </div>
            </div>
            <div class="text-sm text-gray-400 md:text-right shrink-0 max-w-xs md:max-w-sm">
              <p class="text-amber-200/90 font-medium">Cómo activar Pro</p>
              <p class="mt-1 leading-relaxed">
                Inicia sesión, abre <strong class="text-gray-300">Upgrade Pro</strong> en la barra (menú de cuenta),
                elige red, envía el USDT indicado y completa la verificación en el modal. Tras acreditarse, tu cuenta
                pasa a Pro automáticamente.
              </p>
            </div>
          </div>
        </section>
      ) : (
        <section class="rounded-xl border border-[#04E6E6]/25 bg-[#04E6E6]/5 px-4 py-3 text-sm text-[#04E6E6]/95">
          Plan <strong>Pro</strong> activo — DB insight, señales en vivo y alertas USDT desbloqueados (pago verificado).
        </section>
      )}

      {cacheEmpty ? (
        <div class="flex flex-wrap items-center gap-3 rounded-xl border border-[#043234] bg-[#001a1c]/80 px-4 py-3">
          <span class="text-sm text-slate-400">
            {showSync ? (
              <>Sin datos de mercado aún — sincroniza desde aquí (~1–2 min, usa tu sesión).</>
            ) : (
              <>Sin datos de mercado aún. Vuelve más tarde o contacta soporte si persiste.</>
            )}
          </span>
          <button
            type="button"
            disabled={syncBusy.value}
            onClick$={runCmcSync}
            class="inline-flex items-center gap-2 rounded-lg bg-[#04E6E6] px-4 py-2 text-sm font-semibold text-[#001a1c] shadow-md shadow-[#04E6E6]/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {syncBusy.value ? (
              <>
                <LuLoader2 class="h-4 w-4 animate-spin" />
                Syncing…
              </>
            ) : (
              <>
                <LuRefreshCw class="h-4 w-4" />
                Sync market rankings
              </>
            )}
          </button>
          {syncError.value ? (
            <p class="w-full text-sm text-amber-400/95">
              {showSync ? syncError.value : "No se pudo completar la sincronización. Inténtalo de nuevo más tarde."}
            </p>
          ) : null}
        </div>
      ) : null}

      <div class="grid gap-8 lg:grid-cols-2">
        <section class="rounded-xl border border-[#043234] overflow-hidden bg-[#000D0E]/80">
          <div class="flex items-center justify-between px-4 py-3 border-b border-[#043234]">
            <h2 class="text-sm font-semibold text-white">Top volumen (24h)</h2>
            <Link href={`${base}/volume-coins/`} class="text-xs text-[#04E6E6] hover:underline">
              Ver tabla
            </Link>
          </div>
          <ul class="divide-y divide-[#043234]/80">
            {data.value.topVolume.length === 0 ? (
              <li class="px-4 py-6 text-sm text-gray-500">
              {showSync ? "Sin datos — ejecuta sync." : "Sin datos todavía."}
            </li>
            ) : (
              data.value.topVolume.map((t: any) => (
                <li key={t.id}>
                  <Link
                    href={`/${L}/token/${t.id}/`}
                    class="flex items-center gap-3 px-4 py-3 hover:bg-[#001a1c]/90 transition-colors"
                  >
                    <TokenLogoImg src={String(t.logo ?? "")} symbol={String(t.symbol)} size={36} />
                    <div class="min-w-0 flex-1">
                      <div class="font-medium text-white truncate">
                        {t.name} <span class="text-gray-500 text-sm">({t.symbol})</span>
                      </div>
                      <div class="text-xs text-gray-500 truncate">{t.network}</div>
                    </div>
                    <div class="text-right shrink-0">
                      <div class="text-[#04E6E6] text-sm">${formatTokenUsdPrice(t.price)}</div>
                      <div class="text-gray-500 text-xs">{formatUsdLiquidity(t.volume)}</div>
                    </div>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </section>

        <section class="rounded-xl border border-[#043234] overflow-hidden bg-[#000D0E]/80">
          <div class="flex items-center justify-between px-4 py-3 border-b border-[#043234]">
            <h2 class="text-sm font-semibold text-white">Trending · movers 7d</h2>
            <Link href={`${base}/trending-coins/`} class="text-xs text-[#04E6E6] hover:underline">
              Ver tabla
            </Link>
          </div>
          {data.value.trending.usedFallback ? (
            <p class="px-4 py-2 text-[11px] text-gray-500 border-b border-[#043234]/60">
              Ranking aproximado desde el board de volumen (mismos datos).
            </p>
          ) : null}
          <ul class="divide-y divide-[#043234]/80">
            {data.value.trending.rows.length === 0 ? (
              <li class="px-4 py-6 text-sm text-gray-500">
              {showSync ? "Sin datos — ejecuta sync." : "Sin datos todavía."}
            </li>
            ) : (
              data.value.trending.rows.map((t: any) => (
                <li key={`${t.id}-trend`}>
                  <Link
                    href={`/${L}/token/${t.id}/`}
                    class="flex items-center gap-3 px-4 py-3 hover:bg-[#001a1c]/90 transition-colors"
                  >
                    <TokenLogoImg src={String(t.logo ?? "")} symbol={String(t.symbol)} size={36} />
                    <div class="min-w-0 flex-1">
                      <div class="font-medium text-white truncate">
                        {t.name} <span class="text-gray-500 text-sm">({t.symbol})</span>
                      </div>
                      <div class="text-xs text-amber-200/80">7d {t.percentChange7d ?? "—"}%</div>
                    </div>
                    <div class="text-right shrink-0 text-sm text-[#04E6E6]">
                      ${formatTokenUsdPrice(t.price)}
                    </div>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>

      {w.address ? (
        <section class="rounded-xl border border-[#043234] bg-[#001a1c] p-4">
          <h2 class="text-lg font-semibold mb-1">Tu cartera (Base)</h2>
          <p class="text-xs text-gray-500 font-mono break-all mb-3">{w.address}</p>
          {w.authProvider === "metamask" ? (
            <p class="text-xs text-gray-500 mb-2">Sesión MetaMask — cartera solo lectura.</p>
          ) : (
            <p class="text-xs text-gray-500 mb-2">Cuenta email — dirección gestionada.</p>
          )}
          {w.walletTokensError ? (
            <p class="text-sm text-amber-400/90">
              {showSync ? (
                <>
                  No se pudieron cargar los últimos tokens de Base ({w.walletTokensError}). Se muestra la caché del
                  último sync.
                </>
              ) : (
                <>No se pudieron cargar los últimos balances de Base. Los datos mostrados son los guardados en caché.</>
              )}
            </p>
          ) : w.tokens.length === 0 ? (
            <p class="text-sm text-gray-500">Sin ERC-20 en Base (o indexando).</p>
          ) : (
            <ul class="divide-y divide-[#043234] text-sm">
              {w.tokens.map((t) => (
                <li key={t.tokenAddress} class="flex items-center justify-between gap-4 py-2">
                  <span class="flex min-w-0 items-center gap-2">
                    <TokenLogoImg src={t.logo} symbol={t.symbol} size={28} />
                    <span class="font-medium text-white">{t.symbol}</span>
                  </span>
                  <span class="text-[#04E6E6] shrink-0">{t.usdLabel}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      <section>
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold">Meme</h2>
          <Link href={`${base}/meme-coins/`} class="text-sm text-[#04E6E6] hover:underline">
            Ver vertical →
          </Link>
        </div>
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.value.meme.length === 0 ? (
            <p class="text-gray-500 col-span-full text-sm">
              {showSync ? (
                <>
                  Aún no hay memes en la base. Ejecuta la sincronización desde arriba o espera al job diario.
                </>
              ) : (
                "Aún no hay memes en la base."
              )}
            </p>
          ) : (
            data.value.meme.map((t: any) => (
              <Link
                key={t.id}
                href={`/${L}/token/${t.id}/`}
                class="rounded-xl border border-[#043234] bg-[#001a1c] p-4 flex gap-3 items-center hover:border-[#04E6E6]/40 transition-colors"
              >
                <TokenLogoImg src={String(t.logo ?? "")} symbol={String(t.symbol)} size={40} />
                <div class="min-w-0">
                  <div class="font-medium truncate">
                    {t.name} <span class="text-gray-500 text-sm">({t.symbol})</span>
                  </div>
                  <div class="text-sm text-[#04E6E6]">${formatTokenUsdPrice(t.price)}</div>
                  <div class="text-xs text-gray-500 truncate">{t.network}</div>
                </div>
              </Link>
            ))
          )}
        </div>
      </section>

      <section>
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold">AI &amp; big data</h2>
          <Link href={`${base}/ai-coins/`} class="text-sm text-[#04E6E6] hover:underline">
            Ver vertical →
          </Link>
        </div>
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {data.value.ai.length === 0 ? (
            <p class="text-gray-500 col-span-full text-sm">
              {showSync ? "Sin filas AI — el mismo sync las rellena." : "Sin tokens AI en la base todavía."}
            </p>
          ) : null}
          {data.value.ai.map((t: any) => (
            <Link
              key={t.id}
              href={`/${L}/token/${t.id}/`}
              class="rounded-lg border border-[#043234] bg-[#001a1c] p-3 text-sm flex gap-2 items-center hover:border-[#04E6E6]/40 transition-colors"
            >
              <TokenLogoImg src={String(t.logo ?? "")} symbol={String(t.symbol)} size={36} />
              <div class="min-w-0 flex-1">
                <div class="font-medium truncate">
                  {t.name} <span class="text-gray-500">({t.symbol})</span>
                </div>
                <div class="text-[#04E6E6]">${formatTokenUsdPrice(t.price)}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>

    </div>
    </>
  );
});
