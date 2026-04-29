import { component$, useSignal, $, useVisibleTask$ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";
import { Link, routeLoader$, useLocation } from "@builder.io/qwik-city";
import {
  LuActivity,
  LuArrowRight,
  LuBarChart3,
  LuBell,
  LuBot,
  LuCoins,
  LuDollarSign,
  LuImage,
  LuLayers,
  LuLoader2,
  LuRadar,
  LuRadio,
  LuRefreshCw,
  LuSparkles,
  LuWaves,
} from "@qwikest/icons/lucide";
import { TokenLogoImg } from "~/components/crypto-dashboard/token-logo";
import { triggerCmcMarketSync, triggerOwnerFullMarketSync } from "~/server/crypto-ghost-actions";
import { useDashboardAuth } from "../../layout";
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
  const canSeeSyncMeta = showSync || canFullSync;
  const data = useDashboardHomeLoader();
  const loc = useLocation();
  const L = loc.params.locale || "en-us";
  const base = `/${L}`;

  const syncBusy = useSignal(false);
  const syncError = useSignal("");
  const fullSyncBusy = useSignal(false);
  const fullSyncError = useSignal("");
  const showMoreSections = useSignal(false);
  const listPages = useSignal<Record<string, number>>({
    topVolume: 1,
    trending: 1,
    meme: 1,
    ai: 1,
    earlybird: 1,
    mostVisited: 1,
    gaming: 1,
    mineable: 1,
  });

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
      syncError.value = r.error || "No se pudo actualizar";
    } catch (e: unknown) {
      syncError.value = e instanceof Error ? e.message : "No se pudo actualizar";
    } finally {
      if (!willReload) syncBusy.value = false;
    }
  });
  const goProOffer = $(() => {
    const el = document.getElementById("pro-offer");
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  const w = data.value.wallet;
  const cacheEmpty = data.value.meme.length === 0 && data.value.ai.length === 0;
  const { hasPro } = data.value.access;
  const st = data.value.stats;
  const pulse = data.value.marketPulse;
  const showBtcDominance = (pulse.btcDominance ?? 0) > 0;
  const fearGreedValue = Math.max(0, Math.min(100, pulse.fearGreed ?? 50));
  const altSeasonValue = Math.max(0, Math.min(100, pulse.altcoinSeason ?? 50));
  const avgRsiValue = Math.max(0, Math.min(100, pulse.avgRsi ?? 50));
  const fearGreedLabel =
    fearGreedValue >= 75
      ? "Extreme greed"
      : fearGreedValue >= 60
        ? "Greed"
        : fearGreedValue >= 40
          ? "Neutral"
          : fearGreedValue >= 25
            ? "Fear"
            : "Extreme fear";
  const rsiLabel = avgRsiValue >= 70 ? "Overbought" : avgRsiValue <= 30 ? "Oversold" : "Neutral";
  const fearGreedNeedleDeg = 180 + fearGreedValue * 1.8;
  const fgCenterX = 110;
  const fgCenterY = 110;
  const fgRadius = 72;
  const fgNeedleX = fgCenterX + fgRadius * Math.cos((fearGreedNeedleDeg * Math.PI) / 180);
  const fgNeedleY = fgCenterY + fgRadius * Math.sin((fearGreedNeedleDeg * Math.PI) / 180);
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
      desc: "Ranking 24h por volumen.",
      icon: LuActivity,
    },
    {
      href: `${base}/trending-coins/`,
      title: "Trending",
      desc: data.value.trending.usedFallback ? "Mayores subidas y bajadas (7 días)." : "Mayores subidas y bajadas.",
      icon: LuSparkles,
    },
    {
      href: `${base}/earlybird-coins/`,
      title: "New listings",
      desc: "Nuevas monedas listadas recientemente.",
      icon: LuSparkles,
    },
    {
      href: `${base}/meme-coins/`,
      title: "Meme",
      desc: "Monedas meme destacadas.",
      icon: LuCoins,
    },
    {
      href: `${base}/ai-coins/`,
      title: "AI & big data",
      desc: "Monedas de inteligencia artificial y datos.",
      icon: LuBot,
    },
    {
      href: `${base}/gaming-coins/`,
      title: "Gaming",
      desc: "Monedas del ecosistema gaming.",
      icon: LuActivity,
    },
    {
      href: `${base}/mineable-coins/`,
      title: "Mineable",
      desc: "Monedas minables.",
      icon: LuLayers,
    },
    {
      href: `${base}/most-visit-coins/`,
      title: "Most visited",
      desc: "Monedas más visitadas por usuarios.",
      icon: LuRadar,
    },
    {
      href: `${base}/tokens/`,
      title: "Todos los tokens",
      desc: `${st.totalTokens.toLocaleString()} tokens disponibles.`,
      icon: LuLayers,
    },
    {
      href: `${base}/nfts/`,
      title: "NFT collections",
      desc:
        data.value.nftGlobal.ok && data.value.nftGlobal.hottestCount > 0
          ? `Explorar colecciones destacadas (${data.value.nftGlobal.hottestCount}).`
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
      href: `${base}/top-traders-swaps/`,
      title: "By swap activity",
      desc: "Ranking de traders por actividad de swaps.",
      icon: LuActivity,
    },
    {
      href: `${base}/top-traders-whales/`,
      title: "Top whales",
      desc: "Monitoreo de wallets ballena.",
      icon: LuWaves,
    },
    {
      href: `${base}/block/`,
      title: "Block",
      desc: "Señales y actividad on-chain reciente.",
      icon: LuLayers,
    },
    {
      href: `${base}/notifications-settings/`,
      title: "Notificaciones",
      desc: "Push y preferencias de señales.",
      icon: LuBell,
    },
    {
      href: `${base}/db-insight/`,
      title: "DB insight",
      desc: "Análisis asistido para usuarios Pro.",
      icon: LuBot,
      requiresPro: true,
    },
    {
      href: `${base}/traders-signals/`,
      title: "Smart money",
      desc: "Señales en vivo de smart money.",
      icon: LuSparkles,
      requiresPro: true,
    },
    {
      href: `${base}/whales-signals/`,
      title: "Whale alerts",
      desc: "Alertas en vivo de ballenas.",
      icon: LuWaves,
      requiresPro: true,
    },
    {
      href: `${base}/smart-signals/`,
      title: "USDT smart",
      desc: "Alertas inteligentes de USDT.",
      icon: LuDollarSign,
      requiresPro: true,
    },
  ];

  const anySyncBusy = fullSyncBusy.value || syncBusy.value;
  const PAGE_SIZE = 10;
  const pageOf = (key: string) => Math.max(1, listPages.value[key] ?? 1);
  const totalPagesFor = (rows: any[]) => Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pagedRows = (key: string, rows: any[]) => {
    const page = Math.min(pageOf(key), totalPagesFor(rows));
    const start = (page - 1) * PAGE_SIZE;
    return rows.slice(start, start + PAGE_SIZE);
  };
  const changePage = $((key: string, totalRows: number, delta: number) => {
    const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));
    const current = Math.max(1, listPages.value[key] ?? 1);
    const next = Math.max(1, Math.min(totalPages, current + delta));
    listPages.value = { ...listPages.value, [key]: next };
  });
  const prioritizedQuickLinks = quickLinks.slice(0, 8);
  const secondaryQuickLinks = quickLinks.slice(8);
  const visibleQuickLinks = showMoreSections.value
    ? [...prioritizedQuickLinks, ...secondaryQuickLinks]
    : prioritizedQuickLinks;
  const HelpTip = (text: string, positionClass: string = "right-2 top-2") => (
    <span class={`pointer-events-none absolute z-10 group ${positionClass}`}>
      <span
        class="pointer-events-auto inline-flex h-5 w-5 items-center justify-center rounded-full border border-[#0a5b5f] bg-[#002629] text-[11px] font-bold text-[#7af4f4] shadow-sm shadow-black/30"
        aria-label="Más información"
      >
        ?
      </span>
      <span class="pointer-events-none absolute right-0 top-6 w-52 rounded-md border border-[#0a5b5f] bg-[#001a1c] px-2.5 py-2 text-[11px] leading-relaxed text-gray-300 opacity-0 shadow-xl transition-opacity duration-150 group-hover:opacity-100">
        {text}
      </span>
    </span>
  );
  const InlineHelpTip = (text: string) => (
    <span class="relative group inline-flex align-middle ml-2">
      <span
        class="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[#0a5b5f] bg-[#002629] text-[11px] font-bold text-[#7af4f4] shadow-sm shadow-black/30"
        aria-label="Más información"
      >
        ?
      </span>
      <span class="pointer-events-none absolute left-1/2 top-6 z-20 w-52 -translate-x-1/2 rounded-md border border-[#0a5b5f] bg-[#001a1c] px-2.5 py-2 text-[11px] leading-relaxed text-gray-300 opacity-0 shadow-xl transition-opacity duration-150 group-hover:opacity-100">
        {text}
      </span>
    </span>
  );

  return (
    <>
      {anySyncBusy ? (
        <div
          class="fixed inset-0 z-[250] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
          role="alertdialog"
          aria-busy="true"
          aria-live="polite"
          aria-label="Actualización en curso"
        >
          <div class="w-full max-w-sm rounded-2xl border border-[#043234] bg-[#001a1c] px-6 py-8 shadow-2xl shadow-black/50 text-center space-y-4">
            <LuLoader2 class="mx-auto h-12 w-12 text-[#04E6E6] animate-spin" />
            <div>
              <p class="text-sm font-semibold text-white">
                {fullSyncBusy.value
                  ? "Actualizando todo…"
                  : "Actualizando mercado…"}
              </p>
              <p class="mt-2 text-xs text-slate-400 leading-relaxed">
                Actualizamos rankings de mercado y datos auxiliares. Puede tardar varios minutos; no cierres la pestaña.
              </p>
            </div>
          </div>
        </div>
      ) : null}
      <div class="w-full max-w-[2200px] mx-auto space-y-10 2xl:space-y-12 px-1 2xl:px-3">
      <header class="flex flex-col gap-4 2xl:gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p class="text-xs font-medium uppercase tracking-wider text-[#04E6E6]/80">Crypto Helper</p>
          <h1 class="text-3xl 2xl:text-4xl font-bold text-white mt-1">Overview</h1>
          <p class="text-gray-400 text-sm 2xl:text-base mt-2 max-w-xl 2xl:max-w-2xl leading-relaxed">
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
          {canSeeSyncMeta ? (
            <span class="rounded-lg border border-[#043234] bg-[#001a1c] px-3 py-2 leading-snug">
              <span class="text-[10px] uppercase tracking-wide text-gray-600">Última actualización</span>
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
          ) : null}
          {showSync ? (
            <a
              href="/api/crypto/sync/status"
              class="rounded-lg border border-[#043234] px-3 py-1.5 text-[#04E6E6] hover:bg-[#043234]/40 transition-colors"
              target="_blank"
              rel="noreferrer"
            >
              Estado de actualización
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
                    Actualizar todo
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

      <div class="space-y-3 2xl:space-y-4">
        <section class="grid gap-3 2xl:gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
          {visibleQuickLinks.map((q) => {
            const Icon = q.icon ?? LuLayers;
          const locked = q.requiresPro && !hasPro;
          return locked ? (
            <button
              key={q.href}
              type="button"
              onClick$={goProOffer}
                class="group relative w-full text-left rounded-xl border border-amber-500/35 bg-amber-950/10 p-4 2xl:p-5 transition hover:border-amber-400/50 hover:bg-amber-950/20"
            >
              {HelpTip("Esta sección es Pro. Suscríbete para desbloquearla.")}
              <div class="flex items-start justify-between gap-2 pr-8">
                <span class="rounded-lg bg-amber-500/20 p-2 text-amber-300">
                  <Icon class="h-5 w-5" />
                </span>
                <span class="rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-200">
                  PRO
                </span>
              </div>
              <h3 class="font-semibold text-white mt-3">{q.title}</h3>
              <p class="pr-7 text-xs text-amber-100/75 mt-1 leading-relaxed">Disponible con suscripción Pro.</p>
            </button>
          ) : (
            <Link
              key={q.href}
              href={q.href}
                class="group relative rounded-xl border border-[#043234] bg-[#001a1c]/60 p-4 2xl:p-5 transition hover:border-[#04E6E6]/35 hover:bg-[#001a1c]"
            >
              {HelpTip(q.desc)}
              <div class="flex items-start justify-between gap-2 pr-8">
                <span class="rounded-lg bg-[#04E6E6]/10 p-2 text-[#04E6E6]">
                  <Icon class="h-5 w-5" />
                </span>
              </div>
              <h3 class="font-semibold text-white mt-3">{q.title}</h3>
              <p class="pr-7 text-xs text-gray-500 mt-1 leading-relaxed">{q.desc}</p>
              <LuArrowRight class="absolute bottom-4 right-4 h-4 w-4 text-gray-600 transition-colors group-hover:text-[#04E6E6]" />
            </Link>
          );
          })}
        </section>
        {secondaryQuickLinks.length > 0 ? (
          <div class="flex justify-center">
            <button
              type="button"
              onClick$={() => {
                showMoreSections.value = !showMoreSections.value;
              }}
              class="rounded-lg border border-[#043234] bg-[#001a1c]/70 px-3 py-1.5 text-xs font-medium text-[#04E6E6] transition hover:border-[#04E6E6]/40 hover:bg-[#043234]/40"
            >
              {showMoreSections.value ? "Ver menos secciones" : `Ver más secciones (${secondaryQuickLinks.length})`}
            </button>
          </div>
        ) : null}
      </div>

      <section class="overflow-x-auto pb-1">
        <div class={`grid gap-3 ${showBtcDominance ? "min-w-[980px] grid-cols-5" : "min-w-[780px] grid-cols-4"}`}>
          <article class="relative rounded-xl border border-[#043234] bg-[#001a1c]/80 p-3">
            {HelpTip(
              pulse.hasGlobalMetrics
                ? "Capitalización global real desde CoinMarketCap global-metrics."
                : "Capitalización total de las monedas que ves en esta app.",
            )}
            <p class="text-[10px] uppercase tracking-wide text-gray-500">
              {pulse.hasGlobalMetrics ? "Market Cap (global)" : "Market Cap (sample)"}
            </p>
            <p class="text-lg font-semibold text-white mt-1 tabular-nums">${formatUsdBalance(pulse.marketCap)}</p>
            <p class="text-[11px] text-gray-500 mt-1">
              {pulse.hasGlobalMetrics && pulse.activeCryptocurrencies > 0
                ? `${pulse.activeCryptocurrencies.toLocaleString()} cryptos activas`
                : `${pulse.sampleSize.toLocaleString()} monedas analizadas`}
            </p>
          </article>
          <article class="relative rounded-xl border border-[#043234] bg-[#001a1c]/80 p-3">
            {HelpTip(
              pulse.hasGlobalMetrics
                ? "Volumen global real de 24h desde CoinMarketCap global-metrics."
                : "Volumen de 24h sumado de las monedas mostradas.",
            )}
            <p class="text-[10px] uppercase tracking-wide text-gray-500">
              {pulse.hasGlobalMetrics ? "Volume 24h (global)" : "Volume 24h (sample)"}
            </p>
            <p class="text-lg font-semibold text-white mt-1 tabular-nums">${formatUsdBalance(pulse.volume24h)}</p>
            <p class="text-[11px] text-gray-500 mt-1">
              {pulse.hasGlobalMetrics ? "Fuente: CoinMarketCap" : "Total de esta vista"}
            </p>
          </article>
          <article class="relative rounded-xl border border-[#043234] bg-[#001a1c]/80 p-3">
            {HelpTip("Cantidad de monedas que suben vs bajan en 24h.")}
            <p class="text-[10px] uppercase tracking-wide text-gray-500">Breadth 24h</p>
            <p class="text-lg font-semibold text-white mt-1 tabular-nums">
              {pulse.advanced}/{pulse.declined}
            </p>
            <p class="text-[11px] text-gray-500 mt-1">Suben / bajan</p>
          </article>
          {showBtcDominance ? (
            <article class="relative rounded-xl border border-[#043234] bg-[#001a1c]/80 p-3">
              {HelpTip("Porcentaje del mercado que representa Bitcoin.")}
              <p class="text-[10px] uppercase tracking-wide text-gray-500">BTC dominance</p>
              <p class="text-lg font-semibold text-white mt-1 tabular-nums">{pulse.btcDominance!.toFixed(2)}%</p>
              <p class="text-[11px] text-gray-500 mt-1">Participación de Bitcoin</p>
            </article>
          ) : null}
          <article class="relative rounded-xl border border-[#043234] bg-[#001a1c]/80 p-3">
            {HelpTip("Promedio simple de variación de precio en 24h del universo visible.")}
            <p class="text-[10px] uppercase tracking-wide text-gray-500">Average crypto change 24h</p>
            <p
              class={`text-lg font-semibold mt-1 tabular-nums ${
                pulse.avg24hChange > 0 ? "text-emerald-300" : pulse.avg24hChange < 0 ? "text-rose-300" : "text-white"
              }`}
            >
              {pulse.avg24hChange > 0 ? "+" : ""}
              {pulse.avg24hChange.toFixed(2)}%
            </p>
            <p class="text-[11px] text-gray-500 mt-1">Promedio simple del universo</p>
          </article>
        </div>
      </section>

      <section class="grid gap-3 2xl:gap-4 md:grid-cols-3">
        <article class="relative rounded-xl border border-[#043234] bg-[#001a1c]/80 p-4 2xl:p-5">
          {HelpTip("Indicador de ánimo del mercado basado en movimiento reciente de precios.")}
          <p class="text-sm font-semibold text-white">Fear &amp; Greed</p>
          <div class="mt-2 flex justify-center">
            <div class="relative h-[122px] w-[220px]">
              <svg viewBox="0 0 220 130" class="h-full w-full">
                <path d="M38 110 A72 72 0 0 1 59 59" fill="none" stroke="#f43f5e" stroke-width="9" stroke-linecap="round" />
                <path d="M64 53 A72 72 0 0 1 103 38" fill="none" stroke="#f59e0b" stroke-width="9" stroke-linecap="round" />
                <path d="M117 38 A72 72 0 0 1 156 53" fill="none" stroke="#84cc16" stroke-width="9" stroke-linecap="round" />
                <path d="M161 59 A72 72 0 0 1 182 110" fill="none" stroke="#34d399" stroke-width="9" stroke-linecap="round" />
                <circle cx={fgNeedleX} cy={fgNeedleY} r="6.5" fill="#0b0f14" stroke="#f8fafc" stroke-width="2" />
              </svg>
              <div class="absolute inset-x-0 bottom-1 text-center">
                <p class="text-4xl font-bold leading-none text-white tabular-nums">{fearGreedValue.toFixed(0)}</p>
                <p class="mt-1 text-xs text-gray-400">{fearGreedLabel}</p>
              </div>
            </div>
          </div>
        </article>

        <article class="relative rounded-xl border border-[#043234] bg-[#001a1c]/80 p-4 2xl:p-5">
          {HelpTip("Mide si las altcoins están rindiendo mejor que Bitcoin.")}
          <p class="text-sm font-semibold text-white">Altcoin Season</p>
          <div class="mt-3 flex items-end justify-between">
            <p class="text-4xl font-bold text-white tabular-nums leading-none">
              {altSeasonValue.toFixed(0)}
              <span class="text-2xl text-gray-500">/100</span>
            </p>
            <span class="text-xs text-gray-400">{altSeasonValue >= 50 ? "Altcoin" : "Bitcoin"}</span>
          </div>
          <div class="mt-3 relative h-2 rounded-full bg-[#05282a]">
            <div class="absolute inset-y-0 left-0 w-1/2 rounded-l-full bg-amber-500/90" />
            <div class="absolute inset-y-0 right-0 w-1/2 rounded-r-full bg-indigo-500/90" />
            <span
              class="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full border-2 border-[#001a1c] bg-white shadow"
              style={{ left: `calc(${altSeasonValue}% - 7px)` }}
            />
          </div>
          <div class="mt-2 flex justify-between text-[11px] text-gray-500">
            <span>Bitcoin</span>
            <span>Altcoin</span>
          </div>
        </article>

        <article class="relative rounded-xl border border-[#043234] bg-[#001a1c]/80 p-4 2xl:p-5">
          {HelpTip("Muestra si el mercado está en zona de sobrecompra o sobreventa.")}
          <p class="text-sm font-semibold text-white">Average Crypto RSI</p>
          <div class="mt-3 flex items-center justify-between">
            <p class="text-4xl font-bold text-white tabular-nums">{avgRsiValue.toFixed(2)}</p>
            <span class="text-xs text-gray-400">{rsiLabel}</span>
          </div>
          <div class="mt-3 relative h-2 rounded-full bg-[#05282a]">
            <div class="absolute inset-y-0 left-0 w-[30%] rounded-l-full bg-emerald-400/90" />
            <div class="absolute inset-y-0 left-[30%] w-[40%] bg-slate-400/80" />
            <div class="absolute inset-y-0 right-0 w-[30%] rounded-r-full bg-rose-400/90" />
            <span
              class="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full border-2 border-[#001a1c] bg-white shadow"
              style={{ left: `calc(${avgRsiValue}% - 7px)` }}
            />
          </div>
          <div class="mt-2 flex justify-between text-[11px] text-gray-500">
            <span>Oversold</span>
            <span>Overbought</span>
          </div>
        </article>
      </section>

      {showSync && st.syncHistory.length > 0 ? (
        <section class="rounded-xl border border-[#043234] bg-[#001318]/80 overflow-hidden">
          <div class="px-4 py-3 border-b border-[#043234] flex flex-wrap items-center justify-between gap-2">
            <h2 class="text-sm font-semibold text-[#04E6E6]">Historial de actualizaciones</h2>
            <span class="text-[10px] text-gray-500">Últimas {st.syncHistory.length} actualizaciones</span>
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
                Actualizando…
              </>
            ) : (
              <>
                <LuRefreshCw class="h-4 w-4" />
                Actualizar mercado
              </>
            )}
          </button>
          {syncError.value ? (
            <p class="w-full text-sm text-amber-400/95">
              {showSync ? syncError.value : "No se pudo completar la actualización. Inténtalo de nuevo más tarde."}
            </p>
          ) : null}
        </div>
      ) : null}

      <div class="grid gap-8 2xl:gap-10 lg:grid-cols-2 2xl:[grid-template-columns:repeat(auto-fit,minmax(320px,1fr))]">
        <section class="relative rounded-xl border border-[#043234] overflow-hidden bg-[#000D0E]/80">
          <div class="flex items-center justify-between px-4 py-3 border-b border-[#043234]">
            <h2 class="text-sm font-semibold text-white">
              Top volumen (24h)
              {InlineHelpTip("Monedas con mayor volumen de trading en 24h.")}
            </h2>
            <Link href={`${base}/volume-coins/`} class="text-xs text-[#04E6E6] hover:underline">
              Ver tabla
            </Link>
          </div>
          <ul class="divide-y divide-[#043234]/80">
            {data.value.topVolume.length === 0 ? (
              <li class="px-4 py-6 text-sm text-gray-500">
              {showSync ? "Sin datos por ahora. Vuelve a intentar en unos minutos." : "Sin datos todavía."}
            </li>
            ) : (
              pagedRows("topVolume", data.value.topVolume).map((t: any) => (
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
          {data.value.topVolume.length > PAGE_SIZE ? (
            <div class="flex items-center justify-between px-4 py-2 border-t border-[#043234] text-xs text-gray-400">
              <button type="button" onClick$={() => changePage("topVolume", data.value.topVolume.length, -1)} class="rounded px-2 py-1 border border-[#043234] hover:bg-[#043234]/50">Anterior</button>
              <span>Página {pageOf("topVolume")} / {totalPagesFor(data.value.topVolume)}</span>
              <button type="button" onClick$={() => changePage("topVolume", data.value.topVolume.length, 1)} class="rounded px-2 py-1 border border-[#043234] hover:bg-[#043234]/50">Siguiente</button>
            </div>
          ) : null}
        </section>

        <section class="relative rounded-xl border border-[#043234] overflow-hidden bg-[#000D0E]/80">
          <div class="flex items-center justify-between px-4 py-3 border-b border-[#043234]">
            <h2 class="text-sm font-semibold text-white">
              Trending · movers 7d
              {InlineHelpTip("Monedas que más se movieron en los últimos 7 días.")}
            </h2>
            <Link href={`${base}/trending-coins/`} class="text-xs text-[#04E6E6] hover:underline">
              Ver tabla
            </Link>
          </div>
          <ul class="divide-y divide-[#043234]/80">
            {data.value.trending.rows.length === 0 ? (
              <li class="px-4 py-6 text-sm text-gray-500">
              {showSync ? "Sin datos por ahora. Vuelve a intentar en unos minutos." : "Sin datos todavía."}
            </li>
            ) : (
              pagedRows("trending", data.value.trending.rows).map((t: any) => (
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
          {data.value.trending.rows.length > PAGE_SIZE ? (
            <div class="flex items-center justify-between px-4 py-2 border-t border-[#043234] text-xs text-gray-400">
              <button type="button" onClick$={() => changePage("trending", data.value.trending.rows.length, -1)} class="rounded px-2 py-1 border border-[#043234] hover:bg-[#043234]/50">Anterior</button>
              <span>Página {pageOf("trending")} / {totalPagesFor(data.value.trending.rows)}</span>
              <button type="button" onClick$={() => changePage("trending", data.value.trending.rows.length, 1)} class="rounded px-2 py-1 border border-[#043234] hover:bg-[#043234]/50">Siguiente</button>
            </div>
          ) : null}
        </section>
      </div>

      {w.address ? (
        <section class="relative rounded-xl border border-[#043234] bg-[#001a1c] p-4">
          {HelpTip("Resumen de tu cartera en Base para esta cuenta o wallet conectada.")}
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
                  No se pudieron cargar los últimos tokens de Base ({w.walletTokensError}). Mostramos la información más
                  reciente disponible.
                </>
              ) : (
                <>No se pudieron cargar los últimos balances de Base. Mostramos la información más reciente disponible.</>
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

      <div class="grid gap-8 2xl:gap-10 lg:grid-cols-2 2xl:[grid-template-columns:repeat(auto-fit,minmax(320px,1fr))]">
        <section class="relative rounded-xl border border-[#043234] overflow-hidden bg-[#000D0E]/80">
          <div class="flex items-center justify-between px-4 py-3 border-b border-[#043234]">
            <h2 class="text-sm font-semibold text-white">
              Meme
              {InlineHelpTip("Monedas meme con su precio y red principal.")}
            </h2>
            <Link href={`${base}/meme-coins/`} class="text-xs text-[#04E6E6] hover:underline">
              Ver tabla
            </Link>
          </div>
          <ul class="divide-y divide-[#043234]/80">
            {data.value.meme.length === 0 ? (
              <li class="px-4 py-6 text-sm text-gray-500">
                {showSync
                  ? "Aún no hay datos en esta sección. Vuelve en unos minutos."
                  : "Sin datos todavía."}
              </li>
            ) : (
              pagedRows("meme", data.value.meme).map((t: any) => (
                <li key={`${t.id}-meme`}>
                  <Link
                    href={`/${L}/token/${t.id}/`}
                    class="flex items-center gap-3 px-4 py-3 hover:bg-[#001a1c]/90 transition-colors"
                  >
                    <TokenLogoImg src={String(t.logo ?? "")} symbol={String(t.symbol)} size={30} />
                    <div class="min-w-0 flex-1">
                      <div class="font-medium text-white truncate">
                        {t.name} <span class="text-gray-500 text-sm">({t.symbol})</span>
                      </div>
                      <div class="text-xs text-gray-500 truncate">{t.network}</div>
                    </div>
                    <div class="text-[#04E6E6] text-sm shrink-0">${formatTokenUsdPrice(t.price)}</div>
                  </Link>
                </li>
              ))
            )}
          </ul>
          {data.value.meme.length > PAGE_SIZE ? (
            <div class="flex items-center justify-between px-4 py-2 border-t border-[#043234] text-xs text-gray-400">
              <button type="button" onClick$={() => changePage("meme", data.value.meme.length, -1)} class="rounded px-2 py-1 border border-[#043234] hover:bg-[#043234]/50">Anterior</button>
              <span>Página {pageOf("meme")} / {totalPagesFor(data.value.meme)}</span>
              <button type="button" onClick$={() => changePage("meme", data.value.meme.length, 1)} class="rounded px-2 py-1 border border-[#043234] hover:bg-[#043234]/50">Siguiente</button>
            </div>
          ) : null}
        </section>

        <section class="relative rounded-xl border border-[#043234] overflow-hidden bg-[#000D0E]/80">
          <div class="flex items-center justify-between px-4 py-3 border-b border-[#043234]">
            <h2 class="text-sm font-semibold text-white">
              AI &amp; big data
              {InlineHelpTip("Monedas de IA y big data con precios actualizados.")}
            </h2>
            <Link href={`${base}/ai-coins/`} class="text-xs text-[#04E6E6] hover:underline">
              Ver tabla
            </Link>
          </div>
          <ul class="divide-y divide-[#043234]/80">
            {data.value.ai.length === 0 ? (
              <li class="px-4 py-6 text-sm text-gray-500">
                {showSync
                  ? "Aún no hay datos en esta sección. Vuelve en unos minutos."
                  : "Sin datos todavía."}
              </li>
            ) : (
              pagedRows("ai", data.value.ai).map((t: any) => (
                <li key={`${t.id}-ai`}>
                  <Link
                    href={`/${L}/token/${t.id}/`}
                    class="flex items-center gap-3 px-4 py-3 hover:bg-[#001a1c]/90 transition-colors"
                  >
                    <TokenLogoImg src={String(t.logo ?? "")} symbol={String(t.symbol)} size={30} />
                    <div class="min-w-0 flex-1">
                      <div class="font-medium text-white truncate">
                        {t.name} <span class="text-gray-500 text-sm">({t.symbol})</span>
                      </div>
                      <div class="text-xs text-gray-500 truncate">{t.network}</div>
                    </div>
                    <div class="text-[#04E6E6] text-sm shrink-0">${formatTokenUsdPrice(t.price)}</div>
                  </Link>
                </li>
              ))
            )}
          </ul>
          {data.value.ai.length > PAGE_SIZE ? (
            <div class="flex items-center justify-between px-4 py-2 border-t border-[#043234] text-xs text-gray-400">
              <button type="button" onClick$={() => changePage("ai", data.value.ai.length, -1)} class="rounded px-2 py-1 border border-[#043234] hover:bg-[#043234]/50">Anterior</button>
              <span>Página {pageOf("ai")} / {totalPagesFor(data.value.ai)}</span>
              <button type="button" onClick$={() => changePage("ai", data.value.ai.length, 1)} class="rounded px-2 py-1 border border-[#043234] hover:bg-[#043234]/50">Siguiente</button>
            </div>
          ) : null}
        </section>
      </div>

      <div class="grid gap-8 2xl:gap-10 lg:grid-cols-2 2xl:[grid-template-columns:repeat(auto-fit,minmax(320px,1fr))]">
        <section class="relative rounded-xl border border-[#043234] overflow-hidden bg-[#000D0E]/80">
          <div class="flex items-center justify-between px-4 py-3 border-b border-[#043234]">
            <h2 class="text-sm font-semibold text-white">New listings</h2>
            <Link href={`${base}/earlybird-coins/`} class="text-xs text-[#04E6E6] hover:underline">
              Ver tabla
            </Link>
          </div>
          <ul class="divide-y divide-[#043234]/80">
            {data.value.earlybird.length === 0 ? (
              <li class="px-4 py-6 text-sm text-gray-500">Sin datos todavía.</li>
            ) : (
              pagedRows("earlybird", data.value.earlybird).map((t: any) => (
                <li key={`${t.id}-early`}>
                  <Link href={`/${L}/token/${t.id}/`} class="flex items-center gap-3 px-4 py-3 hover:bg-[#001a1c]/90 transition-colors">
                    <TokenLogoImg src={String(t.logo ?? "")} symbol={String(t.symbol)} size={30} />
                    <div class="min-w-0 flex-1">
                      <div class="font-medium text-white truncate">{t.name} <span class="text-gray-500 text-sm">({t.symbol})</span></div>
                      <div class="text-xs text-gray-500 truncate">{t.network}</div>
                    </div>
                    <div class="text-[#04E6E6] text-sm shrink-0">${formatTokenUsdPrice(t.price)}</div>
                  </Link>
                </li>
              ))
            )}
          </ul>
          {data.value.earlybird.length > PAGE_SIZE ? (
            <div class="flex items-center justify-between px-4 py-2 border-t border-[#043234] text-xs text-gray-400">
              <button type="button" onClick$={() => changePage("earlybird", data.value.earlybird.length, -1)} class="rounded px-2 py-1 border border-[#043234] hover:bg-[#043234]/50">Anterior</button>
              <span>Página {pageOf("earlybird")} / {totalPagesFor(data.value.earlybird)}</span>
              <button type="button" onClick$={() => changePage("earlybird", data.value.earlybird.length, 1)} class="rounded px-2 py-1 border border-[#043234] hover:bg-[#043234]/50">Siguiente</button>
            </div>
          ) : null}
        </section>

        <section class="relative rounded-xl border border-[#043234] overflow-hidden bg-[#000D0E]/80">
          <div class="flex items-center justify-between px-4 py-3 border-b border-[#043234]">
            <h2 class="text-sm font-semibold text-white">Most visited</h2>
            <Link href={`${base}/most-visit-coins/`} class="text-xs text-[#04E6E6] hover:underline">
              Ver tabla
            </Link>
          </div>
          <ul class="divide-y divide-[#043234]/80">
            {data.value.mostVisited.rows.length === 0 ? (
              <li class="px-4 py-6 text-sm text-gray-500">Sin datos todavía.</li>
            ) : (
              pagedRows("mostVisited", data.value.mostVisited.rows).map((t: any) => (
                <li key={`${t.id}-mv`}>
                  <Link href={`/${L}/token/${t.id}/`} class="flex items-center gap-3 px-4 py-3 hover:bg-[#001a1c]/90 transition-colors">
                    <TokenLogoImg src={String(t.logo ?? "")} symbol={String(t.symbol)} size={30} />
                    <div class="min-w-0 flex-1">
                      <div class="font-medium text-white truncate">{t.name} <span class="text-gray-500 text-sm">({t.symbol})</span></div>
                      <div class="text-xs text-gray-500 truncate">{t.network}</div>
                    </div>
                    <div class="text-[#04E6E6] text-sm shrink-0">${formatTokenUsdPrice(t.price)}</div>
                  </Link>
                </li>
              ))
            )}
          </ul>
          {data.value.mostVisited.rows.length > PAGE_SIZE ? (
            <div class="flex items-center justify-between px-4 py-2 border-t border-[#043234] text-xs text-gray-400">
              <button type="button" onClick$={() => changePage("mostVisited", data.value.mostVisited.rows.length, -1)} class="rounded px-2 py-1 border border-[#043234] hover:bg-[#043234]/50">Anterior</button>
              <span>Página {pageOf("mostVisited")} / {totalPagesFor(data.value.mostVisited.rows)}</span>
              <button type="button" onClick$={() => changePage("mostVisited", data.value.mostVisited.rows.length, 1)} class="rounded px-2 py-1 border border-[#043234] hover:bg-[#043234]/50">Siguiente</button>
            </div>
          ) : null}
        </section>
      </div>

      <div class="grid gap-8 2xl:gap-10 lg:grid-cols-2 2xl:[grid-template-columns:repeat(auto-fit,minmax(320px,1fr))]">
        <section class="relative rounded-xl border border-[#043234] overflow-hidden bg-[#000D0E]/80">
          <div class="flex items-center justify-between px-4 py-3 border-b border-[#043234]">
            <h2 class="text-sm font-semibold text-white">Gaming</h2>
            <Link href={`${base}/gaming-coins/`} class="text-xs text-[#04E6E6] hover:underline">
              Ver tabla
            </Link>
          </div>
          <ul class="divide-y divide-[#043234]/80">
            {data.value.gaming.length === 0 ? (
              <li class="px-4 py-6 text-sm text-gray-500">Sin datos todavía.</li>
            ) : (
              pagedRows("gaming", data.value.gaming).map((t: any) => (
                <li key={`${t.id}-gaming`}>
                  <Link href={`/${L}/token/${t.id}/`} class="flex items-center gap-3 px-4 py-3 hover:bg-[#001a1c]/90 transition-colors">
                    <TokenLogoImg src={String(t.logo ?? "")} symbol={String(t.symbol)} size={30} />
                    <div class="min-w-0 flex-1">
                      <div class="font-medium text-white truncate">{t.name} <span class="text-gray-500 text-sm">({t.symbol})</span></div>
                      <div class="text-xs text-gray-500 truncate">{t.network}</div>
                    </div>
                    <div class="text-[#04E6E6] text-sm shrink-0">${formatTokenUsdPrice(t.price)}</div>
                  </Link>
                </li>
              ))
            )}
          </ul>
          {data.value.gaming.length > PAGE_SIZE ? (
            <div class="flex items-center justify-between px-4 py-2 border-t border-[#043234] text-xs text-gray-400">
              <button type="button" onClick$={() => changePage("gaming", data.value.gaming.length, -1)} class="rounded px-2 py-1 border border-[#043234] hover:bg-[#043234]/50">Anterior</button>
              <span>Página {pageOf("gaming")} / {totalPagesFor(data.value.gaming)}</span>
              <button type="button" onClick$={() => changePage("gaming", data.value.gaming.length, 1)} class="rounded px-2 py-1 border border-[#043234] hover:bg-[#043234]/50">Siguiente</button>
            </div>
          ) : null}
        </section>

        <section class="relative rounded-xl border border-[#043234] overflow-hidden bg-[#000D0E]/80">
          <div class="flex items-center justify-between px-4 py-3 border-b border-[#043234]">
            <h2 class="text-sm font-semibold text-white">Mineable</h2>
            <Link href={`${base}/mineable-coins/`} class="text-xs text-[#04E6E6] hover:underline">
              Ver tabla
            </Link>
          </div>
          <ul class="divide-y divide-[#043234]/80">
            {data.value.mineable.length === 0 ? (
              <li class="px-4 py-6 text-sm text-gray-500">Sin datos todavía.</li>
            ) : (
              pagedRows("mineable", data.value.mineable).map((t: any) => (
                <li key={`${t.id}-mineable`}>
                  <Link href={`/${L}/token/${t.id}/`} class="flex items-center gap-3 px-4 py-3 hover:bg-[#001a1c]/90 transition-colors">
                    <TokenLogoImg src={String(t.logo ?? "")} symbol={String(t.symbol)} size={30} />
                    <div class="min-w-0 flex-1">
                      <div class="font-medium text-white truncate">{t.name} <span class="text-gray-500 text-sm">({t.symbol})</span></div>
                      <div class="text-xs text-gray-500 truncate">{t.network}</div>
                    </div>
                    <div class="text-[#04E6E6] text-sm shrink-0">${formatTokenUsdPrice(t.price)}</div>
                  </Link>
                </li>
              ))
            )}
          </ul>
          {data.value.mineable.length > PAGE_SIZE ? (
            <div class="flex items-center justify-between px-4 py-2 border-t border-[#043234] text-xs text-gray-400">
              <button type="button" onClick$={() => changePage("mineable", data.value.mineable.length, -1)} class="rounded px-2 py-1 border border-[#043234] hover:bg-[#043234]/50">Anterior</button>
              <span>Página {pageOf("mineable")} / {totalPagesFor(data.value.mineable)}</span>
              <button type="button" onClick$={() => changePage("mineable", data.value.mineable.length, 1)} class="rounded px-2 py-1 border border-[#043234] hover:bg-[#043234]/50">Siguiente</button>
            </div>
          ) : null}
        </section>
      </div>

      <section class="grid gap-3 2xl:gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <div class="relative rounded-xl border border-[#043234] bg-gradient-to-br from-[#001a1c] to-[#000D0E] p-4 2xl:p-5">
          {HelpTip("Cantidad total de monedas disponibles en la app.")}
          <p class="text-[11px] uppercase tracking-wide text-gray-500">Monedas disponibles</p>
          <p class="text-2xl font-semibold text-white mt-1 tabular-nums">{st.totalTokens.toLocaleString()}</p>
          <p class="text-xs text-gray-500 mt-2">Total de monedas en todas las categorías.</p>
        </div>
        <div class="relative rounded-xl border border-[#043234] bg-[#001a1c]/80 p-4 2xl:p-5">
          {HelpTip("Cantidad de colecciones NFT destacadas ahora mismo.")}
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
              "Colecciones disponibles."
            )}
          </p>
        </div>
        <div class="relative rounded-xl border border-[#043234] bg-[#001a1c]/80 p-4 2xl:p-5">
          {HelpTip("Cantidad de señales de ballenas registradas en las últimas 24 horas.")}
          <p class="text-[11px] uppercase tracking-wide text-gray-500">Whale alerts (24h)</p>
          <p class="text-2xl font-semibold text-[#04E6E6] mt-1 tabular-nums">{st.signals24h.whales}</p>
          <p class="text-xs text-gray-500 mt-2">{showSync ? "Señales guardadas en el servidor." : "Señales en tiempo casi real."}</p>
        </div>
        <div class="relative rounded-xl border border-[#043234] bg-[#001a1c]/80 p-4 2xl:p-5">
          {HelpTip("Cantidad de señales de traders detectadas en las últimas 24 horas.")}
          <p class="text-[11px] uppercase tracking-wide text-gray-500">Trader signals (24h)</p>
          <p class="text-2xl font-semibold text-[#04E6E6] mt-1 tabular-nums">{st.signals24h.traders}</p>
          <p class="text-xs text-gray-500 mt-2">Smart money / traders.</p>
        </div>
        <div class="relative rounded-xl border border-[#043234] bg-[#001a1c]/80 p-4 2xl:p-5">
          {HelpTip("Señales smart de USDT generadas en el último día.")}
          <p class="text-[11px] uppercase tracking-wide text-gray-500">USDT smart (24h)</p>
          <p class="text-2xl font-semibold text-[#04E6E6] mt-1 tabular-nums">{st.signals24h.smart}</p>
          <p class="text-xs text-gray-500 mt-2">
            {showSync ? "Watcher + análisis on-chain." : "Análisis on-chain."}
          </p>
        </div>
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

    </div>
    </>
  );
});
