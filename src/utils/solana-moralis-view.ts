/**
 * Best-effort shapes for Moralis Solana gateway JSON (portfolio / swaps).
 * Moralis may rename fields; keep parsers defensive.
 */

export function moralisLooseRows(data: unknown): Record<string, unknown>[] {
  if (data == null) return [];
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  if (typeof data !== "object") return [];
  const o = data as Record<string, unknown>;
  for (const k of ["result", "data", "tokens", "items", "swaps", "pairs", "nfts", "nft"]) {
    const v = o[k];
    if (Array.isArray(v)) return v as Record<string, unknown>[];
  }
  return [];
}

/** Native SOL / lamports label from portfolio root */
export function solanaNativeBalanceLabel(portfolioData: unknown): string | null {
  if (portfolioData == null || typeof portfolioData !== "object") return null;
  const o = portfolioData as Record<string, unknown>;
  const nb = o.nativeBalance ?? o.native_balance ?? o.solana;
  if (typeof nb === "string" || typeof nb === "number") return String(nb);
  if (nb && typeof nb === "object") {
    const n = nb as Record<string, unknown>;
    const s = n.solana ?? n.balance ?? n.amount ?? n.lamports;
    if (s != null) return String(s);
  }
  return null;
}

export function solanaPortfolioTokens(portfolioData: unknown): Record<string, unknown>[] {
  if (portfolioData == null || typeof portfolioData !== "object") return [];
  const o = portfolioData as Record<string, unknown>;
  for (const k of ["tokens", "splTokens", "tokenAccounts", "fungible"]) {
    const v = o[k];
    if (Array.isArray(v)) return v as Record<string, unknown>[];
  }
  return moralisLooseRows(portfolioData);
}

export function solanaPortfolioNfts(portfolioData: unknown): Record<string, unknown>[] {
  if (portfolioData == null || typeof portfolioData !== "object") return [];
  const o = portfolioData as Record<string, unknown>;
  for (const k of ["nfts", "nft", "nftAccounts", "NFTs"]) {
    const v = o[k];
    if (Array.isArray(v)) return v as Record<string, unknown>[];
  }
  return [];
}

function firstStr(row: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return "";
}

/** Table-friendly token row */
export function solanaTokenRowPreview(row: Record<string, unknown>): {
  mint: string;
  symbol: string;
  name: string;
  balance: string;
  usd: string;
} {
  return {
    mint: firstStr(row, ["mint", "tokenAddress", "address", "contract", "associatedTokenAddress"]),
    symbol: firstStr(row, ["symbol", "tokenSymbol"]),
    name: firstStr(row, ["name", "tokenName"]),
    balance: firstStr(row, ["balance", "amount", "uiAmount", "quantity"]),
    usd: firstStr(row, ["usdValue", "valueUsd", "usd_value", "totalUsd"]),
  };
}

export function solanaSwapRowPreview(row: Record<string, unknown>): {
  sig: string;
  when: string;
  kind: string;
} {
  return {
    sig: firstStr(row, ["signature", "transactionHash", "txHash", "hash"]),
    when: firstStr(row, ["blockTimestamp", "block_timestamp", "timestamp", "date"]),
    kind: firstStr(row, ["type", "transactionType", "transaction_type"]),
  };
}
