/**
 * Aggregate Moralis ERC20 top holders already stored in `cached_market_tokens.api_snapshot` (owners).
 * Filled during daily CMC sync via `fetchMoralisErc20Owners` — no live Moralis calls from this route.
 */

import { desc, sql } from "drizzle-orm";
import { db } from "~/lib/turso";
import { cachedMarketTokens } from "../../../drizzle/schema";
import { parseTokenApiSnapshot } from "~/server/crypto-ghost/market-token-snapshot";

export type TopHolderRow = {
  ownerAddress: string;
  label: string;
  balanceFormatted: string;
  pctSupply: number | null;
  usdValue: number | null;
};

export type TokenTopHoldersGroup = {
  tokenId: number;
  symbol: string;
  name: string;
  tokenAddress: string;
  category: string;
  moralisChain: string;
  holders: TopHolderRow[];
};

function moralisResultRows(data: unknown): Record<string, unknown>[] {
  if (data == null || typeof data !== "object") return [];
  const o = data as Record<string, unknown>;
  if (Array.isArray(o.result)) return o.result as Record<string, unknown>[];
  return [];
}

function holderWallet(r: Record<string, unknown>): string {
  return String(r.owner_address ?? r.ownerAddress ?? r.address ?? r.wallet ?? "").trim().toLowerCase();
}

function numish(v: unknown): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

/**
 * Loads recently updated EVM tokens, parses `owners` from each snapshot, returns up to `maxHoldersPerToken` per token.
 */
export async function loadTopTokenHoldersGroups(opts: {
  maxTokens: number;
  maxHoldersPerToken: number;
}): Promise<{ groups: TokenTopHoldersGroup[]; tokensScanned: number }> {
  const { maxTokens, maxHoldersPerToken } = opts;
  const rows = await db
    .select({
      id: cachedMarketTokens.id,
      symbol: cachedMarketTokens.symbol,
      name: cachedMarketTokens.name,
      address: cachedMarketTokens.address,
      category: cachedMarketTokens.category,
      apiSnapshot: cachedMarketTokens.apiSnapshot,
    })
    .from(cachedMarketTokens)
    .where(sql`lower(trim(${cachedMarketTokens.address})) like '0x%'`)
    .orderBy(
      desc(sql`(CASE WHEN trim(${cachedMarketTokens.volume}) GLOB '*[0-9]*' THEN CAST(trim(${cachedMarketTokens.volume}) AS REAL) ELSE 0 END)`),
      desc(cachedMarketTokens.updatedAt),
    )
    .limit(Math.max(1, Math.min(200, maxTokens)));

  const groups: TokenTopHoldersGroup[] = [];
  for (const row of rows) {
    const addr = String(row.address || "").trim().toLowerCase();
    if (!/^0x[a-f0-9]{40}$/.test(addr)) continue;
    const snap = parseTokenApiSnapshot(row.apiSnapshot ?? null);
    const owners = snap?.owners;
    if (!owners?.ok || owners.data == null) continue;
    const raw = moralisResultRows(owners.data);
    if (!raw.length) continue;
    const moralisChain = String(snap?.moralisChain || "eth").trim() || "eth";

    const holders: TopHolderRow[] = [];
    for (const r of raw.slice(0, maxHoldersPerToken)) {
      const ownerAddress = holderWallet(r);
      if (!/^0x[a-f0-9]{40}$/.test(ownerAddress)) continue;
      const label = String(r.owner_address_label ?? r.ownerAddressLabel ?? r.entity ?? "").trim() || "—";
      const balanceFormatted = String(r.balance_formatted ?? r.balanceFormatted ?? r.balance ?? "—");
      const pctSupply = numish(r.percentage_relative_to_total_supply ?? r.percentageRelativeToTotalSupply);
      const usdValue = numish(r.usd_value ?? r.usdValue);
      holders.push({ ownerAddress, label, balanceFormatted, pctSupply, usdValue });
    }
    if (!holders.length) continue;

    groups.push({
      tokenId: row.id,
      symbol: String(row.symbol || "?"),
      name: String(row.name || ""),
      tokenAddress: addr,
      category: String(row.category || ""),
      moralisChain,
      holders,
    });
  }

  return { groups, tokensScanned: rows.length };
}
