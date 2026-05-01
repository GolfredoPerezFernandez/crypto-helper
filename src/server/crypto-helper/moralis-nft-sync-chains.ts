/**
 * Moralis NFT API `chain` query values (mainnets). See NFT Metadata / Collections by Wallet docs.
 * Override list with env: `MORALIS_SYNC_WALLET_NFT_CHAINS=eth,base,polygon,...` (comma or space separated).
 */
export const MORALIS_NFT_DEFAULT_MAINNET_CHAINS: readonly string[] = [
  "eth",
  "base",
  "polygon",
  "arbitrum",
  "optimism",
  "bsc",
  "avalanche",
  "linea",
  "gnosis",
  "fantom",
  "cronos",
  "moonbeam",
  "moonriver",
  "pulse",
  "sei",
  "monad",
];

/** Short labels for wallet UI (Spanish-friendly names where obvious). */
export const MORALIS_NFT_CHAIN_LABEL: Record<string, string> = {
  eth: "Ethereum",
  base: "Base",
  polygon: "Polygon",
  arbitrum: "Arbitrum",
  optimism: "Optimism",
  bsc: "BNB Chain",
  avalanche: "Avalanche",
  linea: "Linea",
  gnosis: "Gnosis",
  fantom: "Fantom",
  cronos: "Cronos",
  moonbeam: "Moonbeam",
  moonriver: "Moonriver",
  pulse: "Pulse",
  sei: "Sei",
  monad: "Monad",
  flow: "Flow",
  ronin: "Ronin",
  lisk: "Lisk",
  chiliz: "Chiliz",
};

export function moralisNftChainLabel(slug: string): string {
  const k = slug.trim().toLowerCase();
  return MORALIS_NFT_CHAIN_LABEL[k] ?? k.toUpperCase();
}

export function getMoralisWalletNftSyncChains(): string[] {
  const raw = String(process.env.MORALIS_SYNC_WALLET_NFT_CHAINS ?? "").trim();
  if (raw) {
    const parts = raw
      .split(/[\s,]+/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    return [...new Set(parts)];
  }
  return [...MORALIS_NFT_DEFAULT_MAINNET_CHAINS];
}
