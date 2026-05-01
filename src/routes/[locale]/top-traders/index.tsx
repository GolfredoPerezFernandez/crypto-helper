import { component$ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";
import { routeLoader$, useLocation } from "@builder.io/qwik-city";
import { DataSyncExplainer } from "~/components/crypto-dashboard/data-sync-explainer";
import { DexActivityWalletsSection } from "~/components/crypto-dashboard/dex-activity-wallets-section";
import { WatchlistWalletGrid } from "~/components/crypto-dashboard/watchlist-wallet-grid";
import type { DexActivityHighlightBundle } from "~/server/crypto-helper/dex-activity-highlight";
import { getGlobalSnapshotJson, getWalletSnapshotJson, GLOBAL_DEX_ACTIVITY_HIGHLIGHT } from "~/server/crypto-helper/api-snapshot-sync";
import {
  loadNansenTgmMap,
  normalizeEvmAddress,
  rowWithNansenFallback,
} from "~/server/crypto-helper/watchlist-nansen-merge";
import { TRADER_WATCH_WALLETS } from "~/server/crypto-helper/trader-wallets";

const PAGE_SIZE = 25;

export const head: DocumentHead = {
  title: "Top Crypto Traders Watchlist | Crypto Helper",
  meta: [
    {
      name: "description",
      content:
        "Track profitable crypto trader wallets with cached PnL and net worth insights.",
    },
  ],
};

export const useTopTradersLoader = routeLoader$(async (ev) => {
  const nansenTokenFromQuery = normalizeEvmAddress(ev.query.get("token"));
  const nansenTokenFromEnv = normalizeEvmAddress(process.env.NANSEN_TGM_TOKEN_ADDRESS);
  const nansenDays = Math.max(1, Math.min(365, parseInt(ev.query.get("days") || "30", 10) || 30));

  const [{ byAddress: nansenByAddress, used: nansenUsed, rowCount: nansenRows }, dexActivityBundle] =
    await Promise.all([
      loadNansenTgmMap({
        queryToken: nansenTokenFromQuery,
        envToken: nansenTokenFromEnv,
        days: nansenDays,
      }),
      getGlobalSnapshotJson<DexActivityHighlightBundle | null>(GLOBAL_DEX_ACTIVITY_HIGHLIGHT),
    ]);

  const mergedAddresses = [...new Set([...TRADER_WATCH_WALLETS, ...nansenByAddress.keys()])];
  const page = Math.max(1, parseInt(ev.query.get("page") || "1", 10) || 1);
  const start = (page - 1) * PAGE_SIZE;
  const slice = mergedAddresses.slice(start, start + PAGE_SIZE);
  const rows = await Promise.all(
    slice.map(async (address) => {
      const snap = await getWalletSnapshotJson(address);
      return rowWithNansenFallback(address, nansenByAddress, snap);
    }),
  );
  return {
    page,
    rows,
    hasMore: start + PAGE_SIZE < mergedAddresses.length,
    total: mergedAddresses.length,
    nansenUsed,
    nansenRows,
    nansenToken: nansenTokenFromQuery ?? nansenTokenFromEnv ?? null,
    dexActivityBundle,
  };
});

export default component$(() => {
  const data = useTopTradersLoader();
  const loc = useLocation();
  const L = loc.params.locale || "en-us";
  const v = data.value;

  const subtitle = v.nansenUsed
    ? `Watchlist combinada con ranking ampliado por activo (${v.nansenRows} direcciones) para el contrato configurado; el resto viene del último snapshot de cartera.`
    : "Watchlist curada y métricas de cartera en caché. Pasá ?token=0x… para mezclar el ranking ampliado si coincide con el último ciclo de sync.";

  return (
    <div class="space-y-10 w-full max-w-[2200px] mx-auto">
      <DataSyncExplainer />

      <WatchlistWalletGrid
        locale={L}
        title="Traders destacados"
        subtitle={subtitle}
        rows={v.rows}
        page={v.page}
        pageSize={PAGE_SIZE}
        total={v.total}
        hasMore={v.hasMore}
        basePath={`/${L}/top-traders/`}
      />

      <DexActivityWalletsSection locale={L} bundle={v.dexActivityBundle} />
    </div>
  );
});
