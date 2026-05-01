import { component$, useComputed$, useSignal, $, useVisibleTask$ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";
import { Link, routeLoader$, useLocation } from "@builder.io/qwik-city";
import { useDashboardAuth } from "../layout";
import { desc, eq, sql } from "drizzle-orm";
import {
  BubbleChartD3,
  pctForTimeframe,
  type BubbleColorBy,
  type BubbleContentBy,
  type BubbleSizeBy,
  type BubbleTimeframe,
  type BubbleToken,
} from "~/components/crypto/bubble-chart-d3";
import { BubbleCurrencyPicker } from "~/components/crypto-dashboard/bubble-currency-picker";
import { TokenLogoImg } from "~/components/crypto-dashboard/token-logo";
import {
  bubbleQuoteFactor,
  extractCryptoAnchorsFromRows,
  fetchUsdFiatRates,
  formatBubbleMetricFromUsd,
  isBubbleQuoteId,
  type BubbleQuoteId,
} from "~/utils/bubble-quote";
import { db } from "~/lib/turso";
import { fetchCmcQuotesUsdMapByIds } from "~/server/crypto-helper/cmc-live";
import {
  cmcUsdNumericField,
  extractCmcUsdFromSnapshot,
  parseTokenApiSnapshot,
} from "~/server/crypto-helper/market-token-snapshot";
import { cachedMarketTokens } from "../../../../drizzle/schema";
import { HelpTooltip } from "~/components/ui/help-tooltip";
import { listMyWatchlist, removeWatchlistItem, upsertWatchlistItem } from "~/server/watchlist-actions";

export const head: DocumentHead = {
  title: "Crypto Bubbles Heatmap | Crypto Helper",
  meta: [
    {
      name: "description",
      content:
        "Interactive crypto bubbles by market cap, volume, and performance timeframes across top tokens.",
    },
  ],
};

const TIMEFRAMES: { id: BubbleTimeframe; label: string }[] = [
  { id: "1h", label: "Hour" },
  { id: "24h", label: "Day" },
  { id: "7d", label: "Week" },
  { id: "30d", label: "Month" },
  { id: "90d", label: "Year" },
];

const RANK_OPTIONS = [
  { v: "50", label: "1 – 50" },
  { v: "100", label: "1 – 100" },
  { v: "200", label: "1 – 200" },
  { v: "all", label: "All" },
] as const;

function strColPct(col: string | null | undefined): string | undefined {
  if (col == null || String(col).trim() === "") return undefined;
  const p = Number(String(col).replace(",", ".").replace(/%/g, "").trim());
  return Number.isFinite(p) ? String(p) : undefined;
}

function cmcUsdFromRowSnapshot(row: typeof cachedMarketTokens.$inferSelect): Record<string, unknown> | null {
  const snap = parseTokenApiSnapshot(row.apiSnapshot ?? null);
  return extractCmcUsdFromSnapshot(snap, row.cmcId);
}

/**
 * Prefer live `quotes/latest` (batch on page load), then apiSnapshot, then table columns.
 */
function rowForBubbles(
  row: typeof cachedMarketTokens.$inferSelect,
  liveUsdByCmcId?: Map<number, Record<string, unknown>>,
): BubbleToken {
  const cmcNum = row.cmcId != null && Number.isFinite(Number(row.cmcId)) ? Math.trunc(Number(row.cmcId)) : null;
  const liveUsd = cmcNum != null ? liveUsdByCmcId?.get(cmcNum) : undefined;
  const usd = liveUsd ?? cmcUsdFromRowSnapshot(row);
  const pick = (cmcKey: string, col: string | null | undefined): string => {
    const fromCmc = usd ? cmcUsdNumericField(usd, cmcKey) : undefined;
    if (fromCmc !== undefined) return fromCmc;
    return strColPct(col) ?? "0";
  };
  const pick24 = (): string | undefined => {
    const fromCmc = usd ? cmcUsdNumericField(usd, "percent_change_24h") : undefined;
    if (fromCmc !== undefined) return fromCmc;
    return strColPct(row.percentChange24h);
  };
  const pick90 = (): string | undefined => {
    const fromCmc = usd ? cmcUsdNumericField(usd, "percent_change_90d") : undefined;
    if (fromCmc !== undefined) return fromCmc;
    return strColPct(row.percentChange90d);
  };

  return {
    id: row.id,
    symbol: row.symbol,
    name: row.name,
    logo: row.logo,
    volume: row.volume ?? "0",
    fullyDilutedValuation: row.fullyDilutedValuation ?? undefined,
    percentChange1h: pick("percent_change_1h", row.percentChange1h),
    percentChange24h: pick24(),
    percentChange7d: pick("percent_change_7d", row.percentChange7d),
    percentChange30d: pick("percent_change_30d", row.percentChange30d),
    percentChange90d: pick90(),
  };
}

export const useBubblesLoader = routeLoader$(async () => {
  try {
    const [fxRates, rows] = await Promise.all([
      fetchUsdFiatRates(),
      db
        .select()
        .from(cachedMarketTokens)
        .where(eq(cachedMarketTokens.category, "volume"))
        .orderBy(desc(sql`cast(${cachedMarketTokens.volume} as real)`))
        .limit(220)
        .all(),
    ]);
    const cryptoUsd = extractCryptoAnchorsFromRows(rows);
    const cmcIds = rows
      .map((r) => r.cmcId)
      .filter((n): n is number => n != null && Number.isFinite(Number(n)) && Number(n) > 0)
      .map((n) => Math.trunc(Number(n)));
    const liveUsd = await fetchCmcQuotesUsdMapByIds(cmcIds);
    return {
      tokens: rows.map((r) => rowForBubbles(r, liveUsd)),
      fxRates,
      cryptoUsd,
    };
  } catch (e) {
    console.error("[useBubblesLoader]", e);
    return {
      tokens: [] as BubbleToken[],
      fxRates: {} as Record<string, number>,
      cryptoUsd: { BTC: 0, ETH: 0, SOL: 0 },
    };
  }
});

export const useBubblesWatchlistLoader = routeLoader$(async () => {
  const rows = await listMyWatchlist();
  return rows.filter((r) => r.itemType === "token").map((r) => r.itemKey);
});

export default component$(() => {
  const auth = useDashboardAuth();
  const data = useBubblesLoader();
  const watchlistTokens = useBubblesWatchlistLoader();
  const loc = useLocation();
  const L = loc.params.locale || "en-us";

  const search = useSignal("");
  const rankPreset = useSignal<(typeof RANK_OPTIONS)[number]["v"]>("100");
  const timeframe = useSignal<BubbleTimeframe>("24h");
  const sizeBy = useSignal<BubbleSizeBy>("fdv");
  const colorBy = useSignal<BubbleColorBy>("performance");
  const contentBy = useSignal<BubbleContentBy>("symbol-change");
  const view = useSignal<"bubbles" | "list">("bubbles");
  const chartHost = useSignal<HTMLDivElement | undefined>(undefined);
  const quoteId = useSignal<BubbleQuoteId>("USD");
  const quoteHydrated = useSignal(false);
  const watchSet = useSignal<Set<string>>(new Set(watchlistTokens.value));
  const watchBusy = useSignal<Record<string, boolean>>({});

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ track }) => {
    track(() => data.value.tokens.length);
    if (quoteHydrated.value) return;
    quoteHydrated.value = true;
    try {
      const s = localStorage.getItem("cg-bubble-quote");
      if (s && isBubbleQuoteId(s)) {
        const { ok } = bubbleQuoteFactor(s, data.value.fxRates, data.value.cryptoUsd);
        if (ok || s === "USD") quoteId.value = s;
      }
    } catch {
      /* ignore */
    }
  });

  // eslint-disable-next-line qwik/no-use-visible-task
  useVisibleTask$(({ track }) => {
    track(() => watchlistTokens.value.join("|"));
    watchSet.value = new Set(watchlistTokens.value);
  });

  const quoteCtx = useComputed$(() =>
    bubbleQuoteFactor(quoteId.value, data.value.fxRates, data.value.cryptoUsd),
  );

  const filteredList = useComputed$(() => {
    const raw = data.value.tokens as BubbleToken[];
    const q = search.value.trim().toLowerCase();
    let arr = raw.filter((t) => {
      if (!q) return true;
      return String(t.name).toLowerCase().includes(q) || String(t.symbol).toLowerCase().includes(q);
    });
    const metric = (t: BubbleToken) =>
      sizeBy.value === "fdv" ? Number(t.fullyDilutedValuation) || 0 : Number(t.volume) || 0;
    arr = [...arr].sort((a, b) => metric(b) - metric(a));
    const cap = rankPreset.value === "all" ? arr.length : parseInt(rankPreset.value, 10);
    return arr.slice(0, Math.min(cap, arr.length));
  });

  const metricLabel = useComputed$(() => {
    const sz = sizeBy.value === "fdv" ? "Market cap (FDV)" : "Volume 24h";
    const tf = TIMEFRAMES.find((x) => x.id === timeframe.value)?.label ?? timeframe.value;
    const q = quoteId.value;
    return `${sz} · ${tf} · ${q}`;
  });

  const goFullscreen = $(async () => {
    const el = chartHost.value;
    if (!el) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await el.requestFullscreen();
    } catch {
      /* ignore */
    }
  });

  const rawCount = (data.value.tokens as BubbleToken[]).length;
  const list = filteredList.value;
  const qScale = quoteCtx.value.factor;
  const qId = quoteId.value;

  const toggleTokenWatch = $(async (t: BubbleToken) => {
    const key = String(t.id);
    if (watchBusy.value[key]) return;
    watchBusy.value = { ...watchBusy.value, [key]: true };
    try {
      if (watchSet.value.has(key)) {
        const r = await removeWatchlistItem({ itemType: "token", itemKey: key });
        if (r.ok) {
          const next = new Set(watchSet.value);
          next.delete(key);
          watchSet.value = next;
        }
      } else {
        const r = await upsertWatchlistItem({
          itemType: "token",
          itemKey: key,
          label: `${t.name} (${t.symbol})`,
          meta: { symbol: t.symbol, name: t.name, logo: t.logo ?? null },
        });
        if (r.ok) {
          const next = new Set(watchSet.value);
          next.add(key);
          watchSet.value = next;
        } else if (r.requiresLogin && typeof window !== "undefined") {
          window.alert("Debes iniciar sesión para guardar favoritos.");
        }
      }
    } finally {
      watchBusy.value = { ...watchBusy.value, [key]: false };
    }
  });

  return (
    <div class="relative text-gray-200">
      <header class="mb-4 rounded-xl border border-[#1e3638] bg-[#0a1214] px-3 py-3 sm:px-4">
        <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div class="flex items-center gap-2">
            <span class="inline-flex items-center text-lg font-black tracking-tight text-[#04E6E6]">
              CRYPTO BUBBLES
              <HelpTooltip text="Mapa interactivo: tamaño por FDV/volumen y color por variación del periodo seleccionado." />
            </span>
            <span class="text-[10px] font-medium uppercase tracking-wider text-gray-600">CryptoHelper</span>
          </div>
          <div class="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-center lg:max-w-xl">
            <input
              type="search"
              placeholder="Search cryptocurrency"
              class="w-full rounded-lg border border-[#043234] bg-[#060d0e] px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-[#04E6E6]/60 focus:outline-none focus:ring-1 focus:ring-[#04E6E6]/40"
              value={search.value}
              onInput$={$((e) => {
                search.value = (e.target as HTMLInputElement).value;
              })}
            />
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <select
              class="rounded-lg border border-[#043234] bg-[#060d0e] px-2 py-2 text-xs text-gray-300"
              value={rankPreset.value}
              onChange$={$((e) => {
                rankPreset.value = (e.target as HTMLSelectElement).value as (typeof RANK_OPTIONS)[number]["v"];
              })}
            >
              {RANK_OPTIONS.map((o) => (
                <option key={o.v} value={o.v} class="bg-[#0b0b0b]">
                  {o.label}
                </option>
              ))}
            </select>
            <BubbleCurrencyPicker
              value={quoteId.value}
              fxRates={data.value.fxRates}
              cryptoUsd={data.value.cryptoUsd}
              onChange$={$((id: BubbleQuoteId) => {
                quoteId.value = id;
                try {
                  localStorage.setItem("cg-bubble-quote", id);
                } catch {
                  /* ignore */
                }
              })}
            />
            <div class="flex rounded-lg border border-[#043234] p-0.5">
              <button
                type="button"
                class={`rounded-md px-2 py-1.5 text-xs ${view.value === "list" ? "bg-[#04E6E6]/20 text-[#04E6E6]" : "text-gray-500"}`}
                onClick$={() => {
                  view.value = "list";
                }}
                title="List view"
              >
                List
              </button>
              <button
                type="button"
                class={`rounded-md px-2 py-1.5 text-xs ${view.value === "bubbles" ? "bg-[#04E6E6]/20 text-[#04E6E6]" : "text-gray-500"}`}
                onClick$={() => {
                  view.value = "bubbles";
                }}
                title="Bubble view"
              >
                Bubbles
              </button>
            </div>
            <button
              type="button"
              class="inline-flex items-center gap-1.5 rounded-lg border border-[#043234] px-2.5 py-2 text-xs font-medium text-gray-300 hover:border-[#04E6E6]/50 hover:text-[#04E6E6]"
              onClick$={goFullscreen}
              title="Fullscreen chart"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                />
              </svg>
              Fullscreen
            </button>
          </div>
        </div>

        <div class="mt-3 flex flex-col gap-3 border-t border-[#043234]/50 pt-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div class="flex flex-wrap gap-1.5">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf.id}
                type="button"
                class={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  timeframe.value === tf.id
                    ? "border-2 border-[#04E6E6] text-[#04E6E6] shadow-[0_0_12px_rgba(4,230,230,0.25)]"
                    : "border border-transparent text-gray-500 hover:text-gray-300"
                }`}
                onClick$={() => {
                  timeframe.value = tf.id;
                }}
              >
                {tf.label}
              </button>
            ))}
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <span class="inline-flex items-center rounded-lg border border-[#043234] bg-[#060d0e] px-3 py-1.5 text-xs font-medium text-gray-400">
              {metricLabel.value}
              <HelpTooltip text="Métrica activa para tamaño y variación de las burbujas." />
            </span>
            <select
              class="rounded-lg border border-[#043234] bg-[#060d0e] px-2 py-1.5 text-xs text-gray-300"
              value={sizeBy.value}
              onChange$={$((e) => {
                sizeBy.value = (e.target as HTMLSelectElement).value as BubbleSizeBy;
              })}
            >
              <option value="fdv">Size: FDV (market cap proxy)</option>
              <option value="volume">Size: 24h volume</option>
            </select>
          </div>
        </div>

        <div class="mt-3 grid gap-2 rounded-lg border border-[#043234]/60 bg-[#060d0e]/70 p-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p class="mb-1 text-[10px] uppercase tracking-wide text-slate-500">Period</p>
            <div class="flex flex-wrap gap-1">
              {TIMEFRAMES.map((tf) => (
                <button
                  key={`tf-chip-${tf.id}`}
                  type="button"
                  class={`rounded-md px-2 py-1 text-[11px] ${
                    timeframe.value === tf.id ? "bg-[#04E6E6]/20 text-[#7ffdfd]" : "bg-slate-700/40 text-slate-300 hover:bg-slate-700/70"
                  }`}
                  onClick$={() => (timeframe.value = tf.id)}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p class="mb-1 text-[10px] uppercase tracking-wide text-slate-500">Bubble size</p>
            <div class="flex flex-wrap gap-1">
              {([
                { id: "fdv", label: "Market cap" },
                { id: "volume", label: "24h volume" },
              ] as const).map((o) => (
                <button
                  key={o.id}
                  type="button"
                  class={`rounded-md px-2 py-1 text-[11px] ${
                    sizeBy.value === o.id ? "bg-[#04E6E6]/20 text-[#7ffdfd]" : "bg-slate-700/40 text-slate-300 hover:bg-slate-700/70"
                  }`}
                  onClick$={() => (sizeBy.value = o.id)}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p class="mb-1 text-[10px] uppercase tracking-wide text-slate-500">Bubble content</p>
            <div class="flex flex-wrap gap-1">
              {([
                { id: "symbol-change", label: "Symbol + %" },
                { id: "symbol", label: "Symbol" },
                { id: "name", label: "Name" },
              ] as const).map((o) => (
                <button
                  key={o.id}
                  type="button"
                  class={`rounded-md px-2 py-1 text-[11px] ${
                    contentBy.value === o.id ? "bg-[#04E6E6]/20 text-[#7ffdfd]" : "bg-slate-700/40 text-slate-300 hover:bg-slate-700/70"
                  }`}
                  onClick$={() => (contentBy.value = o.id)}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p class="mb-1 text-[10px] uppercase tracking-wide text-slate-500">Bubble color</p>
            <div class="flex flex-wrap gap-1">
              {([
                { id: "performance", label: "Performance" },
                { id: "neutral", label: "Neutral" },
              ] as const).map((o) => (
                <button
                  key={o.id}
                  type="button"
                  class={`rounded-md px-2 py-1 text-[11px] ${
                    colorBy.value === o.id ? "bg-[#04E6E6]/20 text-[#7ffdfd]" : "bg-slate-700/40 text-slate-300 hover:bg-slate-700/70"
                  }`}
                  onClick$={() => (colorBy.value = o.id)}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {!quoteCtx.value.ok && qId !== "USD" ? (
        <p class="mb-2 text-xs text-amber-400/90">
          No conversion data for {qId}; bubble sizes use USD until rates or anchor prices load.
        </p>
      ) : null}

      <p class="mb-3 text-xs text-gray-600">
        Mostrando {list.length} de {rawCount} tokens del tablero de volumen · verde / rojo = variación en el periodo.{" "}
        <span class="text-gray-500">La vista anual usa ~90d % de cambio (alternativa 30d).</span>
      </p>
      <p class="mb-3 text-xs text-slate-500">
        {auth.value.hasPro !== undefined
          ? "Usa ☆ para guardar tokens en favoritos. Se requiere sesión iniciada."
          : "Inicia sesión para guardar favoritos."}
      </p>

      {rawCount === 0 ? (
        <p class="text-gray-500 text-sm">No hay datos de mercado para mostrar todavía. Volvé más tarde.</p>
      ) : view.value === "bubbles" ? (
        <>
          <div ref={chartHost} class="rounded-xl overflow-hidden">
            <BubbleChartD3
              list={list}
              timeframe={timeframe.value}
              sizeBy={sizeBy.value}
              colorBy={colorBy.value}
              contentBy={contentBy.value}
              highlightedTokenIds={Array.from(watchSet.value).map((x) => Number(x)).filter((n) => Number.isFinite(n))}
              quoteScale={qScale}
              quoteId={qId}
            />
          </div>
          <p class="text-[11px] text-gray-600 mt-3">
            Drag bubbles to rearrange. Click opens token detail. Hover dims the opposite direction.
          </p>
          <div class="mt-6">
            <div class="mb-2 flex items-center justify-between">
              <h3 class="text-sm font-semibold text-white">List format</h3>
              <button
                type="button"
                class="rounded-md border border-[#043234] px-2 py-1 text-[11px] text-slate-300 hover:border-[#04E6E6]/40 hover:text-[#04E6E6]"
                onClick$={() => {
                  view.value = "list";
                }}
              >
                Focus list view
              </button>
            </div>
            <div class="overflow-x-auto rounded-xl border border-[#043234]">
              <table class="w-full text-sm">
                <thead class="bg-[#043234]/40 text-left text-gray-500">
                  <tr>
                    <th class="p-3">#</th>
                    <th class="p-3">Token</th>
                    <th class="p-3">% ({timeframe.value})</th>
                    <th class="p-3">
                      {sizeBy.value === "fdv" ? "FDV" : "Vol"} ({qId})
                    </th>
                    <th class="p-3" />
                  </tr>
                </thead>
                <tbody>
                  {list.map((t, i) => {
                    const p = pctForTimeframe(t, timeframe.value);
                    const sizeVal =
                      sizeBy.value === "fdv"
                        ? Number(t.fullyDilutedValuation || 0)
                        : Number(t.volume || 0);
                    return (
                      <tr key={`list-inline-${t.id}`} class="border-t border-[#043234]/60 hover:bg-[#001a1c]">
                        <td class="p-3 text-gray-500">{i + 1}</td>
                        <td class="p-3">
                          <span class="flex items-center gap-2">
                            <TokenLogoImg src={String(t.logo ?? "")} symbol={String(t.symbol)} size={32} />
                            <span>
                              {t.name} <span class="text-gray-500">{t.symbol}</span>
                            </span>
                          </span>
                        </td>
                        <td class="p-3 tabular-nums">
                          <span class={p >= 0 ? "text-emerald-400" : "text-rose-400"}>
                            {p > 0 ? "+" : ""}
                            {p.toLocaleString(undefined, { maximumFractionDigits: 2 })}%
                          </span>
                        </td>
                        <td class="p-3 text-gray-400 tabular-nums">
                          {formatBubbleMetricFromUsd(sizeVal, qId, qScale)}
                        </td>
                        <td class="p-3">
                          <button
                            type="button"
                            class={`mr-3 rounded px-2 py-1 text-xs ${
                              watchSet.value.has(String(t.id))
                                ? "border border-amber-400/50 bg-amber-400/15 text-amber-300"
                                : "border border-[#043234] text-slate-400 hover:border-amber-400/40 hover:text-amber-300"
                            }`}
                            onClick$={() => toggleTokenWatch(t)}
                            disabled={watchBusy.value[String(t.id)]}
                            title="Toggle favorite"
                          >
                            {watchSet.value.has(String(t.id)) ? "★" : "☆"}
                          </button>
                          <Link href={`/${L}/token/${t.id}/`} class="text-[#04E6E6] hover:underline text-xs">
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div class="overflow-x-auto rounded-xl border border-[#043234]">
          <table class="w-full text-sm">
            <thead class="bg-[#043234]/40 text-left text-gray-500">
              <tr>
                <th class="p-3">#</th>
                <th class="p-3">Token</th>
                <th class="p-3">% ({timeframe.value})</th>
                <th class="p-3">
                  {sizeBy.value === "fdv" ? "FDV" : "Vol"} ({qId})
                </th>
                <th class="p-3" />
              </tr>
            </thead>
            <tbody>
              {list.map((t, i) => {
                const p = pctForTimeframe(t, timeframe.value);
                const sizeVal =
                  sizeBy.value === "fdv"
                    ? Number(t.fullyDilutedValuation || 0)
                    : Number(t.volume || 0);
                return (
                  <tr key={t.id} class="border-t border-[#043234]/60 hover:bg-[#001a1c]">
                    <td class="p-3 text-gray-500">{i + 1}</td>
                    <td class="p-3">
                      <span class="flex items-center gap-2">
                        <TokenLogoImg src={String(t.logo ?? "")} symbol={String(t.symbol)} size={32} />
                        <span>
                          {t.name} <span class="text-gray-500">{t.symbol}</span>
                        </span>
                      </span>
                    </td>
                    <td class="p-3 tabular-nums">
                      <span class={p >= 0 ? "text-emerald-400" : "text-rose-400"}>
                        {p > 0 ? "+" : ""}
                        {p.toLocaleString(undefined, { maximumFractionDigits: 2 })}%
                      </span>
                    </td>
                    <td class="p-3 text-gray-400 tabular-nums">
                      {formatBubbleMetricFromUsd(sizeVal, qId, qScale)}
                    </td>
                    <td class="p-3">
                      <button
                        type="button"
                        class={`mr-3 rounded px-2 py-1 text-xs ${
                          watchSet.value.has(String(t.id))
                            ? "border border-amber-400/50 bg-amber-400/15 text-amber-300"
                            : "border border-[#043234] text-slate-400 hover:border-amber-400/40 hover:text-amber-300"
                        }`}
                        onClick$={() => toggleTokenWatch(t)}
                        disabled={watchBusy.value[String(t.id)]}
                        title="Toggle favorite"
                      >
                        {watchSet.value.has(String(t.id)) ? "★" : "☆"}
                      </button>
                      <Link href={`/${L}/token/${t.id}/`} class="text-[#04E6E6] hover:underline text-xs">
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
});
