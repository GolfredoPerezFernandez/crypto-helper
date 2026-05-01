/**
 * Normalize Moralis wallet snapshot payloads for dashboard tables.
 * API shapes vary (nested summary, multi-chain net worth without top-level total).
 */
import type { MoralisWalletTokensResult } from "~/server/crypto-helper/moralis-api";
import type { WalletPageSnapshot } from "~/server/crypto-helper/wallet-snapshot";

function unwrapRecord(data: unknown): Record<string, unknown> | null {
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  if (o.summary && typeof o.summary === "object") {
    return o.summary as Record<string, unknown>;
  }
  return o;
}

function numish(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

function profitabilityFromMoralisData(data: unknown): {
  total_realized_profit_percentage: number | null;
  total_realized_profit_usd: number | null;
} | null {
  const o = unwrapRecord(data);
  if (!o) return null;
  const pct = numish(o.total_realized_profit_percentage ?? o.totalRealizedProfitPercentage);
  const usd = numish(o.total_realized_profit_usd ?? o.totalRealizedProfitUsd);
  if (pct == null && usd == null) return null;
  return {
    total_realized_profit_percentage: pct,
    total_realized_profit_usd: usd,
  };
}

function pickFirstOkData(...results: (MoralisWalletTokensResult | undefined)[]): unknown | null {
  for (const r of results) {
    if (r?.ok) return r.data;
  }
  return null;
}

/** PnL summary: prefer Ethereum, then Base (many wallets only have one chain populated). */
export function walletProfitabilityDisplay(snap: WalletPageSnapshot | null) {
  const data = pickFirstOkData(snap?.pnlEth, snap?.pnlBase);
  return profitabilityFromMoralisData(data);
}

function netWorthFromMoralisData(data: unknown): number | null {
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  const top = numish(o.total_networth_usd ?? o.totalNetworthUsd);
  if (top != null && top > 0) return top;
  const chains = o.chains;
  if (Array.isArray(chains)) {
    let sum = 0;
    for (const c of chains) {
      if (c && typeof c === "object") {
        const rec = c as Record<string, unknown>;
        const v = numish(rec.networth_usd ?? rec.networthUsd);
        if (v != null) sum += v;
      }
    }
    if (sum > 0) return sum;
  }
  return top;
}

/**
 * Prefer multi-chain snapshot (`nw`) for a stable total; fall back to ETH-only `nwEth`.
 */
export function walletNetWorthUsdDisplay(snap: WalletPageSnapshot | null): number | null {
  const fromMulti = snap?.nw?.ok ? netWorthFromMoralisData(snap.nw.data) : null;
  if (fromMulti != null) return fromMulti;
  const fromEth = snap?.nwEth?.ok ? netWorthFromMoralisData(snap.nwEth.data) : null;
  return fromEth;
}
