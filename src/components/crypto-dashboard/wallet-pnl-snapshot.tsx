import { component$ } from "@builder.io/qwik";
import { formatSignedPercent, formatUsdLiquidity, percentToneClass } from "~/utils/format-market";

function pnlUsdTone(raw: number | string | undefined): string {
  if (raw === undefined || raw === "") return "text-gray-400";
  const n = typeof raw === "string" ? Number(raw.trim()) : raw;
  if (!Number.isFinite(n)) return "text-gray-400";
  if (n > 0) return "text-emerald-400";
  if (n < 0) return "text-rose-400";
  return "text-gray-400";
}

type MoralisPnlSummary = {
  total_count_of_trades?: number | string;
  total_trade_volume?: number | string;
  total_realized_profit_usd?: number | string;
  total_realized_profit_percentage?: number | string;
  total_buys?: number | string;
  total_sells?: number | string;
  total_sold_volume_usd?: number | string;
  total_bought_volume_usd?: number | string;
};

function asSummary(d: unknown): MoralisPnlSummary | null {
  if (!d || typeof d !== "object") return null;
  return d as MoralisPnlSummary;
}

function fmtInt(n: number | string | undefined): string {
  if (n === undefined || n === "") return "—";
  const v = typeof n === "string" ? Number(n.trim()) : n;
  if (!Number.isFinite(v)) return "—";
  return v.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export const WalletPnlSnapshot = component$(
  (props: {
    chainLabel: string;
    ok: boolean;
    data: unknown;
    emptyMessage: string;
    /** Tighter layout for wallet overview above the fold. */
    compact?: boolean;
  }) => {
    const row = props.ok ? asSummary(props.data) : null;
    const c = props.compact === true;

    return (
      <div
        class={
          c
            ? "rounded-lg border border-[#043234]/90 bg-[#000D0E]/50 p-3 shadow-inner shadow-black/10"
            : "rounded-xl border border-[#043234]/90 bg-[#000D0E]/50 p-4 shadow-inner shadow-black/10"
        }
      >
        <h3 class={`font-semibold uppercase tracking-wide text-slate-400 ${c ? "mb-2 text-[10px]" : "mb-3 text-xs"}`}>
          {props.chainLabel}
        </h3>
        {!props.ok ? (
          <p class={c ? "text-xs text-slate-400" : "text-sm text-slate-400"}>{props.emptyMessage}</p>
        ) : !row ? (
          <p class="text-sm text-gray-500">Formato de datos no reconocido.</p>
        ) : (
          <div class={c ? "space-y-2.5" : "space-y-4"}>
            <div class={`grid gap-2 ${c ? "sm:grid-cols-2" : "gap-3 sm:grid-cols-2"}`}>
              <div class={`rounded-lg border border-[#043234] bg-[#001a1c]/80 ${c ? "p-2.5" : "p-4"}`}>
                <p class="text-[10px] font-medium uppercase tracking-wide text-gray-500">PnL realizado</p>
                <p
                  class={`font-semibold tabular-nums ${pnlUsdTone(row.total_realized_profit_usd)} ${c ? "mt-0.5 text-lg" : "mt-1 text-2xl"}`}
                >
                  {formatUsdLiquidity(row.total_realized_profit_usd)}
                </p>
              </div>
              <div class={`rounded-lg border border-[#043234] bg-[#001a1c]/80 ${c ? "p-2.5" : "p-4"}`}>
                <p class="text-[10px] font-medium uppercase tracking-wide text-gray-500">Rendimiento %</p>
                <p
                  class={`font-semibold tabular-nums ${percentToneClass(row.total_realized_profit_percentage)} ${c ? "mt-0.5 text-lg" : "mt-1 text-2xl"}`}
                >
                  {formatSignedPercent(row.total_realized_profit_percentage)}
                </p>
              </div>
            </div>

            <div class={`grid grid-cols-2 gap-1.5 ${c ? "sm:grid-cols-4 sm:gap-2" : "sm:grid-cols-4 gap-2"}`}>
              <div class={`rounded-lg border border-[#043234]/60 bg-[#001a1c]/60 ${c ? "px-2 py-1.5" : "px-3 py-2"}`}>
                <p class="text-[10px] text-gray-500">Operaciones</p>
                <p class={`font-semibold tabular-nums text-gray-100 ${c ? "text-xs" : "text-sm"}`}>
                  {fmtInt(row.total_count_of_trades)}
                </p>
              </div>
              <div class={`rounded-lg border border-[#043234]/60 bg-[#001a1c]/60 ${c ? "px-2 py-1.5" : "px-3 py-2"}`}>
                <p class="text-[10px] text-gray-500">Compras</p>
                <p class={`font-semibold tabular-nums text-emerald-300/90 ${c ? "text-xs" : "text-sm"}`}>
                  {fmtInt(row.total_buys)}
                </p>
              </div>
              <div class={`rounded-lg border border-[#043234]/60 bg-[#001a1c]/60 ${c ? "px-2 py-1.5" : "px-3 py-2"}`}>
                <p class="text-[10px] text-gray-500">Ventas</p>
                <p class={`font-semibold tabular-nums text-rose-300/90 ${c ? "text-xs" : "text-sm"}`}>
                  {fmtInt(row.total_sells)}
                </p>
              </div>
              <div class={`rounded-lg border border-[#043234]/60 bg-[#001a1c]/60 ${c ? "px-2 py-1.5" : "px-3 py-2"}`}>
                <p class="text-[10px] text-gray-500">Volumen total</p>
                <p
                  class={`font-semibold tabular-nums text-gray-200 ${c ? "text-xs" : "text-sm"}`}
                  title={String(row.total_trade_volume ?? "")}
                >
                  {formatUsdLiquidity(row.total_trade_volume)}
                </p>
              </div>
            </div>

            <div class={`grid gap-1.5 ${c ? "sm:grid-cols-2 sm:gap-2" : "gap-2 sm:grid-cols-2"}`}>
              <div
                class={`flex justify-between gap-2 rounded-lg border border-[#043234]/50 text-xs ${c ? "px-2 py-1.5 text-[11px]" : "px-3 py-2"}`}
              >
                <span class="text-gray-500">Vol. comprado</span>
                <span class="tabular-nums text-gray-200">{formatUsdLiquidity(row.total_bought_volume_usd)}</span>
              </div>
              <div
                class={`flex justify-between gap-2 rounded-lg border border-[#043234]/50 text-xs ${c ? "px-2 py-1.5 text-[11px]" : "px-3 py-2"}`}
              >
                <span class="text-gray-500">Vol. vendido</span>
                <span class="tabular-nums text-gray-200">{formatUsdLiquidity(row.total_sold_volume_usd)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  },
);
