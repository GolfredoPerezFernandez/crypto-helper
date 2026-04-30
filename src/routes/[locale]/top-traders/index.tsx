import { component$ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";
import { routeLoader$, useLocation } from "@builder.io/qwik-city";
import { WatchlistWalletGrid } from "~/components/crypto-dashboard/watchlist-wallet-grid";
import { useDashboardAuth } from "../layout";
import {
  getGlobalSnapshotJson,
  getWalletSnapshotJson,
  GLOBAL_NANSEN_TGM_PNL,
} from "~/server/crypto-ghost/api-snapshot-sync";
import { TRADER_WATCH_WALLETS } from "~/server/crypto-ghost/trader-wallets";
import { fetchNansenTgmPnlLeaderboard, type NansenTgmPnlRow } from "~/server/crypto-ghost/nansen-smart-money";

const PAGE_SIZE = 25;

function pickNumber(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function normalizeAddress(v: unknown): string | null {
  const a = String(v ?? "")
    .trim()
    .toLowerCase();
  return /^0x[a-f0-9]{40}$/.test(a) ? a : null;
}

function rowWithNansenFallback(
  address: string,
  nansenByAddress: Map<string, NansenTgmPnlRow>,
  snap: Awaited<ReturnType<typeof getWalletSnapshotJson>>,
) {
  const nansen = nansenByAddress.get(address);
  const pnlFromSnap = snap?.pnlEth ?? { ok: false as const, error: "Sin datos disponibles." };
  const nwFromSnap = snap?.nwEth ?? { ok: false as const, error: "Sin datos disponibles." };
  const realizedUsd = pickNumber(nansen?.pnl_usd_realised);
  const roiPct = pickNumber(nansen?.roi_percent_total ?? nansen?.roi_percent_realised);
  const holdingUsd = pickNumber(nansen?.holding_usd);

  const pnl =
    pnlFromSnap.ok || !nansen
      ? pnlFromSnap
      : {
          ok: true as const,
          data: {
            total_realized_profit_percentage: roiPct ?? 0,
            total_realized_profit_usd: realizedUsd ?? 0,
          },
        };
  const nw =
    nwFromSnap.ok || !nansen
      ? nwFromSnap
      : {
          ok: true as const,
          data: { total_networth_usd: holdingUsd ?? 0 },
        };
  return { address, pnl, nw };
}

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
  const nansenTokenFromQuery = normalizeAddress(ev.query.get("token"));
  const nansenTokenFromEnv = normalizeAddress(process.env.NANSEN_TGM_TOKEN_ADDRESS);
  const nansenToken = nansenTokenFromQuery ?? nansenTokenFromEnv;
  const nansenDays = Math.max(1, Math.min(365, parseInt(ev.query.get("days") || "30", 10) || 30));

  const nansenRows: NansenTgmPnlRow[] = [];
  let nansenUsed = false;
  if (nansenToken) {
    const cached = await getGlobalSnapshotJson<{
      token?: string;
      rows?: NansenTgmPnlRow[];
    } | null>(GLOBAL_NANSEN_TGM_PNL);
    const cachedToken = normalizeAddress(cached?.token);
    if (cachedToken && cachedToken === nansenToken && Array.isArray(cached?.rows)) {
      nansenRows.push(...cached.rows);
      nansenUsed = true;
    } else {
      const out = await fetchNansenTgmPnlLeaderboard({
        chain: "ethereum",
        tokenAddress: nansenToken,
        days: nansenDays,
        perPage: 100,
        page: 1,
        premiumLabels: true,
      });
      if (out.ok) {
        nansenRows.push(...out.rows);
        nansenUsed = true;
      }
    }
  }

  const nansenByAddress = new Map<string, NansenTgmPnlRow>();
  for (const row of nansenRows) {
    const a = normalizeAddress(row.trader_address);
    if (!a || nansenByAddress.has(a)) continue;
    nansenByAddress.set(a, row);
  }

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
    nansenRows: nansenByAddress.size,
    nansenToken: nansenToken ?? null,
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
          ? `Listado de traders actualizado. ${
              v.nansenUsed
                ? `Combinando watchlist + Nansen (${v.nansenRows} wallets Nansen, token ${v.nansenToken}).`
                : "Ordena y filtra por dirección en esta página."
            }`
          : v.nansenUsed
            ? `Listado combinado de watchlist + Nansen (${v.nansenRows} wallets Nansen).`
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
