/** Canonical Moralis doc entry points for Solana Data API (adjust if docs move). */
export const MORALIS_SOLANA = {
  root: "https://docs.moralis.com/web3-data-api/solana",
  walletOverview: "https://docs.moralis.com/web3-data-api/solana/wallet-api",
  /** GET …/account/{network}/{address}/portfolio */
  walletPortfolio: "https://docs.moralis.com/data-api/solana/reference/get-wallet-portfolio",
  /** GET …/account/{network}/{address}/swaps */
  walletSwaps: "https://docs.moralis.com/data-api/solana/reference/get-wallet-swaps",
  tokenOverview: "https://docs.moralis.com/web3-data-api/solana/token-api",
  /** Mintlify: Solana Token API hub */
  tokenApiOverview: "https://docs.moralis.com/data-api/solana/token/overview",
  /** GET solana-gateway …/token/{network}/{mint}/metadata (~10 CUs) */
  tokenMetadata: "https://docs.moralis.com/data-api/solana/token/token-metadata",
  /** GET …/token/{network}/{mint}/top-holders (~50 CUs, Pro+) */
  tokenTopHolders: "https://docs.moralis.com/data-api/solana/token/holders/top-holders",
  /** GET …/token/{network}/holders/{mint}/historical (~50 CUs, Pro+) */
  tokenHoldersHistorical: "https://docs.moralis.com/data-api/solana/token/holders/historical-token-holders",
  /** GET …/token/{network}/{mint}/swaps (~50 CUs, Pro+) */
  tokenSwaps: "https://docs.moralis.com/data-api/solana/token/swaps/token-swaps",
  /** GET …/token/{network}/pairs/{pair}/swaps (~50 CUs, Pro+) */
  pairSwaps: "https://docs.moralis.com/data-api/solana/token/swaps/pair-swaps",
  /** GET …/token/{network}/{mint}/pairs (limit ≤ 50, ~50 CUs, Pro+) */
  tokenPairs: "https://docs.moralis.com/data-api/solana/token/pairs/token-pairs",
  nftOverview: "https://docs.moralis.com/web3-data-api/solana/nft-api",
  /** User-provided */
  priceOverview: "https://docs.moralis.com/data-api/solana/price/overview",
  /** Cross-chain token search (reference for discovery patterns). */
  universalTokenSearch: "https://docs.moralis.com/data-api/universal/token/search/token-search",
  /**
   * Token score for SPL: same EVM endpoint with `chain=solana` (deep-index), not solana-gateway.
   * https://docs.moralis.com/data-api/evm/token/metadata/token-score
   */
  tokenScoreSolanaNote: "https://docs.moralis.com/data-api/evm/token/metadata/token-score",
  /**
   * Universal token analytics timeseries (POST); body includes `chain: solana` + SPL mint alongside EVM pairs.
   * https://docs.moralis.com/data-api/universal/token/analytics/token-analytics-timeseries
   */
  tokenAnalyticsTimeseries: "https://docs.moralis.com/data-api/universal/token/analytics/token-analytics-timeseries",
} as const;
