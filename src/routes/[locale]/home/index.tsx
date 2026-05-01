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
  LuImage,
  LuLayers,
  LuLoader2,
  LuRadar,
  LuRadio,
  LuRefreshCw,
  LuSparkles,
  LuTrendingUp,
  LuTrophy,
  LuWaves,
} from "@qwikest/icons/lucide";
import { TokenLogoImg } from "~/components/crypto-dashboard/token-logo";
import { triggerCmcMarketSync, triggerOwnerFullMarketSync } from "~/server/crypto-helper-actions";
import { useDashboardAuth } from "../layout";
import { effectiveSyncDurationMs, formatDurationMs } from "~/utils/format-duration";
import { getSyncUsageBreakdown } from "~/utils/format-sync-usage-summary";
import { formatTokenUsdPrice, formatUsdBalance, formatUsdLiquidity } from "~/utils/format-market";
import { buildSeo, localeFromParams } from "~/utils/seo";
import { HelpTooltip } from "~/components/ui/help-tooltip";
import { MarketChangePill } from "~/components/crypto-dashboard/market-change-pill";
import { MiniSparkline } from "~/components/crypto-dashboard/mini-sparkline";
import { MarketRegimeBadge } from "~/components/crypto-dashboard/market-regime-badge";

export const head: DocumentHead = ({ url, params }) => {
  const locale = localeFromParams(params);
  return buildSeo({
    title: "Crypto Dashboard Overview | Crypto Helper",
    description:
      "Explore crypto market overview, token rankings, bubbles, NFT collections, and trader dashboards in Crypto Helper.",
    canonicalUrl: url.href,
    locale,
  });
};

export const useDashboardHomeLoader = routeLoader$(async (ev) => {
  const { loadDashboardHome } = await import("~/server/crypto-helper/dashboard-home-loader");
  return loadDashboardHome(ev);
});

export default component$(() => {
  const dash = useDashboardAuth();
  const canFullSync = dash.value.canTriggerFullMarketSync;
  const data = useDashboardHomeLoader();
  const loc = useLocation();
  const L = loc.params.locale || "en-us";
  const base = `/${L}`;
  const isEs = L.toLowerCase().startsWith("es");
  const tx = (es: string, en: string) => (isEs ? es : en);

  const syncBusy = useSignal(false);
  const syncError = useSignal("");
  const fullSyncBusy = useSignal(false);
  const fullSyncError = useSignal("");
  const fullSyncSuccess = useSignal("");
  const toastMsg = useSignal("");
  const confirmSyncMode = useSignal<"full" | "market" | null>(null);
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
    fullSyncSuccess.value = "";
    let willReload = false;
    try {
      const r = await triggerOwnerFullMarketSync();
      if (r.ok) {
        fullSyncSuccess.value = "Actualización completa finalizada con éxito. Recargando panel…";
        await new Promise((resolve) => setTimeout(resolve, 1400));
        willReload = true;
        window.location.reload();
        return;
      }
      fullSyncError.value = r.error || "No se pudo completar la actualización.";
    } catch (e: unknown) {
      fullSyncError.value = e instanceof Error ? e.message : "No se pudo completar la actualización.";
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
  const requestFullMarketSync = $(() => {
    confirmSyncMode.value = "full";
  });
  const requestMarketSync = $(() => {
    confirmSyncMode.value = "market";
  });
  const closeConfirm = $(() => {
    confirmSyncMode.value = null;
  });
  const confirmAndRun = $(async () => {
    const mode = confirmSyncMode.value;
    confirmSyncMode.value = null;
    if (mode === "full") {
      // No usar `tx` aquí: QRL no puede serializar funciones de cierre.
      toastMsg.value = isEs ? "Iniciando sync completo…" : "Starting full sync...";
      await runFullMarketSync();
      return;
    }
    if (mode === "market") {
      toastMsg.value = isEs ? "Iniciando sync de mercado…" : "Starting market sync...";
      await runCmcSync();
    }
  });
  const goProOffer = $(() => {
    const el = document.getElementById("pro-offer");
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

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
      ? tx("Codicia extrema", "Extreme greed")
      : fearGreedValue >= 60
        ? tx("Codicia", "Greed")
        : fearGreedValue >= 40
          ? tx("Neutral", "Neutral")
          : fearGreedValue >= 25
            ? tx("Miedo", "Fear")
            : tx("Miedo extremo", "Extreme fear");
  const rsiLabel = avgRsiValue >= 70 ? tx("Sobrecompra", "Overbought") : avgRsiValue <= 30 ? tx("Sobreventa", "Oversold") : tx("Neutral", "Neutral");
  const fearGreedNeedleDeg = 180 + fearGreedValue * 1.8;
  const fgCenterX = 110;
  const fgCenterY = 110;
  const fgRadius = 72;
  const fgNeedleX = fgCenterX + fgRadius * Math.cos((fearGreedNeedleDeg * Math.PI) / 180);
  const fgNeedleY = fgCenterY + fgRadius * Math.sin((fearGreedNeedleDeg * Math.PI) / 180);
  const screenerSnap = (data.value.nansenTokenScreener as Record<string, unknown> | null) ?? null;
  const screenerRows = (() => {
    const root = screenerSnap?.data;
    if (!root || typeof root !== "object") return [] as Record<string, unknown>[];
    const rootRec = root as Record<string, unknown>;
    if (Array.isArray(rootRec.data)) return rootRec.data as Record<string, unknown>[];
    const nested = rootRec.data;
    if (nested && typeof nested === "object" && Array.isArray((nested as Record<string, unknown>).data)) {
      return (nested as Record<string, unknown>).data as Record<string, unknown>[];
    }
    return [] as Record<string, unknown>[];
  })();

  const last = st.lastSync;
  const lastSyncFinishedLabel =
    last?.finishedAt != null
      ? new Date(last.finishedAt * 1000).toLocaleString(undefined, {
          dateStyle: "medium",
          timeStyle: "medium",
        })
      : last?.startedAt != null
        ? `${tx("En curso · inicio", "Running · start")} ${new Date(last.startedAt * 1000).toLocaleString(undefined, { timeStyle: "short" })}`
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
  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ track, cleanup }) => {
    track(() => toastMsg.value);
    if (!toastMsg.value) return;
    const t = setTimeout(() => {
      toastMsg.value = "";
    }, 2600);
    cleanup(() => clearTimeout(t));
  });

  const quickLinks = [
    {
      href: `${base}/bubbles/`,
      title: tx("Burbujas cripto", "Crypto bubbles"),
      desc: tx("Mapa por volumen, FDV y periodos.", "Map by volume, FDV, and timeframes."),
      icon: LuBarChart3,
    },
    {
      href: `${base}/volume-coins/`,
      title: tx("Top volumen", "Top volume"),
      desc: tx("Ranking 24h por volumen.", "24h ranking by volume."),
      icon: LuActivity,
    },
    {
      href: `${base}/trending-coins/`,
      title: tx("Tendencia", "Trending"),
      desc: data.value.trending.usedFallback ? tx("Mayores subidas y bajadas (7 días).", "Top gainers and losers (7 days).") : tx("Mayores subidas y bajadas.", "Top gainers and losers."),
      icon: LuSparkles,
    },
    {
      href: `${base}/earlybird-coins/`,
      title: tx("Nuevos listados", "New listings"),
      desc: tx("Monedas listadas recientemente.", "Recently listed coins."),
      icon: LuSparkles,
    },
    {
      href: `${base}/meme-coins/`,
      title: tx("Meme", "Meme"),
      desc: tx("Monedas meme destacadas.", "Featured meme coins."),
      icon: LuCoins,
    },
    {
      href: `${base}/ai-coins/`,
      title: tx("IA y big data", "AI & big data"),
      desc: tx("Monedas de inteligencia artificial y datos.", "AI and big-data related coins."),
      icon: LuBot,
    },
    {
      href: `${base}/gaming-coins/`,
      title: tx("Gaming", "Gaming"),
      desc: tx("Monedas del ecosistema gaming.", "Gaming ecosystem coins."),
      icon: LuActivity,
    },
    {
      href: `${base}/mineable-coins/`,
      title: tx("Minables", "Mineable"),
      desc: tx("Monedas minables.", "Mineable coins."),
      icon: LuLayers,
    },
    {
      href: `${base}/most-visit-coins/`,
      title: tx("Más visitadas", "Most visited"),
      desc: tx("Monedas más visitadas por usuarios.", "Most visited coins by users."),
      icon: LuRadar,
    },
    {
      href: `${base}/tokens/`,
      title: tx("Todos los tokens", "All tokens"),
      desc: tx(`${st.totalTokens.toLocaleString()} tokens disponibles.`, `${st.totalTokens.toLocaleString()} tokens available.`),
      icon: LuLayers,
    },
    {
      href: `${base}/nfts/`,
      title: tx("Colecciones NFT", "NFT collections"),
      desc:
        data.value.nftGlobal.ok && data.value.nftGlobal.hottestCount > 0
          ? tx(`Explorar colecciones destacadas (${data.value.nftGlobal.hottestCount}).`, `Explore featured collections (${data.value.nftGlobal.hottestCount}).`)
          : tx("Colecciones y detalle por contrato y token ID.", "Collections and detail by contract and token ID."),
      icon: LuImage,
    },
    {
      href: `${base}/top-traders/`,
      title: tx("Traders", "Traders"),
      desc: tx("Direcciones destacadas por rendimiento y vista de cartera (Base/Eth).", "Top addresses by performance and wallet view (Base/Eth)."),
      icon: LuRadar,
    },
    {
      href: `${base}/top-traders-swaps/`,
      title: tx("Por actividad de swaps", "By swap activity"),
      desc: tx("Ranking de traders por actividad de swaps.", "Trader ranking by swap activity."),
      icon: LuActivity,
    },
    {
      href: `${base}/top-traders-whales/`,
      title: tx("Top holders", "Top holders"),
      desc: tx("Direcciones con mayor patrimonio en la última lectura.", "Addresses with highest holdings in the latest reading."),
      icon: LuWaves,
    },
    {
      href: `${base}/block/`,
      title: tx("Block", "Block"),
      desc: tx("Señales y actividad on-chain reciente.", "Recent on-chain activity and signals."),
      icon: LuLayers,
    },
    {
      href: `${base}/alerts/`,
      title: tx("Alertas y notificaciones", "Alerts & notifications"),
      desc: tx("Push, ballenas y smart money en vivo (Pro), alertas de precio por token (Pro).", "Push, whale and live smart-money alerts (Pro), and token price alerts (Pro)."),
      icon: LuBell,
    },
    {
      href: `${base}/db-insight/`,
      title: tx("DB insight", "DB insight"),
      desc: tx("Análisis asistido para usuarios Pro.", "Assisted analysis for Pro users."),
      icon: LuBot,
      requiresPro: true,
    },
  ];

  const anySyncBusy = fullSyncBusy.value || syncBusy.value;
  const n = (v: unknown): number => {
    const x = Number(v ?? 0);
    return Number.isFinite(x) ? x : 0;
  };
  const nOrNull = (v: unknown): number | null => {
    if (v == null || String(v).trim() === "") return null;
    const x = Number(v);
    return Number.isFinite(x) ? x : null;
  };
  const sparkFromToken = (t: Record<string, unknown>): { x: number; y: number }[] =>
    [
      { x: 1, y: nOrNull(t.percentChange1h) },
      { x: 24, y: nOrNull(t.percentChange24h) },
      { x: 24 * 7, y: nOrNull(t.percentChange7d) },
      { x: 24 * 30, y: nOrNull(t.percentChange30d) },
      { x: 24 * 90, y: nOrNull(t.percentChange90d) },
    ]
      .filter((p): p is { x: number; y: number } => p.y != null)
      .map((p) => ({ x: p.x, y: p.y as number }));
  const regimeScore = (t: Record<string, unknown>): number => n(t.percentChange24h) * 0.55 + n(t.percentChange7d) * 0.45;
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
  // On large screens we show a larger default set so the grid looks balanced.
  const prioritizedQuickLinks = quickLinks.slice(0, 12);
  const secondaryQuickLinks = quickLinks.slice(12);
  const visibleQuickLinks = showMoreSections.value
    ? [...prioritizedQuickLinks, ...secondaryQuickLinks]
    : prioritizedQuickLinks;
  const liquidityScore = (t: Record<string, unknown>): number => Math.max(0, Math.min(100, Math.log10(Math.max(1, n(t.volume))) * 14));
  const momentumScore = (t: Record<string, unknown>): number => Math.max(0, Math.min(100, 50 + regimeScore(t) * 2.2));
  const volatilityScore = (t: Record<string, unknown>): number =>
    Math.max(0, Math.min(100, Math.abs(n(t.percentChange24h)) * 5 + Math.abs(n(t.percentChange7d)) * 2.4));
  const opportunityScore = (t: Record<string, unknown>): number =>
    Math.round(momentumScore(t) * 0.45 + liquidityScore(t) * 0.35 + (100 - volatilityScore(t)) * 0.2);
  const radarMomentum = [...data.value.topVolume]
    .sort((a: any, b: any) => regimeScore(b) - regimeScore(a))
    .slice(0, 4);
  const radarReversal = [...data.value.topVolume]
    .filter((t: any) => n(t.percentChange24h) < 0 && n(t.percentChange7d) > 0)
    .sort((a: any, b: any) => n(b.volume) - n(a.volume))
    .slice(0, 4);
  const radarVolume = [...data.value.topVolume]
    .sort((a: any, b: any) => n(b.volume) - n(a.volume))
    .slice(0, 4);
  const radarBestSet = [...data.value.topVolume]
    .sort((a: any, b: any) => opportunityScore(b) - opportunityScore(a))
    .slice(0, 6);
  const HelpTip = (text: string) => <HelpTooltip text={text} placement="top-right" widthClass="w-52" />;
  const InlineHelpTip = (text: string) => <HelpTooltip text={text} placement="inline" widthClass="w-52" />;

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
                {fullSyncBusy.value ? "Actualizando datos completos…" : "Actualizando mercado…"}
              </p>
              <p class="mt-2 text-xs text-slate-400 leading-relaxed">
                {tx(
                  "Estamos refrescando rankings y métricas. Puede tardar varios minutos; mantén esta pestaña abierta.",
                  "Refreshing rankings and metrics. This can take several minutes; keep this tab open.",
                )}
              </p>
            </div>
          </div>
        </div>
      ) : null}
      {confirmSyncMode.value ? (
        <div class="fixed inset-0 z-[260] flex items-center justify-center bg-black/65 backdrop-blur-sm px-4">
          <div class="w-full max-w-md rounded-2xl border border-[#043234] bg-[#001a1c] p-5 shadow-2xl shadow-black/50">
            <h3 class="text-base font-semibold text-white">
              {confirmSyncMode.value === "full"
                ? tx("Confirmar sync completo", "Confirm full sync")
                : tx("Confirmar sync de mercado", "Confirm market sync")}
            </h3>
            <p class="mt-2 text-xs leading-relaxed text-slate-400">
              {tx(
                "Esta operación puede tardar varios minutos y consumir cuota de APIs. ¿Deseas continuar?",
                "This operation can take several minutes and consume API quota. Do you want to continue?",
              )}
            </p>
            <div class="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick$={closeConfirm}
                class="rounded-lg border border-[#043234] bg-[#001217] px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-[#043234]/35"
              >
                {tx("Cancelar", "Cancel")}
              </button>
              <button
                type="button"
                onClick$={confirmAndRun}
                class="rounded-lg border border-cyan-400/45 bg-cyan-500/15 px-3 py-1.5 text-xs font-semibold text-cyan-100 hover:bg-cyan-500/25"
              >
                {tx("Sí, ejecutar", "Yes, run")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {toastMsg.value ? (
        <div class="fixed bottom-4 right-4 z-[270] rounded-lg border border-[#04E6E6]/35 bg-[#001a1c]/95 px-3 py-2 text-xs font-medium text-cyan-100 shadow-lg shadow-black/30">
          {toastMsg.value}
        </div>
      ) : null}
      <div class="w-full max-w-[2200px] mx-auto space-y-10 2xl:space-y-12 px-1 2xl:px-3">
      <header class="flex flex-col gap-4 2xl:gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p class="text-xs font-medium uppercase tracking-wider text-[#04E6E6]/80">Crypto Helper</p>
          <h1 class="text-3xl 2xl:text-4xl font-bold text-white mt-1">{tx("Resumen", "Overview")}</h1>
          <p class="text-gray-400 text-sm 2xl:text-base mt-2 max-w-xl 2xl:max-w-2xl leading-relaxed">
            {tx(
              "Resumen de mercado, fichas de tokens, NFTs, cartera en Base, burbujas y herramientas para traders. Las señales en vivo y el asistente IA están en el plan Pro.",
              "Market overview, token pages, NFTs, Base wallet, bubbles, and trader tools. Live signals and the AI assistant are part of Pro.",
            )}
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-2 text-xs text-gray-500">
          {canFullSync ? (
            <>
              <span class="rounded-lg border border-[#043234] bg-[#001a1c] px-3 py-2 leading-snug">
                <span class="text-[10px] uppercase tracking-wide text-gray-600">
                  {tx("Última actualización de datos", "Last data update")}
                </span>
                <span class="block text-gray-300 mt-0.5 tabular-nums">{lastSyncFinishedLabel}</span>
                {lastSyncDurationLabel ? (
                  <span class="block text-gray-500 mt-0.5">
                    {tx("Duración", "Duration")}: <span class="text-gray-400">{lastSyncDurationLabel}</span>
                  </span>
                ) : null}
              </span>
              <div class="flex flex-col gap-1 w-full sm:w-auto sm:items-end">
                <button
                  type="button"
                  disabled={anySyncBusy}
                  onClick$={requestFullMarketSync}
                  class="inline-flex items-center justify-center gap-2 rounded-lg border border-amber-500/50 bg-amber-500/15 px-3 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-500/25 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                  title={tx(
                    "Actualizar rankings de mercado y datos relacionados (operación de mantenimiento)",
                    "Refresh market rankings and related cached data (maintenance operation)",
                  )}
                >
                  {fullSyncBusy.value ? (
                    <>
                      <LuLoader2 class="h-3.5 w-3.5 animate-spin" />
                      {tx("Actualizando…", "Updating…")}
                    </>
                  ) : (
                    <>
                      <LuRefreshCw class="h-3.5 w-3.5" />
                      {tx("Actualizar datos", "Update data")}
                    </>
                  )}
                </button>
                {fullSyncError.value ? (
                  <p class="text-[11px] text-amber-400/95 max-w-xs text-right">{fullSyncError.value}</p>
                ) : null}
                {fullSyncSuccess.value ? (
                  <p class="text-[11px] text-emerald-400/95 max-w-xs text-right">{fullSyncSuccess.value}</p>
                ) : null}
              </div>
            </>
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
              {HelpTip(
                tx("Esta sección es Pro. Suscríbete para desbloquearla.", "This section is Pro. Subscribe to unlock it."),
              )}
              <div class="flex items-start justify-between gap-2 pr-8">
                <span class="rounded-lg bg-amber-500/20 p-2 text-amber-300">
                  <Icon class="h-5 w-5" />
                </span>
                <span class="rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-200">
                  PRO
                </span>
              </div>
              <h3 class="font-semibold text-white mt-3">{q.title}</h3>
              <p class="pr-7 text-xs text-amber-100/75 mt-1 leading-relaxed">
                {tx("Disponible con suscripción Pro.", "Available with Pro subscription.")}
              </p>
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
              {showMoreSections.value
                ? tx("Ver menos secciones", "Show fewer sections")
                : tx(`Ver más secciones (${secondaryQuickLinks.length})`, `Show more sections (${secondaryQuickLinks.length})`)}
            </button>
          </div>
        ) : null}
      </div>

      <section class="overflow-x-auto pb-1">
        <div class={`grid gap-3 ${showBtcDominance ? "min-w-[980px] grid-cols-5" : "min-w-[780px] grid-cols-4"}`}>
          <article class="relative rounded-xl border border-[#043234] bg-[#001a1c]/80 p-3">
            {HelpTip(
              pulse.hasGlobalMetrics
                ? "Capitalización total del mercado agregada (métricas globales sincronizadas)."
                : "Capitalización total de las monedas que ves en esta app.",
            )}
            <p class="text-[10px] uppercase tracking-wide text-gray-500">
              {pulse.hasGlobalMetrics ? "Market Cap (global)" : "Market Cap (vista)"}
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
                ? "Volumen de trading en 24h agregado a nivel de mercado (métricas globales sincronizadas)."
                : "Volumen de 24h sumado de las monedas mostradas.",
            )}
            <p class="text-[10px] uppercase tracking-wide text-gray-500">
              {pulse.hasGlobalMetrics ? "Volume 24h (global)" : "Volume 24h (vista)"}
            </p>
            <p class="text-lg font-semibold text-white mt-1 tabular-nums">${formatUsdBalance(pulse.volume24h)}</p>
            <p class="text-[11px] text-gray-500 mt-1">
              {pulse.hasGlobalMetrics ? "Agregado global (24h)" : "Total de esta vista"}
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

      {screenerRows.length > 0 ? (
        <section class="rounded-xl border border-[#043234] bg-[#001a1c]/70 overflow-hidden">
          <div class="px-4 py-3 border-b border-[#043234] flex items-center justify-between gap-2">
            <h2 class="text-sm font-semibold text-white">Token Screener</h2>
            <span class="text-[10px] text-gray-500">Actualizado a diario</span>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="bg-[#001317] text-[10px] uppercase tracking-wide text-gray-500">
                <tr>
                  <th class="px-4 py-2 font-medium">Token</th>
                  <th class="px-4 py-2 font-medium">Chain</th>
                  <th class="px-4 py-2 font-medium">Price</th>
                  <th class="px-4 py-2 font-medium">24h</th>
                  <th class="px-4 py-2 font-medium">Volume</th>
                  <th class="px-4 py-2 font-medium">Mcap</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#043234]/70 text-slate-300">
                {screenerRows.slice(0, 20).map((r, i) => (
                  <tr key={`screener-${i}`} class="hover:bg-[#001a1c]/60">
                    <td class="px-4 py-2">
                      <div class="font-medium text-white">{String(r.token_symbol ?? r.symbol ?? "—")}</div>
                      <div class="text-[10px] text-gray-500">{String(r.token_name ?? "—")}</div>
                    </td>
                    <td class="px-4 py-2">{String(r.chain ?? "—")}</td>
                    <td class="px-4 py-2">${formatTokenUsdPrice(Number(r.price_usd ?? 0))}</td>
                    <td
                      class={`px-4 py-2 tabular-nums ${
                        Number(r.price_change_24h_percent ?? 0) > 0
                          ? "text-emerald-300"
                          : Number(r.price_change_24h_percent ?? 0) < 0
                            ? "text-rose-300"
                            : "text-slate-300"
                      }`}
                    >
                      {Number(r.price_change_24h_percent ?? 0) > 0 ? "+" : ""}
                      {Number(r.price_change_24h_percent ?? 0).toFixed(2)}%
                    </td>
                    <td class="px-4 py-2">${formatUsdLiquidity(Number(r.volume_usd_24h ?? 0))}</td>
                    <td class="px-4 py-2">${formatUsdLiquidity(Number(r.market_cap_usd ?? 0))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

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

      {canFullSync && st.syncHistory.length > 0 ? (
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
                  <th class="px-4 py-2 font-medium">Detalle</th>
                  <th class="px-4 py-2 font-medium">
                    <span class="inline-flex items-center gap-1">
                      {tx("Consumo", "Usage")}
                      {HelpTip(
                        tx(
                          "Consumo por proveedor en esta corrida (CoinMarketCap, Moralis CU, créditos Nansen, Icarus si aplica). Filas antiguas sin registro detallado muestran —.",
                          "Per-provider usage for this run (CoinMarketCap, Moralis CUs, Nansen credits, Icarus if used). Older rows without a stored breakdown show —.",
                        ),
                      )}
                    </span>
                  </th>
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
                  const usageBr = getSyncUsageBreakdown(row.usagePayload ?? null, isEs ? "es" : "en");
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
                      <td class="px-4 py-2 max-w-[18rem] truncate text-[11px] text-slate-400" title={row.errorMessage ?? ""}>
                        {row.errorMessage ?? "—"}
                      </td>
                      <td
                        class="px-4 py-2 w-[min(24rem,44vw)] min-w-[13rem] max-w-[28rem] text-[11px] text-slate-300 align-top"
                        title={usageBr.tooltip || undefined}
                      >
                        {usageBr.lines.length === 0 ? (
                          "—"
                        ) : (
                          <ul class="m-0 list-none space-y-2.5 p-0">
                            {usageBr.lines.map((line, i) => (
                              <li key={i} class="border-l-2 border-[#04E6E6]/30 pl-2.5">
                                <div class="text-[10px] font-semibold tracking-wide text-[#04E6E6]/90">
                                  {line.provider}
                                </div>
                                <div class="mt-0.5 text-[11px] text-slate-200">{line.primary}</div>
                                {line.secondary ? (
                                  <div class="mt-0.5 text-[10px] leading-snug text-slate-500">{line.secondary}</div>
                                ) : null}
                              </li>
                            ))}
                          </ul>
                        )}
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
            Aún no hay datos de mercado. Puedes intentar actualizar ahora o volver más tarde.
          </span>
          <button
            type="button"
            disabled={syncBusy.value}
            onClick$={requestMarketSync}
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
              {syncError.value}
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
              {tx("Ver tabla","View table")}
            </Link>
          </div>
          <ul class="divide-y divide-[#043234]/80">
            {data.value.topVolume.length === 0 ? (
              <li class="px-4 py-6 text-sm text-gray-500">Sin datos todavía.</li>
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
                    <MiniSparkline points={sparkFromToken(t)} />
                    <MarketChangePill value={t.percentChange24h} label="24h" />
                  </Link>
                </li>
              ))
            )}
          </ul>
          {data.value.topVolume.length > PAGE_SIZE ? (
            <div class="flex items-center justify-between px-4 py-2 border-t border-[#043234] text-xs text-gray-400">
              <button type="button" onClick$={() => changePage("topVolume", data.value.topVolume.length, -1)} class="rounded px-2 py-1 border border-[#043234] hover:bg-[#043234]/50">{tx("Anterior","Previous")}</button>
              <span>Página {pageOf("topVolume")} / {totalPagesFor(data.value.topVolume)}</span>
              <button type="button" onClick$={() => changePage("topVolume", data.value.topVolume.length, 1)} class="rounded px-2 py-1 border border-[#043234] hover:bg-[#043234]/50">{tx("Siguiente","Next")}</button>
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
              {tx("Ver tabla","View table")}
            </Link>
          </div>
          <ul class="divide-y divide-[#043234]/80">
            {data.value.trending.rows.length === 0 ? (
              <li class="px-4 py-6 text-sm text-gray-500">
              Sin datos todavía.
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
                      <div class="text-xs text-slate-500">{t.network}</div>
                    </div>
                    <div class="text-right shrink-0 text-sm text-[#04E6E6]">
                      ${formatTokenUsdPrice(t.price)}
                    </div>
                    <MiniSparkline points={sparkFromToken(t)} />
                    <MarketRegimeBadge score={regimeScore(t)} />
                    <MarketChangePill value={t.percentChange7d} label="7d" />
                  </Link>
                </li>
              ))
            )}
          </ul>
          {data.value.trending.rows.length > PAGE_SIZE ? (
            <div class="flex items-center justify-between px-4 py-2 border-t border-[#043234] text-xs text-gray-400">
              <button type="button" onClick$={() => changePage("trending", data.value.trending.rows.length, -1)} class="rounded px-2 py-1 border border-[#043234] hover:bg-[#043234]/50">{tx("Anterior","Previous")}</button>
              <span>Página {pageOf("trending")} / {totalPagesFor(data.value.trending.rows)}</span>
              <button type="button" onClick$={() => changePage("trending", data.value.trending.rows.length, 1)} class="rounded px-2 py-1 border border-[#043234] hover:bg-[#043234]/50">{tx("Siguiente","Next")}</button>
            </div>
          ) : null}
        </section>
      </div>

      <div class="grid gap-8 2xl:gap-10 lg:grid-cols-2 2xl:[grid-template-columns:repeat(auto-fit,minmax(320px,1fr))]">
        <section class="relative rounded-xl border border-[#043234] overflow-hidden bg-[#000D0E]/80">
          <div class="flex items-center justify-between px-4 py-3 border-b border-[#043234]">
            <h2 class="text-sm font-semibold text-white">
              Meme
              {InlineHelpTip("Monedas meme con su precio y red principal.")}
            </h2>
            <Link href={`${base}/meme-coins/`} class="text-xs text-[#04E6E6] hover:underline">
              {tx("Ver tabla","View table")}
            </Link>
          </div>
          <ul class="divide-y divide-[#043234]/80">
            {data.value.meme.length === 0 ? (
              <li class="px-4 py-6 text-sm text-gray-500">Sin datos todavía.</li>
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
                    <MiniSparkline points={sparkFromToken(t)} />
                    <MarketChangePill value={t.percentChange24h} label="24h" />
                  </Link>
                </li>
              ))
            )}
          </ul>
          {data.value.meme.length > PAGE_SIZE ? (
            <div class="flex items-center justify-between px-4 py-2 border-t border-[#043234] text-xs text-gray-400">
              <button type="button" onClick$={() => changePage("meme", data.value.meme.length, -1)} class="rounded px-2 py-1 border border-[#043234] hover:bg-[#043234]/50">{tx("Anterior","Previous")}</button>
              <span>Página {pageOf("meme")} / {totalPagesFor(data.value.meme)}</span>
              <button type="button" onClick$={() => changePage("meme", data.value.meme.length, 1)} class="rounded px-2 py-1 border border-[#043234] hover:bg-[#043234]/50">{tx("Siguiente","Next")}</button>
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
              {tx("Ver tabla","View table")}
            </Link>
          </div>
          <ul class="divide-y divide-[#043234]/80">
            {data.value.ai.length === 0 ? (
              <li class="px-4 py-6 text-sm text-gray-500">Sin datos todavía.</li>
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
                    <MiniSparkline points={sparkFromToken(t)} />
                    <MarketChangePill value={t.percentChange24h} label="24h" />
                  </Link>
                </li>
              ))
            )}
          </ul>
          {data.value.ai.length > PAGE_SIZE ? (
            <div class="flex items-center justify-between px-4 py-2 border-t border-[#043234] text-xs text-gray-400">
              <button type="button" onClick$={() => changePage("ai", data.value.ai.length, -1)} class="rounded px-2 py-1 border border-[#043234] hover:bg-[#043234]/50">{tx("Anterior","Previous")}</button>
              <span>Página {pageOf("ai")} / {totalPagesFor(data.value.ai)}</span>
              <button type="button" onClick$={() => changePage("ai", data.value.ai.length, 1)} class="rounded px-2 py-1 border border-[#043234] hover:bg-[#043234]/50">{tx("Siguiente","Next")}</button>
            </div>
          ) : null}
        </section>
      </div>

      <div class="grid gap-8 2xl:gap-10 lg:grid-cols-2 2xl:[grid-template-columns:repeat(auto-fit,minmax(320px,1fr))]">
        <section class="relative rounded-xl border border-[#043234] overflow-hidden bg-[#000D0E]/80">
          <div class="flex items-center justify-between px-4 py-3 border-b border-[#043234]">
            <h2 class="text-sm font-semibold text-white">New listings</h2>
            <Link href={`${base}/earlybird-coins/`} class="text-xs text-[#04E6E6] hover:underline">
              {tx("Ver tabla","View table")}
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
                    <MiniSparkline points={sparkFromToken(t)} />
                    <MarketChangePill value={t.percentChange24h} label="24h" />
                  </Link>
                </li>
              ))
            )}
          </ul>
          {data.value.earlybird.length > PAGE_SIZE ? (
            <div class="flex items-center justify-between px-4 py-2 border-t border-[#043234] text-xs text-gray-400">
              <button type="button" onClick$={() => changePage("earlybird", data.value.earlybird.length, -1)} class="rounded px-2 py-1 border border-[#043234] hover:bg-[#043234]/50">{tx("Anterior","Previous")}</button>
              <span>Página {pageOf("earlybird")} / {totalPagesFor(data.value.earlybird)}</span>
              <button type="button" onClick$={() => changePage("earlybird", data.value.earlybird.length, 1)} class="rounded px-2 py-1 border border-[#043234] hover:bg-[#043234]/50">{tx("Siguiente","Next")}</button>
            </div>
          ) : null}
        </section>

        <section class="relative rounded-xl border border-[#043234] overflow-hidden bg-[#000D0E]/80">
          <div class="flex items-center justify-between px-4 py-3 border-b border-[#043234]">
            <h2 class="text-sm font-semibold text-white">Most visited</h2>
            <Link href={`${base}/most-visit-coins/`} class="text-xs text-[#04E6E6] hover:underline">
              {tx("Ver tabla","View table")}
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
                    <MiniSparkline points={sparkFromToken(t)} />
                    <MarketChangePill value={t.percentChange24h} label="24h" />
                  </Link>
                </li>
              ))
            )}
          </ul>
          {data.value.mostVisited.rows.length > PAGE_SIZE ? (
            <div class="flex items-center justify-between px-4 py-2 border-t border-[#043234] text-xs text-gray-400">
              <button type="button" onClick$={() => changePage("mostVisited", data.value.mostVisited.rows.length, -1)} class="rounded px-2 py-1 border border-[#043234] hover:bg-[#043234]/50">{tx("Anterior","Previous")}</button>
              <span>Página {pageOf("mostVisited")} / {totalPagesFor(data.value.mostVisited.rows)}</span>
              <button type="button" onClick$={() => changePage("mostVisited", data.value.mostVisited.rows.length, 1)} class="rounded px-2 py-1 border border-[#043234] hover:bg-[#043234]/50">{tx("Siguiente","Next")}</button>
            </div>
          ) : null}
        </section>
      </div>

      <div class="grid gap-8 2xl:gap-10 lg:grid-cols-2 2xl:[grid-template-columns:repeat(auto-fit,minmax(320px,1fr))]">
        <section class="relative rounded-xl border border-[#043234] overflow-hidden bg-[#000D0E]/80">
          <div class="flex items-center justify-between px-4 py-3 border-b border-[#043234]">
            <h2 class="text-sm font-semibold text-white">Gaming</h2>
            <Link href={`${base}/gaming-coins/`} class="text-xs text-[#04E6E6] hover:underline">
              {tx("Ver tabla","View table")}
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
                    <MiniSparkline points={sparkFromToken(t)} />
                    <MarketChangePill value={t.percentChange24h} label="24h" />
                  </Link>
                </li>
              ))
            )}
          </ul>
          {data.value.gaming.length > PAGE_SIZE ? (
            <div class="flex items-center justify-between px-4 py-2 border-t border-[#043234] text-xs text-gray-400">
              <button type="button" onClick$={() => changePage("gaming", data.value.gaming.length, -1)} class="rounded px-2 py-1 border border-[#043234] hover:bg-[#043234]/50">{tx("Anterior","Previous")}</button>
              <span>Página {pageOf("gaming")} / {totalPagesFor(data.value.gaming)}</span>
              <button type="button" onClick$={() => changePage("gaming", data.value.gaming.length, 1)} class="rounded px-2 py-1 border border-[#043234] hover:bg-[#043234]/50">{tx("Siguiente","Next")}</button>
            </div>
          ) : null}
        </section>

        <section class="relative rounded-xl border border-[#043234] overflow-hidden bg-[#000D0E]/80">
          <div class="flex items-center justify-between px-4 py-3 border-b border-[#043234]">
            <h2 class="text-sm font-semibold text-white">Mineable</h2>
            <Link href={`${base}/mineable-coins/`} class="text-xs text-[#04E6E6] hover:underline">
              {tx("Ver tabla","View table")}
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
                    <MiniSparkline points={sparkFromToken(t)} />
                    <MarketChangePill value={t.percentChange24h} label="24h" />
                  </Link>
                </li>
              ))
            )}
          </ul>
          {data.value.mineable.length > PAGE_SIZE ? (
            <div class="flex items-center justify-between px-4 py-2 border-t border-[#043234] text-xs text-gray-400">
              <button type="button" onClick$={() => changePage("mineable", data.value.mineable.length, -1)} class="rounded px-2 py-1 border border-[#043234] hover:bg-[#043234]/50">{tx("Anterior","Previous")}</button>
              <span>Página {pageOf("mineable")} / {totalPagesFor(data.value.mineable)}</span>
              <button type="button" onClick$={() => changePage("mineable", data.value.mineable.length, 1)} class="rounded px-2 py-1 border border-[#043234] hover:bg-[#043234]/50">{tx("Siguiente","Next")}</button>
            </div>
          ) : null}
        </section>
      </div>

      <section class="relative overflow-hidden rounded-2xl border border-[#0d5357]/90 bg-gradient-to-br from-[#001317] via-[#001b1f] to-[#000c10] shadow-xl shadow-black/30">
        <div class="pointer-events-none absolute -top-16 -right-16 h-56 w-56 rounded-full bg-[#04E6E6]/10 blur-3xl" aria-hidden="true" />
        <div class="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-violet-500/10 blur-3xl" aria-hidden="true" />

        <header class="relative flex flex-wrap items-start justify-between gap-3 border-b border-[#0d5357]/55 px-5 py-4">
          <div class="flex items-start gap-3">
            <span class="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#04E6E6]/25 to-[#04E6E6]/5 text-[#04E6E6] ring-1 ring-[#04E6E6]/35">
              <LuRadar class="h-5 w-5" />
              <span class="absolute inset-0 rounded-xl ring-2 ring-[#04E6E6]/25 animate-ping" aria-hidden="true" />
            </span>
            <div class="min-w-0">
              <h2 class="inline-flex items-center text-base font-semibold text-white">
                {tx("Radar de oportunidades", "Opportunity Radar")}
                <HelpTooltip
                  text={tx(
                    "Resumen visual: tokens con mejor momentum, posibles reversiones, mayor liquidez y mejor score compuesto.",
                    "Visual summary: tokens with best momentum, potential reversals, highest liquidity and best composite score.",
                  )}
                />
              </h2>
              <p class="mt-0.5 max-w-xl text-[11px] leading-snug text-slate-400">
                {tx(
                  "Cuatro lecturas rápidas del mercado para detectar oportunidades antes de profundizar en cada token.",
                  "Four quick market reads to spot opportunities before diving into each token.",
                )}
              </p>
            </div>
          </div>
          <span class="rounded-full border border-[#04E6E6]/30 bg-[#04E6E6]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#9bf8f8]">
            {tx("Vista accionable", "Actionable view")}
          </span>
        </header>

        <div class="relative grid gap-3 p-4 lg:grid-cols-2 xl:grid-cols-4">
          <article class="rounded-xl border border-emerald-500/25 bg-gradient-to-b from-emerald-500/[0.06] to-transparent p-3">
            <div class="mb-2 flex items-center justify-between gap-2">
              <span class="inline-flex items-center gap-2">
                <span class="rounded-lg bg-emerald-500/20 p-1.5 text-emerald-300">
                  <LuTrendingUp class="h-3.5 w-3.5" />
                </span>
                <h3 class="text-[10px] font-semibold uppercase tracking-wide text-emerald-200">
                  {tx("Líderes momentum", "Momentum leaders")}
                </h3>
              </span>
              {InlineHelpTip(
                tx(
                  "Tokens con mejor desempeño combinado de 24 h y 7 d.",
                  "Tokens with the best combined 24h and 7d performance.",
                ),
              )}
            </div>
            <ul class="space-y-1">
              {radarMomentum.length === 0 ? (
                <li class="px-2 py-1.5 text-xs italic text-slate-500">{tx("Sin datos.", "No data.")}</li>
              ) : (
                radarMomentum.map((t: any) => (
                  <li key={`radar-m-${t.id}`}>
                    <Link
                      href={`/${L}/token/${t.id}/`}
                      class="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-emerald-500/10"
                    >
                      <span class="flex min-w-0 items-center gap-2">
                        <TokenLogoImg src={String(t.logo ?? "")} symbol={String(t.symbol)} size={18} />
                        <span class="truncate text-xs font-medium text-slate-100">{t.symbol}</span>
                      </span>
                      <MarketRegimeBadge score={regimeScore(t)} />
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </article>

          <article class="rounded-xl border border-amber-500/25 bg-gradient-to-b from-amber-500/[0.06] to-transparent p-3">
            <div class="mb-2 flex items-center justify-between gap-2">
              <span class="inline-flex items-center gap-2">
                <span class="rounded-lg bg-amber-500/20 p-1.5 text-amber-300">
                  <LuRefreshCw class="h-3.5 w-3.5" />
                </span>
                <h3 class="text-[10px] font-semibold uppercase tracking-wide text-amber-200">
                  {tx("Reversión potencial", "Potential reversals")}
                </h3>
              </span>
              {InlineHelpTip(
                tx(
                  "Tokens en rojo a 24 h pero verdes a 7 d: posible rebote.",
                  "Red on 24h but green on 7d: possible bounce.",
                ),
              )}
            </div>
            <ul class="space-y-1">
              {radarReversal.length === 0 ? (
                <li class="px-2 py-1.5 text-xs italic text-slate-500">
                  {tx("Sin señales claras ahora.", "No clear signals right now.")}
                </li>
              ) : (
                radarReversal.map((t: any) => (
                  <li key={`radar-r-${t.id}`}>
                    <Link
                      href={`/${L}/token/${t.id}/`}
                      class="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-amber-500/10"
                    >
                      <span class="flex min-w-0 items-center gap-2">
                        <TokenLogoImg src={String(t.logo ?? "")} symbol={String(t.symbol)} size={18} />
                        <span class="truncate text-xs font-medium text-slate-100">{t.symbol}</span>
                      </span>
                      <span class="flex shrink-0 items-center gap-1 text-[10px] tabular-nums">
                        <span class="text-rose-300">{n(t.percentChange24h).toFixed(2)}%</span>
                        <span class="text-slate-600">/</span>
                        <span class="text-emerald-300">{n(t.percentChange7d).toFixed(2)}%</span>
                      </span>
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </article>

          <article class="rounded-xl border border-cyan-500/25 bg-gradient-to-b from-cyan-500/[0.06] to-transparent p-3">
            <div class="mb-2 flex items-center justify-between gap-2">
              <span class="inline-flex items-center gap-2">
                <span class="rounded-lg bg-cyan-500/20 p-1.5 text-cyan-300">
                  <LuWaves class="h-3.5 w-3.5" />
                </span>
                <h3 class="text-[10px] font-semibold uppercase tracking-wide text-cyan-200">
                  {tx("Liquidez alta", "High liquidity")}
                </h3>
              </span>
              {InlineHelpTip(
                tx(
                  "Tokens con mayor volumen de operaciones en 24 h.",
                  "Tokens with the largest 24h trading volume.",
                ),
              )}
            </div>
            <ul class="space-y-1">
              {radarVolume.length === 0 ? (
                <li class="px-2 py-1.5 text-xs italic text-slate-500">{tx("Sin datos.", "No data.")}</li>
              ) : (
                radarVolume.map((t: any) => (
                  <li key={`radar-v-${t.id}`}>
                    <Link
                      href={`/${L}/token/${t.id}/`}
                      class="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-cyan-500/10"
                    >
                      <span class="flex min-w-0 items-center gap-2">
                        <TokenLogoImg src={String(t.logo ?? "")} symbol={String(t.symbol)} size={18} />
                        <span class="truncate text-xs font-medium text-slate-100">{t.symbol}</span>
                      </span>
                      <span class="shrink-0 text-[10px] font-semibold tabular-nums text-cyan-200">
                        {formatUsdLiquidity(t.volume)}
                      </span>
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </article>

          <article class="rounded-xl border border-violet-500/25 bg-gradient-to-b from-violet-500/[0.06] to-transparent p-3">
            <div class="mb-2 flex items-center justify-between gap-2">
              <span class="inline-flex items-center gap-2">
                <span class="rounded-lg bg-violet-500/20 p-1.5 text-violet-300">
                  <LuTrophy class="h-3.5 w-3.5" />
                </span>
                <h3 class="text-[10px] font-semibold uppercase tracking-wide text-violet-200">
                  {tx("Mejor score compuesto", "Best composite score")}
                </h3>
              </span>
              {InlineHelpTip(
                tx(
                  "Score 0-100 que mezcla momentum, liquidez y baja volatilidad.",
                  "0-100 score blending momentum, liquidity and low volatility.",
                ),
              )}
            </div>
            <ul class="space-y-1">
              {radarBestSet.slice(0, 4).map((t: any) => (
                <li key={`radar-s-${t.id}`}>
                  <Link
                    href={`/${L}/token/${t.id}/`}
                    class="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-violet-500/10"
                  >
                    <span class="flex min-w-0 items-center gap-2">
                      <TokenLogoImg src={String(t.logo ?? "")} symbol={String(t.symbol)} size={18} />
                      <span class="truncate text-xs font-medium text-slate-100">{t.symbol}</span>
                    </span>
                    <span class="shrink-0 rounded-md border border-violet-400/40 bg-violet-500/15 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-violet-100">
                      {opportunityScore(t)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </article>
        </div>

        <div class="relative px-4 pb-4">
          <div class="mb-2 flex items-center justify-between gap-2">
            <h3 class="inline-flex items-center text-xs font-semibold uppercase tracking-wide text-slate-300">
              <LuSparkles class="mr-1.5 h-3.5 w-3.5 text-[#04E6E6]" />
              {tx("Detalle de los tokens con mejor score", "Top scored tokens detail")}
            </h3>
            <span class="text-[10px] text-slate-500">
              {tx("Toca un token para ver su ficha", "Tap a token to open its page")}
            </span>
          </div>
          <div class="overflow-x-auto rounded-xl border border-[#0d5357]/70 bg-[#000d10]/60">
            <table class="w-full min-w-[820px] text-xs">
              <thead class="bg-[#00151a]/95 text-[10px] uppercase tracking-wide text-slate-400">
                <tr>
                  <th class="px-3 py-2 text-left">{tx("Token", "Token")}</th>
                  <th class="px-3 py-2 text-right">24h</th>
                  <th class="px-3 py-2 text-right">7d</th>
                  <th class="px-3 py-2 text-right">{tx("Liquidez", "Liquidity")}</th>
                  <th class="px-3 py-2 text-right">{tx("Volatilidad", "Volatility")}</th>
                  <th class="px-3 py-2 text-right">{tx("Tendencia", "Trend")}</th>
                  <th class="px-3 py-2 text-right">{tx("Score", "Score")}</th>
                </tr>
              </thead>
              <tbody>
                {radarBestSet.length === 0 ? (
                  <tr>
                    <td colSpan={7} class="px-3 py-6 text-center text-xs italic text-slate-500">
                      {tx("Sin datos disponibles ahora mismo.", "No data available right now.")}
                    </td>
                  </tr>
                ) : (
                  radarBestSet.map((t: any) => {
                    const c24 = n(t.percentChange24h);
                    const c7 = n(t.percentChange7d);
                    const liq = Math.round(liquidityScore(t));
                    const vol = Math.round(volatilityScore(t));
                    const score = opportunityScore(t);
                    const scoreColor =
                      score >= 75
                        ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-200"
                        : score >= 60
                        ? "border-cyan-400/40 bg-cyan-500/15 text-cyan-200"
                        : score >= 45
                        ? "border-amber-400/40 bg-amber-500/15 text-amber-200"
                        : "border-rose-400/40 bg-rose-500/15 text-rose-200";
                    const pctClass = (v: number) =>
                      v > 0 ? "text-emerald-300" : v < 0 ? "text-rose-300" : "text-slate-300";
                    return (
                      <tr
                        key={`radar-row-${t.id}`}
                        class="border-t border-[#0d5357]/50 hover:bg-[#04E6E6]/[0.05] transition-colors"
                      >
                        <td class="px-3 py-2">
                          <Link
                            href={`/${L}/token/${t.id}/`}
                            class="flex items-center gap-2 font-medium text-slate-100 hover:text-[#04E6E6]"
                          >
                            <TokenLogoImg src={String(t.logo ?? "")} symbol={String(t.symbol)} size={20} />
                            <span class="truncate">
                              {t.name} <span class="text-slate-500">({t.symbol})</span>
                            </span>
                          </Link>
                        </td>
                        <td class={`px-3 py-2 text-right tabular-nums ${pctClass(c24)}`}>
                          {c24 > 0 ? "+" : ""}
                          {c24.toFixed(2)}%
                        </td>
                        <td class={`px-3 py-2 text-right tabular-nums ${pctClass(c7)}`}>
                          {c7 > 0 ? "+" : ""}
                          {c7.toFixed(2)}%
                        </td>
                        <td class="px-3 py-2 text-right">
                          <div class="ml-auto flex w-28 items-center justify-end gap-2">
                            <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-[#0d5357]/60">
                              <div
                                class="h-full bg-cyan-400/75"
                                style={{ width: `${Math.min(100, Math.max(0, liq))}%` }}
                              />
                            </div>
                            <span class="w-7 text-right tabular-nums text-cyan-200">{liq}</span>
                          </div>
                        </td>
                        <td class="px-3 py-2 text-right">
                          <div class="ml-auto flex w-28 items-center justify-end gap-2">
                            <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-[#0d5357]/60">
                              <div
                                class="h-full bg-amber-400/75"
                                style={{ width: `${Math.min(100, Math.max(0, vol))}%` }}
                              />
                            </div>
                            <span class="w-7 text-right tabular-nums text-amber-200">{vol}</span>
                          </div>
                        </td>
                        <td class="px-3 py-2">
                          <div class="flex justify-end">
                            <MiniSparkline points={sparkFromToken(t)} />
                          </div>
                        </td>
                        <td class="px-3 py-2 text-right">
                          <span
                            class={`inline-flex min-w-[2.25rem] items-center justify-center rounded-md border px-2 py-0.5 text-[11px] font-bold tabular-nums ${scoreColor}`}
                          >
                            {score}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section class="grid gap-3 2xl:gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <div class="relative rounded-xl border border-[#043234] bg-gradient-to-br from-[#001a1c] to-[#000D0E] p-4 2xl:p-5">
          {HelpTip("Cantidad total de monedas disponibles en la app.")}
          <p class="text-[11px] uppercase tracking-wide text-gray-500">Monedas disponibles</p>
          <p class="text-2xl font-semibold text-white mt-1 tabular-nums">{st.totalTokens.toLocaleString()}</p>
          <p class="text-xs text-gray-500 mt-2">Total de monedas en todas las categorías.</p>
        </div>
        <div class="relative rounded-xl border border-[#043234] bg-[#001a1c]/80 p-4 2xl:p-5">
          {HelpTip("Cantidad de colecciones NFT destacadas ahora mismo.")}
          <p class="text-[11px] uppercase tracking-wide text-gray-500">NFT destacados</p>
          <p class="text-2xl font-semibold text-[#04E6E6] mt-1 tabular-nums">
            {data.value.nftGlobal.ok ? data.value.nftGlobal.hottestCount : "—"}
          </p>
          <p class="text-xs text-gray-500 mt-2">
            <Link href={`${base}/nfts/`} class="text-[#04E6E6]/90 hover:underline">
              Ver colecciones NFT →
            </Link>
          </p>
        </div>
        <div class="relative rounded-xl border border-[#043234] bg-[#001a1c]/80 p-4 2xl:p-5">
          {HelpTip("Cantidad de señales de ballenas registradas en las últimas 24 horas.")}
          <p class="text-[11px] uppercase tracking-wide text-gray-500">Whale alerts (24h)</p>
          <p class="text-2xl font-semibold text-[#04E6E6] mt-1 tabular-nums">{st.signals24h.whales}</p>
          <p class="text-xs text-gray-500 mt-2">Actividad registrada en las últimas 24 h.</p>
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
          <p class="text-xs text-gray-500 mt-2">Flujos y alertas on-chain.</p>
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
                  Con Pro obtienes el <strong class="text-gray-300">asistente IA</strong> sobre datos agregados,{" "}
                  <strong class="text-gray-300">señales en vivo</strong> (smart money y ballenas) y{" "}
                  <strong class="text-gray-300">alertas USDT</strong> en el panel. La activación es por pago verificado en
                  USDT (red e importe en el modal). Las <strong class="text-gray-300">notificaciones push</strong> del menú
                  solo registran tu dispositivo; el acceso Pro depende del pago confirmado.
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
          Plan <strong>Pro</strong> activo: asistente IA, señales en vivo y alertas USDT.
        </section>
      )}

    </div>
    </>
  );
});

