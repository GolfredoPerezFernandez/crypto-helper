import {
  getGlobalSnapshotJson,
  GLOBAL_NANSEN_TGM_PNL,
} from "~/server/crypto-helper/api-snapshot-sync";
import { fetchNansenTgmPnlLeaderboard, type NansenTgmPnlRow } from "~/server/crypto-helper/nansen-smart-money";
import type { WalletPageSnapshot } from "~/server/crypto-helper/wallet-snapshot";

export type WatchlistWalletRow = {
  address: string;
  pnl: { ok: boolean; data?: unknown; error?: string };
  nw: { ok: boolean; data?: unknown; error?: string };
};

export function normalizeEvmAddress(v: unknown): string | null {
  const a = String(v ?? "")
    .trim()
    .toLowerCase();
  return /^0x[a-f0-9]{40}$/.test(a) ? a : null;
}

function pickNumber(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Merge Moralis wallet snapshot with Nansen TGM PnL row when snapshot is empty. */
export function rowWithNansenFallback(
  address: string,
  nansenByAddress: Map<string, NansenTgmPnlRow>,
  snap: WalletPageSnapshot | null,
): WatchlistWalletRow {
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

export type NansenTgmLoaderResult = {
  byAddress: Map<string, NansenTgmPnlRow>;
  used: boolean;
  rowCount: number;
  token: string | null;
};

/**
 * Loads Nansen Token-God-Mode PnL leaderboard addresses from Turso (daily sync) or live API
 * when query/env token matches the cached token.
 */
export async function loadNansenTgmMap(opts: {
  queryToken: string | null;
  envToken: string | null;
  days: number;
}): Promise<NansenTgmLoaderResult> {
  const nansenToken = opts.queryToken ?? opts.envToken;
  const nansenRows: NansenTgmPnlRow[] = [];
  let used = false;

  if (nansenToken) {
    const cached = await getGlobalSnapshotJson<{
      token?: string;
      rows?: NansenTgmPnlRow[];
    } | null>(GLOBAL_NANSEN_TGM_PNL);
    const cachedToken = normalizeEvmAddress(cached?.token);
    if (cachedToken && cachedToken === nansenToken && Array.isArray(cached?.rows)) {
      nansenRows.push(...cached.rows);
      used = true;
    } else {
      const out = await fetchNansenTgmPnlLeaderboard({
        chain: "ethereum",
        tokenAddress: nansenToken,
        days: opts.days,
        perPage: 100,
        page: 1,
        premiumLabels: true,
      });
      if (out.ok) {
        nansenRows.push(...out.rows);
        used = true;
      }
    }
  }

  const byAddress = new Map<string, NansenTgmPnlRow>();
  for (const row of nansenRows) {
    const a = normalizeEvmAddress(row.trader_address);
    if (!a || byAddress.has(a)) continue;
    byAddress.set(a, row);
  }

  return {
    byAddress,
    used,
    rowCount: byAddress.size,
    token: nansenToken,
  };
}
