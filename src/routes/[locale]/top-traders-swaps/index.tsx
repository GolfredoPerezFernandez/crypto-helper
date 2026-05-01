import { component$ } from "@builder.io/qwik";
import { routeLoader$, useLocation } from "@builder.io/qwik-city";
import { DataSyncExplainer } from "~/components/crypto-dashboard/data-sync-explainer";
import { DexActivityWalletsSection } from "~/components/crypto-dashboard/dex-activity-wallets-section";
import { WatchlistWalletGrid } from "~/components/crypto-dashboard/watchlist-wallet-grid";
import {
  TopPerformersByAssetSection,
  type TopPerformersBundle,
} from "~/components/crypto-dashboard/top-performers-by-asset-section";
import type { DexActivityHighlightBundle } from "~/server/crypto-helper/dex-activity-highlight";
import {
  getGlobalSnapshotJson,
  getWalletSnapshotJson,
  GLOBAL_DEX_ACTIVITY_HIGHLIGHT,
  GLOBAL_ICARUS_TOP_USERS,
  GLOBAL_TOP_PERFORMERS_BY_TOKEN,
} from "~/server/crypto-helper/api-snapshot-sync";
import type { IcarusTopUser } from "~/server/crypto-helper/icarus-top-users";
import { TRADER_WATCH_WALLETS } from "~/server/crypto-helper/trader-wallets";
import {
  loadNansenTgmMap,
  normalizeEvmAddress,
  rowWithNansenFallback,
} from "~/server/crypto-helper/watchlist-nansen-merge";

export const useSwapsTradersLoader = routeLoader$(async (ev) => {
  const [cached, topPerformersBundle, dexActivityBundle] = await Promise.all([
    getGlobalSnapshotJson<{
      traders: IcarusTopUser[];
      syncedAt?: number;
    } | null>(GLOBAL_ICARUS_TOP_USERS),
    getGlobalSnapshotJson<TopPerformersBundle | null>(GLOBAL_TOP_PERFORMERS_BY_TOKEN),
    getGlobalSnapshotJson<DexActivityHighlightBundle | null>(GLOBAL_DEX_ACTIVITY_HIGHLIGHT),
  ]);
  const traders = cached?.traders ?? [];
  const icarusSyncedAt = cached?.syncedAt ?? null;

  let withAddr = traders
    .map((t) => String(t.account || "").toLowerCase())
    .filter((a) => /^0x[a-f0-9]{40}$/.test(a))
    .slice(0, 36);
  const usingFallback = withAddr.length === 0;
  if (usingFallback) {
    withAddr = TRADER_WATCH_WALLETS.slice(0, 12);
  }

  const nansenDays = Math.max(1, Math.min(365, parseInt(ev.query.get("days") || "30", 10) || 30));
  const { byAddress: nansenByAddress, used: nansenUsed, rowCount: nansenRankCount } =
    await loadNansenTgmMap({
      queryToken: normalizeEvmAddress(ev.query.get("token")),
      envToken: normalizeEvmAddress(process.env.NANSEN_TGM_TOKEN_ADDRESS),
      days: nansenDays,
    });

  const merged = [...new Set([...withAddr, ...nansenByAddress.keys()])].slice(0, 48);
  const rows = await Promise.all(
    merged.map(async (address) => {
      const snap = await getWalletSnapshotJson(address);
      return rowWithNansenFallback(address, nansenByAddress, snap);
    }),
  );

  return {
    icarusCount: traders.length,
    icarusSyncedAt,
    rows,
    usingFallback,
    nansenUsed,
    nansenRankCount,
    topPerformersBundle,
    dexActivityBundle,
  };
});

export default component$(() => {
  const data = useSwapsTradersLoader();
  const loc = useLocation();
  const L = loc.params.locale || "en-us";
  const v = data.value;
  const n = v.rows.length;
  const pageSize = Math.max(1, n);

  const icarusAge =
    v.icarusSyncedAt != null
      ? new Date(v.icarusSyncedAt * 1000).toLocaleString(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : null;

  let subtitle = "";
  if (v.usingFallback) {
    subtitle =
      "El ranking por actividad de intercambio no trajo direcciones en el último ciclo — mostramos una muestra fija de referencia. Revisá el sync global.";
  } else {
    subtitle = `Ranking por actividad de intercambio (${v.icarusCount} entradas en la última lectura${icarusAge ? ` · ${icarusAge}` : ""}).`;
  }
  if (v.nansenUsed) {
    subtitle += ` Incluye ${v.nansenRankCount} direcciones adicionales del ranking ampliado por activo (misma clave ?token= que en Traders destacados).`;
  } else {
    subtitle +=
      " Podés añadir ?token=0x… para mezclar el ranking ampliado por ese contrato cuando los datos lo permitan.";
  }

  return (
    <>
      <div class="space-y-10 w-full max-w-[2200px] mx-auto">
        <DataSyncExplainer />

      <WatchlistWalletGrid
        locale={L}
        title="Traders por swaps"
        subtitle={subtitle}
        rows={v.rows}
        page={1}
        pageSize={pageSize}
        total={n}
        hasMore={false}
        basePath={`/${L}/top-traders-swaps/`}
      />
      <DexActivityWalletsSection locale={L} bundle={v.dexActivityBundle} />
      <TopPerformersByAssetSection locale={L} bundle={v.topPerformersBundle} />
      </div>
    </>
  );
});
