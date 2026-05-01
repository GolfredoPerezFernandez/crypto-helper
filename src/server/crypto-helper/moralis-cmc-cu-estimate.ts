/**
 * Rough Moralis Data API CU estimate for the CMC sync "per token" Moralis phase only.
 * Weights from docs.moralis.com Data API pricing (EVM Token/Wallet-style endpoints).
 * Wallet snapshots + NFT globals use real response headers when available.
 */
import type { MoralisPerTokenSyncMetrics } from "~/server/crypto-helper/cmc-sync-types";

export type MoralisCmcEstimateOpts = {
  topLosersSyncOn: boolean;
  swapsSyncOn: boolean;
  analyticsSyncOn: boolean;
  insightsSyncOn: boolean;
  scoreHistoricalOn: boolean;
  snipersSyncOn: boolean;
  /** `MORALIS_SYNC_TOKEN_ERC20_STATS=1` — getTokenStats (~50 CUs per OK call). */
  erc20StatsSyncOn: boolean;
};

/** Per EVM token that actually hit Moralis (evmWithMoralisKey increments once per token row). */
export function estimateMoralisCmcPhaseCu(
  m: MoralisPerTokenSyncMetrics,
  opts: MoralisCmcEstimateOpts,
): number {
  const n = m.evmWithMoralisKey;
  if (n <= 0) return 0;

  // Parallel "core" batch per token (see buildTokenApiSnapshot in cmc-sync).
  let perToken = 0;
  perToken += 250; // fetchMoralisErc20TopGainers → getTopGainersTokens
  if (opts.topLosersSyncOn) perToken += 250; // getTopLosersTokens
  perToken += 50; // owners
  perToken += 50; // erc20 price
  perToken += 50; // transfers
  perToken += 10; // metadata

  let total = n * perToken;

  total += m.moralisSwapsOk * 50; // getSwapsByTokenAddress
  total += m.moralisAnalyticsOk * 80; // getTokenAnalytics

  const insightsCallsPerOkBundle = opts.insightsSyncOn
    ? opts.scoreHistoricalOn
      ? 100 + 50 + 150 // score + pairs + historical score
      : 100 + 50
    : 0;
  total += m.moralisInsightsBundleOk * insightsCallsPerOkBundle;

  total += m.moralisSnipersOk * 50; // getSnipersByPairAddress
  if (opts.erc20StatsSyncOn) total += m.moralisErc20StatsOk * 50; // getTokenStats /erc20/.../stats

  return Math.max(0, Math.floor(total));
}
