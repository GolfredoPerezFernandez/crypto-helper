import { component$ } from "@builder.io/qwik";
import { Link, routeLoader$, useLocation } from "@builder.io/qwik-city";
import { WatchlistWalletGrid } from "~/components/crypto-dashboard/watchlist-wallet-grid";
import { EvmAddrLinks } from "~/components/crypto-dashboard/evm-dash-links";
import { useDashboardAuth } from "../layout";
import { getWalletSnapshotJson } from "~/server/crypto-ghost/api-snapshot-sync";
import { loadTopTokenHoldersGroups } from "~/server/crypto-ghost/market-top-owners";
import { TRADER_WATCH_WALLETS } from "~/server/crypto-ghost/trader-wallets";
import { formatUsdBalance } from "~/utils/format-market";

const PAGE_SIZE = 8;

const TOP_TOKEN_ROWS = 48;
const HOLDERS_PER_TOKEN = 8;

export const useTopWhalesLoader = routeLoader$(async (ev) => {
  const page = Math.max(1, parseInt(ev.query.get("page") || "1", 10) || 1);
  const start = (page - 1) * PAGE_SIZE;
  const slice = TRADER_WATCH_WALLETS.slice(start, start + PAGE_SIZE);
  const rows = await Promise.all(
    slice.map(async (address) => {
      const snap = await getWalletSnapshotJson(address);
      const pnl = snap?.pnlEth ?? { ok: false as const, error: "Sin snapshot (sync diario)." };
      const nw = snap?.nwEth ?? { ok: false as const, error: "Sin snapshot (sync diario)." };
      return { address, pnl, nw };
    }),
  );

  const holderAgg = await loadTopTokenHoldersGroups({
    maxTokens: TOP_TOKEN_ROWS,
    maxHoldersPerToken: HOLDERS_PER_TOKEN,
  });

  return {
    page,
    rows,
    hasMore: start + PAGE_SIZE < TRADER_WATCH_WALLETS.length,
    total: TRADER_WATCH_WALLETS.length,
    tokenHolders: holderAgg.groups,
    tokenHoldersMeta: { scanned: holderAgg.tokensScanned },
  };
});

export default component$(() => {
  const dash = useDashboardAuth();
  const showSync = dash.value.showSyncDebug;
  const data = useTopWhalesLoader();
  const loc = useLocation();
  const L = loc.params.locale || "en-us";
  const v = data.value;

  return (
    <div class="space-y-12 max-w-[1600px]">
      <WatchlistWalletGrid
        locale={L}
        title="Top whales"
        subtitle={
          showSync
            ? "Watchlist fija (traders); PnL y net worth desde el último sync (sin llamadas extra al abrir la página)."
            : "Watchlist fija · datos en caché (sin llamadas en vivo por visita)."
        }
        rows={v.rows}
        page={v.page}
        pageSize={PAGE_SIZE}
        total={v.total}
        hasMore={v.hasMore}
        basePath={`/${L}/top-traders-whales/`}
      />

      <section class="space-y-4">
        <div>
          <h2 class="text-xl font-bold tracking-tight text-[#04E6E6] sm:text-2xl">Mayores holders por token</h2>
          <p class="mt-2 max-w-3xl text-sm leading-relaxed text-slate-500">
            Datos del último sync diario (misma fuente que la ficha del token). Tokens ordenados por volumen 24h en
            caché; hasta {HOLDERS_PER_TOKEN} direcciones por activo. No se hacen llamadas al abrir esta página.
            {showSync ? (
              <>
                {" "}
                Filas revisadas en BD: {v.tokenHoldersMeta.scanned}. Grupos con datos: {v.tokenHolders.length}.
              </>
            ) : null}
          </p>
        </div>

        {v.tokenHolders.length === 0 ? (
          <div class="rounded-xl border border-[#043234]/80 bg-[#001318]/95 p-6 text-sm text-slate-400">
            {showSync
              ? "Aún no hay holders en los snapshots. Ejecutá el sync diario del mercado y asegurate de tener tokens EVM en caché."
              : "Sin datos de holders en caché todavía."}
          </div>
        ) : (
          <div class="space-y-8">
            {v.tokenHolders.map((g) => (
              <div
                key={g.tokenId}
                class="rounded-xl border border-[#043234]/80 bg-[#001318]/95 p-4 shadow-lg shadow-black/20 backdrop-blur-sm"
              >
                <div class="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                  <div class="min-w-0">
                    <span class="text-lg font-semibold text-cyan-100">{g.symbol}</span>
                    <span class="ml-2 text-sm text-slate-400 truncate">{g.name}</span>
                    <span class="ml-2 text-[10px] uppercase tracking-wider text-slate-500">{g.category}</span>
                  </div>
                  <div class="flex flex-wrap items-center gap-3 text-xs">
                    <span class="font-mono text-slate-500">{g.moralisChain}</span>
                    <Link
                      class="text-[#04E6E6] hover:underline"
                      href={`/${L}/token/${g.tokenId}/`}
                    >
                      Ver token →
                    </Link>
                  </div>
                </div>
                <div class="overflow-x-auto text-xs">
                  <table class="w-full text-left">
                    <thead>
                      <tr class="border-b border-[#043234] text-slate-400 font-medium">
                        <th class="py-2 pr-2">Wallet</th>
                        <th class="py-2 pr-2">Etiqueta</th>
                        <th class="py-2 pr-2">% supply</th>
                        <th class="py-2 pr-2">USD (est.)</th>
                        <th class="py-2">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.holders.map((h) => (
                        <tr key={`${g.tokenId}-${h.ownerAddress}`} class="border-b border-[#043234]/40 text-slate-200">
                          <td class="py-2 pr-2 font-mono">
                            <EvmAddrLinks locale={L} moralisChain={g.moralisChain} address={h.ownerAddress} variant="wallet" />
                          </td>
                          <td class="py-2 pr-2 text-slate-300 max-w-[12rem] truncate" title={h.label}>
                            {h.label}
                          </td>
                          <td class="py-2 pr-2 tabular-nums">
                            {h.pctSupply != null ? `${h.pctSupply.toFixed(2)}%` : "—"}
                          </td>
                          <td class="py-2 pr-2 tabular-nums text-slate-300">
                            {h.usdValue != null ? formatUsdBalance(h.usdValue) : "—"}
                          </td>
                          <td class="py-2 tabular-nums text-slate-400">{h.balanceFormatted}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
});
