/** Aggregated Moralis outcomes during token row sync (cmc-sync). */
export type MoralisPerTokenSyncMetrics = {
  evmWithMoralisKey: number;
  skippedNoContractOrKey: number;
  moralisCore5AllOk: number;
  moralisCore5PartialFail: number;
  moralisSwapsAttempted: number;
  moralisSwapsOk: number;
  moralisSwapsFail: number;
  moralisAnalyticsAttempted: number;
  moralisAnalyticsOk: number;
  moralisAnalyticsFail: number;
  moralisInsightsAttempted: number;
  moralisInsightsBundleOk: number;
  moralisInsightsBundleFail: number;
  moralisTopLosersAttempted: number;
  moralisTopLosersOk: number;
  moralisTopLosersFail: number;
  moralisSnipersAttempted: number;
  moralisSnipersOk: number;
  moralisSnipersFail: number;
  /** Optional: `MORALIS_SYNC_TOKEN_ERC20_STATS=1` — GET /erc20/{addr}/stats (~50 CUs). */
  moralisErc20StatsAttempted: number;
  moralisErc20StatsOk: number;
  moralisErc20StatsFail: number;
};
