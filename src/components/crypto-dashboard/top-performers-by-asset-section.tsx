import { component$ } from "@builder.io/qwik";
import { Link } from "@builder.io/qwik-city";
import { EvmAddrLinks } from "~/components/crypto-dashboard/evm-dash-links";
import { formatUsdBalance } from "~/utils/format-market";

export type TopPerformersBundleItem = {
  chain: string;
  tokenAddress: string;
  displayLabel: string | null;
  timeframeDays?: string;
  ok: boolean;
  error?: string;
  data?: unknown;
};

export type TopPerformersBundle = {
  syncedAt: number;
  items: TopPerformersBundleItem[];
};

function rowsFromPayload(data: unknown): Record<string, unknown>[] {
  if (data == null || typeof data !== "object") return [];
  const o = data as Record<string, unknown>;
  if (Array.isArray(o.result)) return o.result as Record<string, unknown>[];
  return [];
}

function assetTitle(item: TopPerformersBundleItem, fallbackSymbol: string): string {
  if (item.displayLabel) return item.displayLabel;
  const d = item.data;
  if (d && typeof d === "object") {
    const sym = (d as Record<string, unknown>).symbol;
    if (sym) return String(sym);
  }
  return fallbackSymbol;
}

export const TopPerformersByAssetSection = component$(
  (props: { locale: string; bundle: TopPerformersBundle | null }) => {
    const L = props.locale;
    const b = props.bundle;
    if (!b?.items?.length) return null;

    const anyOk = b.items.some((i) => i.ok && rowsFromPayload(i.data).length > 0);
    if (!anyOk) return null;

    const refreshed =
      b.syncedAt > 0
        ? new Date(b.syncedAt * 1000).toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
          })
        : null;

    return (
      <section class="space-y-4">
        <div>
          <h2 class="text-xl font-bold tracking-tight text-[#04E6E6] sm:text-2xl">Rendimiento destacado por activo</h2>
          <p class="mt-2 max-w-3xl text-sm leading-relaxed text-slate-500">
            Wallets con mejor resultado realizado en el periodo configurado para cada contrato. Datos del último ciclo
            de actualización global.
            {refreshed ? (
              <>
                {" "}
                <span class="text-slate-400">Refresco: {refreshed}.</span>
              </>
            ) : null}
          </p>
        </div>

        <div class="space-y-8">
          {b.items.map((item) => {
            const list = item.ok ? rowsFromPayload(item.data) : [];
            const title = assetTitle(item, item.tokenAddress.slice(0, 8));
            const tf = item.timeframeDays ? `${item.timeframeDays}d` : null;

            return (
              <div
                key={`${item.chain}-${item.tokenAddress}`}
                class="rounded-xl border border-[#043234]/80 bg-[#001318]/95 p-4 shadow-lg shadow-black/20 backdrop-blur-sm"
              >
                <div class="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                  <div class="min-w-0">
                    <span class="text-lg font-semibold text-cyan-100">{title}</span>
                    <span class="ml-2 font-mono text-xs text-slate-500">{item.chain}</span>
                    {tf ? (
                      <span class="ml-2 text-[10px] uppercase tracking-wider text-slate-500">ventana {tf}</span>
                    ) : null}
                  </div>
                </div>

                {!item.ok ? (
                  <p class="text-sm text-slate-500">No hay filas para este activo en el último ciclo.</p>
                ) : list.length === 0 ? (
                  <p class="text-sm text-slate-500">Sin datos para mostrar.</p>
                ) : (
                  <div class="overflow-x-auto text-xs">
                    <table class="w-full text-left">
                      <thead>
                        <tr class="border-b border-[#043234] text-slate-400 font-medium">
                          <th class="py-2 pr-2">Wallet</th>
                          <th class="py-2 pr-2">Ops</th>
                          <th class="py-2 pr-2">PnL %</th>
                          <th class="py-2 pr-2">PnL USD</th>
                          <th class="py-2">Vendido USD</th>
                        </tr>
                      </thead>
                      <tbody>
                        {list.map((r, idx) => {
                          const addr = String(r.address ?? "").toLowerCase();
                          const trades = Number(r.count_of_trades ?? 0);
                          const pnlPct = Number(r.realized_profit_percentage ?? 0);
                          const pnlUsd = Number(String(r.realized_profit_usd ?? 0).replace(/,/g, "")) || 0;
                          const soldUsd = Number(String(r.total_sold_usd ?? 0).replace(/,/g, "")) || 0;
                          return (
                            <tr
                              key={`${item.tokenAddress}-${addr}-${idx}`}
                              class="border-b border-[#043234]/40 text-slate-200"
                            >
                              <td class="py-2 pr-2 font-mono">
                                {/^0x[a-f0-9]{40}$/.test(addr) ? (
                                  <EvmAddrLinks locale={L} moralisChain={item.chain} address={addr} variant="wallet" />
                                ) : (
                                  "—"
                                )}
                              </td>
                              <td class="py-2 pr-2 tabular-nums">{Number.isFinite(trades) ? trades : "—"}</td>
                              <td
                                class={`py-2 pr-2 tabular-nums ${
                                  pnlPct > 0 ? "text-emerald-300" : pnlPct < 0 ? "text-rose-300" : ""
                                }`}
                              >
                                {Number.isFinite(pnlPct) ? `${pnlPct > 0 ? "+" : ""}${pnlPct.toFixed(2)}%` : "—"}
                              </td>
                              <td class="py-2 pr-2 tabular-nums">${formatUsdBalance(pnlUsd)}</td>
                              <td class="py-2 tabular-nums text-slate-400">${formatUsdBalance(soldUsd)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                <p class="mt-3 text-[10px] text-slate-600">
                  Solo incluye operaciones admitidas en el motor de agregación; gas y posiciones abiertas no entran en
                  el cálculo.
                </p>
              </div>
            );
          })}
        </div>

        <p class="text-[11px] text-slate-600">
          ¿Más detalle por wallet?{" "}
          <Link class="text-[#04E6E6] hover:underline" href={`/${L}/top-traders/`}>
            Ver cartera y métricas
          </Link>
          .
        </p>
      </section>
    );
  },
);
