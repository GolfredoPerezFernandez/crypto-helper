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
  }) => {
    const row = props.ok ? asSummary(props.data) : null;

    return (
      <div class="rounded-xl border border-[#043234]/90 bg-[#000D0E]/50 p-4 shadow-inner shadow-black/10">
        <h3 class="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">{props.chainLabel}</h3>
        {!props.ok ? (
          <p class="text-sm text-slate-400">{props.emptyMessage}</p>
        ) : !row ? (
          <p class="text-sm text-gray-500">Formato de datos no reconocido.</p>
        ) : (
          <div class="space-y-4">
            <div class="grid gap-3 sm:grid-cols-2">
              <div class="rounded-lg border border-[#043234] bg-[#001a1c]/80 p-4">
                <p class="text-[10px] font-medium uppercase tracking-wide text-gray-500">PnL realizado</p>
                <p class={`mt-1 text-2xl font-semibold tabular-nums ${pnlUsdTone(row.total_realized_profit_usd)}`}>
                  {formatUsdLiquidity(row.total_realized_profit_usd)}
                </p>
              </div>
              <div class="rounded-lg border border-[#043234] bg-[#001a1c]/80 p-4">
                <p class="text-[10px] font-medium uppercase tracking-wide text-gray-500">Rendimiento %</p>
                <p class={`mt-1 text-2xl font-semibold tabular-nums ${percentToneClass(row.total_realized_profit_percentage)}`}>
                  {formatSignedPercent(row.total_realized_profit_percentage)}
                </p>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div class="rounded-lg border border-[#043234]/60 bg-[#001a1c]/60 px-3 py-2">
                <p class="text-[10px] text-gray-500">Operaciones</p>
                <p class="text-sm font-semibold tabular-nums text-gray-100">{fmtInt(row.total_count_of_trades)}</p>
              </div>
              <div class="rounded-lg border border-[#043234]/60 bg-[#001a1c]/60 px-3 py-2">
                <p class="text-[10px] text-gray-500">Compras</p>
                <p class="text-sm font-semibold tabular-nums text-emerald-300/90">{fmtInt(row.total_buys)}</p>
              </div>
              <div class="rounded-lg border border-[#043234]/60 bg-[#001a1c]/60 px-3 py-2">
                <p class="text-[10px] text-gray-500">Ventas</p>
                <p class="text-sm font-semibold tabular-nums text-rose-300/90">{fmtInt(row.total_sells)}</p>
              </div>
              <div class="rounded-lg border border-[#043234]/60 bg-[#001a1c]/60 px-3 py-2">
                <p class="text-[10px] text-gray-500">Volumen total</p>
                <p class="text-sm font-semibold tabular-nums text-gray-200" title={String(row.total_trade_volume ?? "")}>
                  {formatUsdLiquidity(row.total_trade_volume)}
                </p>
              </div>
            </div>

            <div class="grid gap-2 sm:grid-cols-2">
              <div class="flex justify-between gap-2 rounded-lg border border-[#043234]/50 px-3 py-2 text-xs">
                <span class="text-gray-500">Volumen comprado</span>
                <span class="tabular-nums text-gray-200">{formatUsdLiquidity(row.total_bought_volume_usd)}</span>
              </div>
              <div class="flex justify-between gap-2 rounded-lg border border-[#043234]/50 px-3 py-2 text-xs">
                <span class="text-gray-500">Volumen vendido</span>
                <span class="tabular-nums text-gray-200">{formatUsdLiquidity(row.total_sold_volume_usd)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  },
);
