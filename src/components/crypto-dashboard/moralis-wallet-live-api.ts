export type MoralisWalletLiveKind =
  | "history"
  | "erc20"
  | "swaps"
  | "defiSummary"
  | "defiPositions"
  | "nftTrades"
  | "verbose"
  | "nativeRaw"
  | "insight"
  | "stats"
  | "activeChains";

/** UI order + labels (matches dashboard selector). */
export const MORALIS_WALLET_LIVE_KINDS: { id: MoralisWalletLiveKind; label: string }[] = [
  { id: "history", label: "Wallet history" },
  { id: "erc20", label: "ERC20 por wallet" },
  { id: "swaps", label: "Swaps DEX" },
  { id: "defiSummary", label: "DeFi resumen" },
  { id: "defiPositions", label: "DeFi posiciones" },
  { id: "nftTrades", label: "NFT trades" },
  { id: "verbose", label: "Txs nativas decodificadas" },
  { id: "nativeRaw", label: "Txs nativas raw" },
  { id: "insight", label: "Wallet insight" },
  { id: "stats", label: "Wallet stats" },
  { id: "activeChains", label: "Cadenas activas" },
];

export function moralisLiveSlotKey(kind: MoralisWalletLiveKind, chain: "base" | "eth"): string {
  return `${kind}|${chain}`;
}

export function buildMoralisWalletLiveUrl(
  kind: MoralisWalletLiveKind,
  chain: "base" | "eth",
  encodedWalletAddress: string,
): string {
  const root = `/api/crypto/moralis/wallet/${encodedWalletAddress}`;
  switch (kind) {
    case "history":
      return `${root}/history?chain=${chain}&limit=25&order=DESC`;
    case "erc20":
      return `${root}/erc20/transfers?chain=${chain}&limit=40&order=DESC`;
    case "swaps":
      return `${root}/swaps?chain=${chain}&limit=20&order=DESC`;
    case "defiSummary":
      return `${root}/defi/summary?chain=${chain}`;
    case "defiPositions":
      return `${root}/defi/positions?chain=${chain}`;
    case "nftTrades":
      return `${root}/nfts/trades?chain=${chain}&limit=20&nft_metadata=true`;
    case "verbose":
      return `${root}/verbose?chain=${chain}&limit=25&order=DESC`;
    case "nativeRaw":
      return `${root}/native?chain=${chain}&limit=25&order=DESC`;
    case "insight":
      return `${root}/insight?chains=${encodeURIComponent(chain)}`;
    case "stats":
      return `${root}/stats?chain=${chain}`;
    case "activeChains":
      return `${root}/chains?chains=${encodeURIComponent(chain)}`;
    default:
      return root;
  }
}
