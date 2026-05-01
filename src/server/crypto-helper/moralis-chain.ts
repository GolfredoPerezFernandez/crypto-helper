/** Map CMC / cached `network` label to Moralis `chain` query value. */
export function moralisChainFromNetworkLabel(network: string | undefined | null): string {
  const n = String(network || "").toLowerCase();
  if (/\bbase\b/.test(n) || n.includes("coinbase layer")) return "base";
  if (n.includes("arbitrum")) return "arbitrum";
  if (n.includes("optimism") || /\bop mainnet\b/.test(n)) return "optimism";
  if (n.includes("polygon") || n.includes("matic")) return "polygon";
  if (n.includes("bsc") || n.includes("bnb")) return "bsc";
  if (n.includes("avalanche") || n.includes("avax")) return "avalanche";
  if (n.includes("fantom")) return "fantom";
  if (n.includes("gnosis") || n.includes("xdai")) return "gnosis";
  if (n.includes("linea")) return "linea";
  if (n.includes("blast")) return "blast";
  if (n.includes("cronos")) return "cronos";
  return "eth";
}
