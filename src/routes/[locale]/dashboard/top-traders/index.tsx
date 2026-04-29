import { component$ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";
import { routeLoader$, useLocation } from "@builder.io/qwik-city";
import { WatchlistWalletGrid } from "~/components/crypto-dashboard/watchlist-wallet-grid";
import { useDashboardAuth } from "../../layout";
import { getWalletSnapshotJson } from "~/server/crypto-ghost/api-snapshot-sync";
import { TRADER_WATCH_WALLETS } from "~/server/crypto-ghost/trader-wallets";

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
  const page = Math.max(1, parseInt(ev.query.get("page") || "1", 10) || 1);
  const start = (page - 1) * PAGE_SIZE;
  const slice = TRADER_WATCH_WALLETS.slice(start, start + PAGE_SIZE);
  const rows = await Promise.all(
    slice.map(async (address) => {
      const snap = await getWalletSnapshotJson(address);
      const pnl = snap?.pnlEth ?? { ok: false as const, error: "Sin datos disponibles." };
      const nw = snap?.nwEth ?? { ok: false as const, error: "Sin datos disponibles." };
      return { address, pnl, nw };
    }),
  );
  return {
    page,
    rows,
    hasMore: start + PAGE_SIZE < TRADER_WATCH_WALLETS.length,
    total: TRADER_WATCH_WALLETS.length,
  };
});

export default component$(() => {
  const dash = useDashboardAuth();
  const showSync = dash.value.showSyncDebug;
  const data = useTopTradersLoader();
  const loc = useLocation();
  const L = loc.params.locale || "en-us";
  const v = data.value;

  return (
    <WatchlistWalletGrid
      locale={L}
      title="Most profitable"
      subtitle={
        showSync
          ? "Listado de traders actualizado. Ordena y filtra por dirección en esta página."
          : "Listado de traders. Ordena y filtra por dirección en esta página."
      }
      rows={v.rows}
      page={v.page}
      pageSize={PAGE_SIZE}
      total={v.total}
      hasMore={v.hasMore}
      basePath={`/${L}/top-traders/`}
    />
  );
});
