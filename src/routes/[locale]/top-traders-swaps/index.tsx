import { component$ } from "@builder.io/qwik";
import { routeLoader$, useLocation } from "@builder.io/qwik-city";
import { WatchlistWalletGrid } from "~/components/crypto-dashboard/watchlist-wallet-grid";
import { useDashboardAuth } from "../layout";
import {
  getGlobalSnapshotJson,
  getWalletSnapshotJson,
  GLOBAL_ICARUS_TOP_USERS,
} from "~/server/crypto-ghost/api-snapshot-sync";
import type { IcarusTopUser } from "~/server/crypto-ghost/icarus-top-users";
import { TRADER_WATCH_WALLETS } from "~/server/crypto-ghost/trader-wallets";

export const useSwapsTradersLoader = routeLoader$(async () => {
  const cached = await getGlobalSnapshotJson<{ traders: IcarusTopUser[] } | null>(GLOBAL_ICARUS_TOP_USERS);
  const traders = cached?.traders ?? [];
  let withAddr = traders
    .map((t) => String(t.account || "").toLowerCase())
    .filter((a) => /^0x[a-f0-9]{40}$/.test(a))
    .slice(0, 12);
  const usingFallback = withAddr.length === 0;
  if (usingFallback) {
    withAddr = TRADER_WATCH_WALLETS.slice(0, 12);
  }
  const rows = await Promise.all(
    withAddr.map(async (address) => {
      const snap = await getWalletSnapshotJson(address);
      const pnl = snap?.pnlEth ?? { ok: false as const, error: "Sin datos disponibles." };
      const nw = snap?.nwEth ?? { ok: false as const, error: "Sin datos disponibles." };
      return { address, pnl, nw };
    }),
  );
  return { icarusCount: traders.length, rows, usingFallback };
});

export default component$(() => {
  const dash = useDashboardAuth();
  const showSync = dash.value.showSyncDebug;
  const data = useSwapsTradersLoader();
  const loc = useLocation();
  const L = loc.params.locale || "en-us";
  const v = data.value;
  const n = v.rows.length;
  const pageSize = Math.max(1, n);

  return (
    <>
      <WatchlistWalletGrid
        locale={L}
        title="Traders by swaps"
        subtitle={
          showSync
          ? v.usingFallback
            ? "Icarus sin filas en este sync; mostrando watchlist base como respaldo."
            : `Datos del último sync (${v.icarusCount} filas en ranking).`
            : "Ranking desde datos en caché (actualizados periódicamente)."
        }
        rows={v.rows}
        page={1}
        pageSize={pageSize}
        total={n}
        hasMore={false}
        basePath={`/${L}/top-traders-swaps/`}
      />
    </>
  );
});
