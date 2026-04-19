import { component$, useSignal, useVisibleTask$, $ } from "@builder.io/qwik";

declare global {
  interface Window {
    TradingView?: {
      widget: new (opts: Record<string, unknown>) => unknown;
    };
    __cgTvScriptPromise?: Promise<void>;
  }
}

function loadTradingViewScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.TradingView) return Promise.resolve();
  if (window.__cgTvScriptPromise) return window.__cgTvScriptPromise;
  window.__cgTvScriptPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://s3.tradingview.com/tv.js";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("TradingView script failed to load"));
    document.head.appendChild(s);
  });
  return window.__cgTvScriptPromise;
}

function clampTvPairIndex(i: number, len: number): number {
  return Math.min(Math.max(0, i), Math.max(0, len - 1));
}

export interface TradingViewAdvancedChartProps {
  /** Ordered CEX pairs to try (e.g. BINANCE:FOOUSDT). */
  symbols: string[];
  height?: number;
  /** Full Dexscreener page (new tab). */
  dexUrl?: string | null;
  /** Iframe embed URL with chart (on-chain fallback). */
  dexEmbedUrl?: string | null;
}

export const TradingViewAdvancedChart = component$((props: TradingViewAdvancedChartProps) => {
  const hostRef = useSignal<HTMLDivElement>();
  const pairIndex = useSignal(0);
  const height = props.height ?? 520;
  const list = props.symbols?.length ? props.symbols : ["BINANCE:BTCUSDT"];
  const hasDex = Boolean(props.dexEmbedUrl);
  const chartTab = useSignal<"dex" | "cex">(hasDex ? "dex" : "cex");

  useVisibleTask$(async ({ track, cleanup }) => {
    track(() => chartTab.value);
    track(() => props.symbols.map((s) => s).join("|"));
    track(() => pairIndex.value);

    const host = hostRef.value;
    if (!host) return;

    if (chartTab.value !== "cex") {
      host.innerHTML = "";
      return;
    }

    const symbols = props.symbols?.length ? props.symbols : ["BINANCE:BTCUSDT"];
    const idx = clampTvPairIndex(pairIndex.value, symbols.length);
    const symbol = symbols[idx] ?? "BINANCE:BTCUSDT";
    if (!symbol) return;

    const safeId = `tv_chart_${Math.random().toString(36).slice(2, 11)}`;
    host.innerHTML = `<div id="${safeId}" style="height:${height}px;width:100%;min-height:${height}px" />`;

    try {
      await loadTradingViewScript();
    } catch {
      host.innerHTML =
        '<p class="text-sm text-amber-400 p-4">Could not load TradingView. Check your network or ad blocker.</p>';
      return;
    }

    const TV = window.TradingView?.widget;
    if (!TV) {
      host.innerHTML =
        '<p class="text-sm text-amber-400 p-4">TradingView is unavailable in this environment.</p>';
      return;
    }

    // eslint-disable-next-line no-new
    new TV({
      autosize: true,
      symbol,
      interval: "D",
      timezone: "Etc/UTC",
      theme: "dark",
      style: "1",
      locale: "en",
      toolbar_bg: "#001a1c",
      enable_publishing: false,
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      container_id: safeId,
      allow_symbol_change: true,
      details: true,
    });

    cleanup(() => {
      host.innerHTML = "";
    });
  });

  const tabBtn = (active: boolean) =>
    `rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
      active
        ? "bg-[#04E6E6]/20 text-[#04E6E6] ring-1 ring-[#04E6E6]/40"
        : "bg-[#001318] text-gray-400 hover:text-gray-200 ring-1 ring-[#043234]"
    }`;

  return (
    <div class="w-full">
      {hasDex ? (
        <div class="mb-3 flex flex-wrap items-center gap-2">
          <span class="text-[11px] font-medium uppercase tracking-wide text-gray-500 mr-1">Chart</span>
          <button
            type="button"
            class={tabBtn(chartTab.value === "dex")}
            onClick$={$(() => {
              chartTab.value = "dex";
            })}
          >
            On-chain (Dexscreener)
          </button>
          <button
            type="button"
            class={tabBtn(chartTab.value === "cex")}
            onClick$={$(() => {
              chartTab.value = "cex";
            })}
          >
            CEX (TradingView)
          </button>
          {props.dexUrl ? (
            <a
              href={props.dexUrl}
              target="_blank"
              rel="noreferrer"
              class="ml-auto text-[11px] text-[#04E6E6] hover:underline shrink-0"
            >
              Open Dexscreener (new tab)
            </a>
          ) : null}
        </div>
      ) : null}

      {hasDex && chartTab.value === "dex" && props.dexEmbedUrl ? (
        <div class="space-y-2">
          <iframe
            src={props.dexEmbedUrl}
            title="Dexscreener chart"
            class="w-full rounded-xl border border-[#043234] bg-[#0a1214]"
            style={{ height: `${height}px`, minHeight: "320px" }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
          <p class="text-[10px] text-gray-500">
            DEX liquidity chart from Dexscreener. If the frame is blank (blocked by browser), use{" "}
            {props.dexUrl ? (
              <a class="text-[#04E6E6] underline" href={props.dexUrl} target="_blank" rel="noreferrer">
                open full page
              </a>
            ) : (
              "the link above"
            )}
            .
          </p>
        </div>
      ) : null}

      <div class={chartTab.value === "cex" || !hasDex ? "block" : "hidden"}>
        {list.length > 1 ? (
          <div class="mb-2 flex flex-wrap items-center gap-2 border-b border-[#043234]/40 pb-2">
            <label class="text-[11px] font-medium uppercase tracking-wide text-gray-500 shrink-0">
              CEX pair
            </label>
            <select
              class="min-w-[10rem] max-w-full flex-1 rounded-lg border border-[#043234] bg-[#001318] px-2 py-1.5 text-xs text-gray-200 focus:border-[#04E6E6]/50 focus:outline-none"
              value={String(clampTvPairIndex(pairIndex.value, list.length))}
              onChange$={$((e) => {
                pairIndex.value = Number((e.target as HTMLSelectElement).value);
              })}
            >
              {list.map((sym, i) => (
                <option key={`${sym}-${i}`} value={String(i)} class="bg-[#0a1214]">
                  {sym}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        {!hasDex ? (
          <p class="text-[10px] leading-relaxed text-gray-500 mb-2">
            If the chart shows an invalid symbol, use the search tool inside TradingView.
          </p>
        ) : (
          <p class="text-[10px] leading-relaxed text-gray-500 mb-2">
            Centralized exchange candles. Try another venue in the list if you see “Invalid symbol”.
          </p>
        )}
        <div
          ref={hostRef}
          class="w-full min-h-[320px] rounded-xl overflow-hidden border border-[#043234] bg-[#001318]"
          style={{ minHeight: `${height}px` }}
        />
      </div>
    </div>
  );
});
