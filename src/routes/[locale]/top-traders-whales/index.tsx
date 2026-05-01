import { component$ } from "@builder.io/qwik";
import { Link, routeLoader$, useLocation } from "@builder.io/qwik-city";
import { WatchlistWalletGrid } from "~/components/crypto-dashboard/watchlist-wallet-grid";
import { DataSyncExplainer } from "~/components/crypto-dashboard/data-sync-explainer";
import { DexActivityWalletsSection } from "~/components/crypto-dashboard/dex-activity-wallets-section";
import {
  TopPerformersByAssetSection,
  type TopPerformersBundle,
} from "~/components/crypto-dashboard/top-performers-by-asset-section";
import { EvmAddrLinks } from "~/components/crypto-dashboard/evm-dash-links";
import type { DexActivityHighlightBundle } from "~/server/crypto-helper/dex-activity-highlight";
import {
  getGlobalSnapshotJson,
  getWalletSnapshotJson,
  GLOBAL_DEX_ACTIVITY_HIGHLIGHT,
  GLOBAL_TOP_PERFORMERS_BY_TOKEN,
} from "~/server/crypto-helper/api-snapshot-sync";
import { loadTopTokenHoldersGroups } from "~/server/crypto-helper/market-top-owners";
import {
  walletNetWorthUsdDisplay,
  walletProfitabilityDisplay,
} from "~/server/crypto-helper/moralis-snapshot-display";
import { TRADER_WATCH_WALLETS } from "~/server/crypto-helper/trader-wallets";
import { formatUsdBalance } from "~/utils/format-market";

const PAGE_SIZE = 8;

const TOP_TOKEN_ROWS = 48;
const HOLDERS_PER_TOKEN = 8;

export const useTopWhalesLoader = routeLoader$(async (ev) => {
  const page = Math.max(1, parseInt(ev.query.get("page") || "1", 10) || 1);
  const allRows = await Promise.all(
    TRADER_WATCH_WALLETS.map(async (address) => {
      const snap = await getWalletSnapshotJson(address);
      // Prefer snapshots with broader chain coverage; fallback to legacy per-chain fields.
      const pnl = snap?.pnlEth?.ok ? snap.pnlEth : snap?.pnlBase?.ok ? snap.pnlBase : { ok: false as const, error: "Sin datos disponibles." };
      const nw = snap?.nw?.ok ? snap.nw : snap?.nwEth?.ok ? snap.nwEth : { ok: false as const, error: "Sin datos disponibles." };
      const nwUsd = walletNetWorthUsdDisplay(snap) ?? -1;
      const p = walletProfitabilityDisplay(snap);
      const roiUsd = p?.total_realized_profit_usd ?? -1;
      const pnlPct = p?.total_realized_profit_percentage ?? -1;
      return { address, pnl, nw, nwUsd, roiUsd, pnlPct };
    }),
  );
  // Global rank first, then paginate. This keeps page 1 aligned with actual whale size.
  const ranked = allRows.sort((a, b) => {
    if (b.nwUsd !== a.nwUsd) return b.nwUsd - a.nwUsd;
    if (b.roiUsd !== a.roiUsd) return b.roiUsd - a.roiUsd;
    if (b.pnlPct !== a.pnlPct) return b.pnlPct - a.pnlPct;
    return a.address.localeCompare(b.address);
  });
  const start = (page - 1) * PAGE_SIZE;
  const rows = ranked.slice(start, start + PAGE_SIZE).map(({ address, pnl, nw }) => ({ address, pnl, nw }));

  const [holderAgg, topPerformersBundle, dexActivityBundle] = await Promise.all([
    loadTopTokenHoldersGroups({
      maxTokens: TOP_TOKEN_ROWS,
      maxHoldersPerToken: HOLDERS_PER_TOKEN,
    }),
    getGlobalSnapshotJson<TopPerformersBundle | null>(GLOBAL_TOP_PERFORMERS_BY_TOKEN),
    getGlobalSnapshotJson<DexActivityHighlightBundle | null>(GLOBAL_DEX_ACTIVITY_HIGHLIGHT),
  ]);

  return {
    page,
    rows,
    hasMore: start + PAGE_SIZE < ranked.length,
    total: ranked.length,
    tokenHolders: holderAgg.groups,
    tokenHoldersMeta: { scanned: holderAgg.tokensScanned },
    topPerformersBundle,
    dexActivityBundle,
  };
});

export default component$(() => {
  const data = useTopWhalesLoader();
  const loc = useLocation();
  const L = loc.params.locale || "en-us";
  const v = data.value;

  return (
    <div class="space-y-12 w-full max-w-[2200px] mx-auto">
      <DataSyncExplainer />

      <WatchlistWalletGrid
        locale={L}
        title="Top whales"
        subtitle="Lista curada de wallets; métricas de cartera del último ciclo de actualización. Más abajo: mayores participaciones por activo y rendimiento destacado por contrato."
        rows={v.rows}
        page={v.page}
        pageSize={PAGE_SIZE}
        total={v.total}
        hasMore={v.hasMore}
        basePath={`/${L}/top-traders-whales/`}
      />

      <DexActivityWalletsSection locale={L} bundle={v.dexActivityBundle} />

      <TopPerformersByAssetSection locale={L} bundle={v.topPerformersBundle} />

      <section class="space-y-4">
        <div>
          <h2 class="text-xl font-bold tracking-tight text-[#04E6E6] sm:text-2xl">Mayores participaciones por activo</h2>
          <p class="mt-2 max-w-3xl text-sm leading-relaxed text-slate-500">
            Posiciones agregadas guardadas con cada ficha de mercado; tokens ordenados por volumen reciente. Hasta{" "}
            {HOLDERS_PER_TOKEN} direcciones por activo. Para actividad de intercambio y ranking ampliado:{" "}
            <Link class="text-[#04E6E6] hover:underline" href={`/${L}/top-traders-swaps/`}>
              Traders por swaps
            </Link>
            ,{" "}
            <Link class="text-[#04E6E6] hover:underline" href={`/${L}/top-traders/`}>
              Traders destacados
            </Link>
            .
          </p>
        </div>

        {v.tokenHolders.length === 0 ? (
          <div class="rounded-xl border border-[#043234]/80 bg-[#001318]/95 p-6 text-sm text-slate-400">
            Sin datos de mayores holders todavía. Volvé más tarde o revisá que haya mercado cargado para esos tokens.
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
