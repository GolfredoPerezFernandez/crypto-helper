/**
 * Moralis REST helpers (server-only). Split from crypto-ghost-actions so cmc-sync can import
 * without circular deps (actions → cmc-sync → actions).
 */

const MORALIS_BASE = "https://deep-index.moralis.io/api/v2.2";
const MORALIS_SOLANA_BASE = "https://solana-gateway.moralis.io";
/** Moralis Universal API v1 — multi-chain DeFi/wallet endpoints (per docs.moralis.com). */
const MORALIS_UNIVERSAL_BASE = "https://api.moralis.com";

export type MoralisWalletTokensResult =
  | { ok: true; data: unknown }
  | { ok: false; error: string };

function moralisNetErr(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}

/**
 * Some Moralis endpoints (and their gateways) reply with Express-style HTML when the path is
 * outdated. We never want to surface that raw markup to the UI, so we collapse it to a short
 * message that callers can show safely.
 */
function condenseErrorBody(body: string, status: number): string {
  const trimmed = body.trim();
  if (!trimmed) return `HTTP ${status}`;
  const lower = trimmed.slice(0, 80).toLowerCase();
  if (lower.startsWith("<!doctype") || lower.startsWith("<html") || lower.includes("<pre>cannot ")) {
    const m = trimmed.match(/<pre>([^<]+)<\/pre>/i);
    const detail = m ? m[1].trim() : "";
    return `HTTP ${status}${detail ? ` · ${detail}` : " · upstream returned HTML"}`;
  }
  return trimmed.length > 280 ? `${trimmed.slice(0, 280)}…` : trimmed;
}

async function readErrBody(res: Response): Promise<string> {
  try {
    const raw = await res.text();
    return condenseErrorBody(raw, res.status);
  } catch {
    return res.statusText || `HTTP ${res.status}`;
  }
}

export async function moralisGet(pathWithQuery: string): Promise<MoralisWalletTokensResult> {
  try {
    const key = process.env.MORALIS_API_KEY?.trim();
    if (!key) return { ok: false, error: "Missing MORALIS_API_KEY" };
    const url = `${MORALIS_BASE}${pathWithQuery}`;
    const res = await fetch(url, { headers: { accept: "application/json", "X-API-Key": key } });
    if (!res.ok) return { ok: false, error: await readErrBody(res) };
    const json = await res.json();
    return { ok: true, data: json };
  } catch (e) {
    return { ok: false, error: moralisNetErr(e) };
  }
}

/**
 * Moralis Universal API v1 — `https://api.moralis.com/v1/...`.
 * Used for multi-chain endpoints (DeFi summary/positions) per `docs.moralis.com`.
 */
export async function moralisUniversalGet(
  pathWithQuery: string,
): Promise<MoralisWalletTokensResult> {
  try {
    const key = process.env.MORALIS_API_KEY?.trim();
    if (!key) return { ok: false, error: "Missing MORALIS_API_KEY" };
    const url = `${MORALIS_UNIVERSAL_BASE}/v1${pathWithQuery}`;
    const res = await fetch(url, { headers: { accept: "application/json", "X-API-Key": key } });
    if (!res.ok) return { ok: false, error: await readErrBody(res) };
    const json = await res.json();
    return { ok: true, data: json };
  } catch (e) {
    return { ok: false, error: moralisNetErr(e) };
  }
}

/** Solana Data API (same API key as EVM; header name matches deep-index). */
export async function moralisSolanaGet(pathWithQuery: string): Promise<MoralisWalletTokensResult> {
  try {
    const key = process.env.MORALIS_API_KEY?.trim();
    if (!key) return { ok: false, error: "Missing MORALIS_API_KEY" };
    const url = `${MORALIS_SOLANA_BASE}${pathWithQuery}`;
    const res = await fetch(url, { headers: { accept: "application/json", "X-API-Key": key } });
    if (!res.ok) return { ok: false, error: await readErrBody(res) };
    const json = await res.json();
    return { ok: true, data: json };
  } catch (e) {
    return { ok: false, error: moralisNetErr(e) };
  }
}

async function moralisPostJson(pathWithQuery: string, body: unknown): Promise<MoralisWalletTokensResult> {
  try {
    const key = process.env.MORALIS_API_KEY?.trim();
    if (!key) return { ok: false, error: "Missing MORALIS_API_KEY" };
    const url = `${MORALIS_BASE}${pathWithQuery}`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        accept: "application/json",
        "Content-Type": "application/json",
        "X-API-Key": key,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) return { ok: false, error: await readErrBody(res) };
    const json = await res.json();
    return { ok: true, data: json };
  } catch (e) {
    return { ok: false, error: moralisNetErr(e) };
  }
}

export type MoralisErc20PriceTokenItem = {
  token_address: string;
  exchange?: string;
  to_block?: string;
};

function normalizeErc20PriceTokens(
  input: string[] | MoralisErc20PriceTokenItem[],
): MoralisErc20PriceTokenItem[] {
  if (!input.length) return [];
  const first = input[0];
  if (typeof first === "string") {
    return (input as string[])
      .map((a) => String(a).trim().toLowerCase())
      .filter((a) => /^0x[a-f0-9]{40}$/.test(a))
      .slice(0, 30)
      .map((token_address) => ({ token_address }));
  }
  return (input as MoralisErc20PriceTokenItem[])
    .map((t) => {
      const token_address = String(t.token_address).trim().toLowerCase();
      const o: MoralisErc20PriceTokenItem = { token_address };
      if (t.exchange != null && String(t.exchange).trim()) o.exchange = String(t.exchange).trim();
      if (t.to_block != null && String(t.to_block).trim()) o.to_block = String(t.to_block).trim();
      return o;
    })
    .filter((t) => /^0x[a-f0-9]{40}$/.test(t.token_address))
    .slice(0, 30);
}

/**
 * POST /erc20/prices — batch token prices (USD, native, 24h %, liquidity, securityScore, etc.).
 * OpenAPI `tokens` maxItems: 30 (description text may say “up to 100”). Optional query filters:
 * `max_token_inactivity`, `min_pair_side_liquidity_usd`. ~100 CUs, mainnet-focused per Moralis.
 * https://docs.moralis.com/data-api/evm/token/prices/token-prices-batch
 */
export async function fetchMoralisErc20PricesBatch(
  tokensOrAddresses: string[] | MoralisErc20PriceTokenItem[],
  chain: string,
  opts?: {
    max_token_inactivity?: number;
    min_pair_side_liquidity_usd?: number;
  },
): Promise<MoralisWalletTokensResult> {
  const tokens = normalizeErc20PriceTokens(tokensOrAddresses);
  if (!tokens.length) return { ok: false, error: "No valid token addresses" };
  const ch = encodeURIComponent(chain);
  let qs = `chain=${ch}`;
  if (opts?.max_token_inactivity != null && Number.isFinite(opts.max_token_inactivity)) {
    qs += `&max_token_inactivity=${encodeURIComponent(String(opts.max_token_inactivity))}`;
  }
  if (opts?.min_pair_side_liquidity_usd != null && Number.isFinite(opts.min_pair_side_liquidity_usd)) {
    qs += `&min_pair_side_liquidity_usd=${encodeURIComponent(String(opts.min_pair_side_liquidity_usd))}`;
  }
  return moralisPostJson(`/erc20/prices?${qs}`, { tokens });
}

/**
 * Prefer batch price (richer fields); fall back to GET /erc20/{address}/price.
 */
export async function fetchMoralisErc20PriceBestEffort(
  tokenAddress: string,
  chain: string,
): Promise<MoralisWalletTokensResult> {
  const batch = await fetchMoralisErc20PricesBatch([tokenAddress], chain);
  if (batch.ok && Array.isArray(batch.data) && batch.data.length > 0) {
    return { ok: true, data: batch.data[0] };
  }
  return fetchMoralisErc20Price(tokenAddress, chain);
}

export async function fetchMoralisWalletTokens(
  address: string,
  chain: string = "base",
): Promise<MoralisWalletTokensResult> {
  if (!address) return { ok: false, error: "Missing address" };
  return moralisGet(
    `/wallets/${encodeURIComponent(address)}/tokens?chain=${encodeURIComponent(
      chain,
    )}&exclude_spam=true&exclude_unverified_contracts=true`,
  );
}

export async function fetchMoralisNativeBalance(
  address: string,
  chain: string = "base",
): Promise<MoralisWalletTokensResult> {
  if (!address) return { ok: false, error: "Missing address" };
  return moralisGet(
    `/wallets/${encodeURIComponent(address)}/balance?chain=${encodeURIComponent(chain)}`,
  );
}

export async function fetchMoralisErc20Metadata(
  tokenAddress: string,
  chain: string = "base",
): Promise<MoralisWalletTokensResult> {
  if (!tokenAddress) return { ok: false, error: "Missing token address" };
  const addr = encodeURIComponent(tokenAddress);
  const ch = encodeURIComponent(chain);
  return moralisGet(`/erc20/metadata?chain=${ch}&addresses=${addr}`);
}

export async function fetchMoralisWalletProfitabilitySummary(
  address: string,
  chain: string = "eth",
  days: string = "all",
): Promise<MoralisWalletTokensResult> {
  if (!address) return { ok: false, error: "Missing address" };
  const ch = encodeURIComponent(chain);
  const d = encodeURIComponent(days);
  return moralisGet(`/wallets/${encodeURIComponent(address)}/profitability/summary?chain=${ch}&days=${d}`);
}

function moralisChainsQuery(chains: string | string[]): string {
  const flat =
    typeof chains === "string" ? chains.split(",") : chains.flatMap((s) => s.split(","));
  const list = flat.map((c) => c.trim().toLowerCase()).filter(Boolean);
  const normalized = list.length > 0 ? list : ["eth"];
  return normalized.map((c) => `chains=${encodeURIComponent(c)}`).join("&");
}

export async function fetchMoralisWalletNetWorth(
  address: string,
  chains: string | string[] = "eth",
): Promise<MoralisWalletTokensResult> {
  if (!address) return { ok: false, error: "Missing address" };
  const chainQs = moralisChainsQuery(chains);
  return moralisGet(
    `/wallets/${encodeURIComponent(address)}/net-worth?${chainQs}&exclude_spam=true&exclude_unverified_contracts=true`,
  );
}

/**
 * Universal API only knows the long chain slugs (`ethereum`, `base`, `arbitrum`, …) or hex chain
 * ids (`0x1`, `0x2105`, …). Normalize the legacy short names we use elsewhere ("eth", "bsc", …).
 */
function normalizeUniversalChain(input: string): string {
  const v = input.trim().toLowerCase();
  if (!v) return "ethereum";
  switch (v) {
    case "eth":
      return "ethereum";
    case "bsc":
      return "binance";
    case "matic":
      return "polygon";
    case "op":
      return "optimism";
    case "arb":
      return "arbitrum";
    case "avax":
      return "avalanche";
    default:
      return v;
  }
}

/**
 * Build a `chains=` query for the Universal API (defi endpoints) accepting
 * either a single chain id (`eth` / `0x1`) or an array. Defaults to `["ethereum","base"]`.
 */
function moralisUniversalChainsQuery(chains: string | string[] | undefined): string {
  let arr: string[];
  if (chains == null) {
    arr = ["ethereum", "base"];
  } else if (Array.isArray(chains)) {
    arr = chains.map((c) => normalizeUniversalChain(String(c))).filter(Boolean);
  } else {
    arr = String(chains)
      .split(",")
      .map((c) => normalizeUniversalChain(c))
      .filter(Boolean);
  }
  if (arr.length === 0) arr = ["ethereum", "base"];
  return arr.map((c) => `chains=${encodeURIComponent(c)}`).join("&");
}

/**
 * GET /v1/wallets/{walletAddressOrPublicKey}/tokens — Cross-chain ERC-20 balances.
 * Universal API multi-chain successor to the legacy `/wallets/:a/tokens?chain=…` endpoint.
 * 100 CUs per request (single call covers all requested chains). EVM only today.
 *
 * Response shape per `docs.moralis.com`:
 *   { meta, address, addressType, cursor, result: ChainBalanceDto[] }
 *
 * `ChainBalanceDto` includes per-token: chainId, balance / balanceRaw, usdPrice,
 * usdPrice24hrPercentChange, usdValue, portfolioPercentage, securityScore,
 * verifiedContract, possibleSpam, nativeToken, logo, decimals.
 */
export async function fetchMoralisWalletCrossChainTokens(
  address: string,
  chains: string | string[] = ["ethereum", "base"],
  opts?: {
    limit?: number;
    cursor?: string;
    excludeSpam?: boolean;
    excludeUnverifiedContracts?: boolean;
    excludeNative?: boolean;
    maxTokenInactivity?: number;
    liquidityThreshold?: number;
    tokenAddresses?: string[];
  },
): Promise<MoralisWalletTokensResult> {
  if (!address) return { ok: false, error: "Missing address" };
  const qs = moralisUniversalChainsQuery(chains);
  const lim = Math.max(1, Math.min(1000, Math.floor(Number(opts?.limit) || 200)));
  const parts: string[] = [qs, `limit=${lim}`];
  if (opts?.cursor) parts.push(`cursor=${encodeURIComponent(opts.cursor)}`);
  // Sensible defaults (spam/unverified excluded) match the wallet UI expectations.
  const excludeSpam = opts?.excludeSpam !== false;
  const excludeUnverified = opts?.excludeUnverifiedContracts !== false;
  if (excludeSpam) parts.push("excludeSpam=true");
  if (excludeUnverified) parts.push("excludeUnverifiedContracts=true");
  if (opts?.excludeNative) parts.push("excludeNative=true");
  if (typeof opts?.maxTokenInactivity === "number")
    parts.push(`maxTokenInactivity=${opts.maxTokenInactivity}`);
  if (typeof opts?.liquidityThreshold === "number")
    parts.push(`liquidityThreshold=${opts.liquidityThreshold}`);
  if (Array.isArray(opts?.tokenAddresses) && opts.tokenAddresses.length > 0) {
    for (const t of opts.tokenAddresses.slice(0, 50)) {
      const addr = String(t).trim();
      if (/^0x[a-fA-F0-9]{40}$/.test(addr)) {
        parts.push(`tokenAddresses=${encodeURIComponent(addr.toLowerCase())}`);
      }
    }
  }
  return moralisUniversalGet(
    `/wallets/${encodeURIComponent(address)}/tokens?${parts.join("&")}`,
  );
}

/**
 * GET /v1/wallets/{walletAddress}/defi/summary — DeFi summary across multiple chains.
 * Universal API (api.moralis.com), 5000 CUs per call, mainnet only.
 */
export async function fetchMoralisWalletDefiSummary(
  address: string,
  chains: string | string[] = ["ethereum", "base"],
): Promise<MoralisWalletTokensResult> {
  if (!address) return { ok: false, error: "Missing address" };
  const qs = moralisUniversalChainsQuery(chains);
  return moralisUniversalGet(
    `/wallets/${encodeURIComponent(address)}/defi/summary?${qs}`,
  );
}

/**
 * GET /v1/wallets/{walletAddress}/defi/positions — DeFi positions (lending, liquidity, staking,
 * farming, perps, vault, yield, vesting, other) across multiple chains. Universal API.
 * 5000 CUs per call, mainnet only.
 */
export async function fetchMoralisWalletDefiPositions(
  address: string,
  chains: string | string[] = ["ethereum", "base"],
  opts?: { limit?: number; cursor?: string },
): Promise<MoralisWalletTokensResult> {
  if (!address) return { ok: false, error: "Missing address" };
  const qs = moralisUniversalChainsQuery(chains);
  const lim = Math.max(1, Math.min(100, Math.floor(Number(opts?.limit) || 50)));
  let path = `/wallets/${encodeURIComponent(address)}/defi/positions?${qs}&limit=${lim}`;
  if (opts?.cursor) path += `&cursor=${encodeURIComponent(opts.cursor)}`;
  return moralisUniversalGet(path);
}

/**
 * GET /v1/wallets/{walletAddress}/defi/{protocol}/positions — DeFi positions filtered by protocol.
 * `protocol`: Moralis slug (e.g. aave-v3, uniswap-v3). Universal API, 5000 CUs, mainnet only.
 */
export async function fetchMoralisWalletDefiPositionsByProtocol(
  address: string,
  protocol: string,
  chains: string | string[] = ["ethereum", "base"],
  opts?: { limit?: number; cursor?: string },
): Promise<MoralisWalletTokensResult> {
  if (!address) return { ok: false, error: "Missing address" };
  const p = String(protocol).trim();
  if (!p) return { ok: false, error: "Missing protocol id" };
  const qs = moralisUniversalChainsQuery(chains);
  const lim = Math.max(1, Math.min(100, Math.floor(Number(opts?.limit) || 50)));
  let path = `/wallets/${encodeURIComponent(address)}/defi/${encodeURIComponent(p)}/positions?${qs}&limit=${lim}`;
  if (opts?.cursor) path += `&cursor=${encodeURIComponent(opts.cursor)}`;
  return moralisUniversalGet(path);
}

export async function fetchMoralisNftHottestCollections(): Promise<MoralisWalletTokensResult> {
  return moralisGet("/market-data/nfts/hottest-collections");
}

export async function fetchMoralisNftTopCollections(): Promise<MoralisWalletTokensResult> {
  return moralisGet("/market-data/nfts/top-collections");
}

/**
 * GET /{address}/nft/collections — NFT collections held by wallet (aggregated per contract).
 * ~50 CUs per request. Docs:
 * https://docs.moralis.com/data-api/evm/nft/collections/nft-collections-by-wallet
 */
export async function fetchMoralisWalletNftCollections(
  address: string,
  chain: string = "base",
  opts?: {
    limit?: number;
    cursor?: string;
    exclude_spam?: boolean;
    include_prices?: boolean;
    token_counts?: boolean;
  },
): Promise<MoralisWalletTokensResult> {
  if (!address) return { ok: false, error: "Missing address" };
  const addr = encodeURIComponent(address);
  const ch = encodeURIComponent(chain);
  const lim = Math.min(100, Math.max(1, Math.floor(Number(opts?.limit) || 50)));
  let path = `/${addr}/nft/collections?chain=${ch}&limit=${lim}`;
  if (opts?.exclude_spam !== false) path += `&exclude_spam=true`;
  if (opts?.include_prices === true) path += `&include_prices=true`;
  if (opts?.token_counts === true) path += `&token_counts=true`;
  if (opts?.cursor) path += `&cursor=${encodeURIComponent(opts.cursor)}`;
  return moralisGet(path);
}

/**
 * GET /wallets/{address}/history — decoded wallet activity (categories, labels).
 * https://docs.moralis.com/data-api/evm/wallet/wallet-history
 */
export async function fetchMoralisWalletHistory(
  address: string,
  chain: string = "base",
  opts?: { limit?: number; cursor?: string; order?: "ASC" | "DESC" },
): Promise<MoralisWalletTokensResult> {
  if (!address) return { ok: false, error: "Missing address" };
  const addr = encodeURIComponent(address);
  const ch = encodeURIComponent(chain);
  const lim = Math.min(100, Math.max(1, Math.floor(Number(opts?.limit) || 25)));
  const ord = opts?.order ?? "DESC";
  let path = `/wallets/${addr}/history?chain=${ch}&limit=${lim}&order=${ord}`;
  if (opts?.cursor) path += `&cursor=${encodeURIComponent(opts.cursor)}`;
  return moralisGet(path);
}

/**
 * GET /{address}/erc20/transfers — ERC20 transfers for a wallet (not /erc20/{token}/transfers).
 * https://docs.moralis.com/data-api/evm/reference/get-wallet-token-transfers
 */
export async function fetchMoralisWalletAddressErc20Transfers(
  address: string,
  chain: string = "base",
  opts?: {
    limit?: number;
    cursor?: string;
    order?: "ASC" | "DESC";
    from_block?: number;
    to_block?: number;
    from_date?: string;
    to_date?: string;
  },
): Promise<MoralisWalletTokensResult> {
  if (!address) return { ok: false, error: "Missing address" };
  const addr = encodeURIComponent(address);
  const ch = encodeURIComponent(chain);
  const lim = Math.min(100, Math.max(1, Math.floor(Number(opts?.limit) || 50)));
  const ord = opts?.order ?? "DESC";
  let path = `/${addr}/erc20/transfers?chain=${ch}&limit=${lim}&order=${ord}`;
  if (opts?.cursor) path += `&cursor=${encodeURIComponent(opts.cursor)}`;
  if (opts?.from_block != null && Number.isFinite(opts.from_block)) path += `&from_block=${opts.from_block}`;
  if (opts?.to_block != null && Number.isFinite(opts.to_block)) path += `&to_block=${opts.to_block}`;
  if (opts?.from_date) path += `&from_date=${encodeURIComponent(opts.from_date)}`;
  if (opts?.to_date) path += `&to_date=${encodeURIComponent(opts.to_date)}`;
  return moralisGet(path);
}

/**
 * GET /wallets/{address}/swaps — DEX buy/sell swaps for wallet.
 * Mainnet-oriented; ~50 CUs. https://docs.moralis.com/data-api/evm/wallet/swaps
 */
export async function fetchMoralisEvmWalletSwaps(
  address: string,
  chain: string = "base",
  opts?: {
    limit?: number;
    cursor?: string;
    order?: "ASC" | "DESC";
    tokenAddress?: string;
    fromBlock?: number;
    toBlock?: string;
    fromDate?: string;
    toDate?: string;
    transactionTypes?: string;
  },
): Promise<MoralisWalletTokensResult> {
  if (!address) return { ok: false, error: "Missing address" };
  const addr = encodeURIComponent(address);
  const ch = encodeURIComponent(chain);
  const lim = Math.min(100, Math.max(1, Math.floor(Number(opts?.limit) || 25)));
  const ord = opts?.order ?? "DESC";
  let path = `/wallets/${addr}/swaps?chain=${ch}&limit=${lim}&order=${ord}`;
  if (opts?.cursor) path += `&cursor=${encodeURIComponent(opts.cursor)}`;
  if (opts?.tokenAddress) path += `&tokenAddress=${encodeURIComponent(opts.tokenAddress)}`;
  if (opts?.fromBlock != null && Number.isFinite(opts.fromBlock)) path += `&fromBlock=${opts.fromBlock}`;
  if (opts?.toBlock) path += `&toBlock=${encodeURIComponent(opts.toBlock)}`;
  if (opts?.fromDate) path += `&fromDate=${encodeURIComponent(opts.fromDate)}`;
  if (opts?.toDate) path += `&toDate=${encodeURIComponent(opts.toDate)}`;
  if (opts?.transactionTypes) path += `&transactionTypes=${encodeURIComponent(opts.transactionTypes)}`;
  return moralisGet(path);
}

/**
 * GET /wallets/{address}/nfts/trades — NFT marketplace trades for wallet.
 * https://docs.moralis.com/data-api/evm/wallet/nft-trades
 */
export async function fetchMoralisWalletNftTrades(
  address: string,
  chain: string = "base",
  opts?: {
    limit?: number;
    cursor?: string;
    nft_metadata?: boolean;
    from_block?: number;
    to_block?: string;
    from_date?: string;
    to_date?: string;
  },
): Promise<MoralisWalletTokensResult> {
  if (!address) return { ok: false, error: "Missing address" };
  const addr = encodeURIComponent(address);
  const ch = encodeURIComponent(chain);
  const lim = Math.min(100, Math.max(1, Math.floor(Number(opts?.limit) || 25)));
  let path = `/wallets/${addr}/nfts/trades?chain=${ch}&limit=${lim}`;
  const meta = opts?.nft_metadata !== false;
  path += `&nft_metadata=${meta}`;
  if (opts?.cursor) path += `&cursor=${encodeURIComponent(opts.cursor)}`;
  if (opts?.from_block != null && Number.isFinite(opts.from_block)) path += `&from_block=${opts.from_block}`;
  if (opts?.to_block) path += `&to_block=${encodeURIComponent(opts.to_block)}`;
  if (opts?.from_date) path += `&from_date=${encodeURIComponent(opts.from_date)}`;
  if (opts?.to_date) path += `&to_date=${encodeURIComponent(opts.to_date)}`;
  return moralisGet(path);
}

export type MoralisNativeWalletTxOpts = {
  limit?: number;
  cursor?: string;
  order?: "ASC" | "DESC";
  from_block?: number;
  to_block?: number;
  from_date?: string;
  to_date?: string;
  /** Maps to `include=internal_transactions` on the Moralis API. */
  includeInternal?: boolean;
};

/**
 * GET /{address}/verbose — ABI-decoded native transactions (decoded_call, logs).
 * https://docs.moralis.com/data-api/evm/reference/get-wallet-transactions-verbose
 */
export async function fetchMoralisWalletTransactionsVerbose(
  address: string,
  chain: string = "base",
  opts?: MoralisNativeWalletTxOpts,
): Promise<MoralisWalletTokensResult> {
  if (!address) return { ok: false, error: "Missing address" };
  const addr = encodeURIComponent(address);
  const ch = encodeURIComponent(chain);
  const lim = Math.min(100, Math.max(1, Math.floor(Number(opts?.limit) || 25)));
  const ord = opts?.order ?? "DESC";
  let path = `/${addr}/verbose?chain=${ch}&limit=${lim}&order=${ord}`;
  if (opts?.cursor) path += `&cursor=${encodeURIComponent(opts.cursor)}`;
  if (opts?.from_block != null && Number.isFinite(opts.from_block)) path += `&from_block=${opts.from_block}`;
  if (opts?.to_block != null && Number.isFinite(opts.to_block)) path += `&to_block=${opts.to_block}`;
  if (opts?.from_date) path += `&from_date=${encodeURIComponent(opts.from_date)}`;
  if (opts?.to_date) path += `&to_date=${encodeURIComponent(opts.to_date)}`;
  if (opts?.includeInternal) path += `&include=internal_transactions`;
  return moralisGet(path);
}

/**
 * GET /{address} — raw native transactions (no decoded_call).
 * Same query surface as verbose; different response shape.
 */
export async function fetchMoralisWalletTransactionsRawNative(
  address: string,
  chain: string = "base",
  opts?: MoralisNativeWalletTxOpts,
): Promise<MoralisWalletTokensResult> {
  if (!address) return { ok: false, error: "Missing address" };
  const addr = encodeURIComponent(address);
  const ch = encodeURIComponent(chain);
  const lim = Math.min(100, Math.max(1, Math.floor(Number(opts?.limit) || 25)));
  const ord = opts?.order ?? "DESC";
  let path = `/${addr}?chain=${ch}&limit=${lim}&order=${ord}`;
  if (opts?.cursor) path += `&cursor=${encodeURIComponent(opts.cursor)}`;
  if (opts?.from_block != null && Number.isFinite(opts.from_block)) path += `&from_block=${opts.from_block}`;
  if (opts?.to_block != null && Number.isFinite(opts.to_block)) path += `&to_block=${opts.to_block}`;
  if (opts?.from_date) path += `&from_date=${encodeURIComponent(opts.from_date)}`;
  if (opts?.to_date) path += `&to_date=${encodeURIComponent(opts.to_date)}`;
  if (opts?.includeInternal) path += `&include=internal_transactions`;
  return moralisGet(path);
}

/**
 * GET /wallets/{address}/insight — cross-chain wallet metrics (CUs per chain on mainnet).
 */
export async function fetchMoralisWalletInsight(
  address: string,
  opts?: {
    chains?: string[];
    includeChainBreakdown?: boolean;
  },
): Promise<MoralisWalletTokensResult> {
  if (!address) return { ok: false, error: "Missing address" };
  const addr = encodeURIComponent(address);
  const pathBase = `/wallets/${addr}/insight`;
  const sp = new URLSearchParams();
  if (opts?.chains?.length) {
    for (const c of opts.chains) {
      const s = String(c).trim();
      if (s) sp.append("chains", s);
    }
  }
  if (opts?.includeChainBreakdown === true) sp.set("includeChainBreakdown", "true");
  const q = sp.toString();
  return moralisGet(q ? `${pathBase}?${q}` : pathBase);
}

/** GET /wallets/{address}/stats — NFT / tx / transfer totals for one chain. */
export async function fetchMoralisWalletStats(
  address: string,
  chain?: string,
): Promise<MoralisWalletTokensResult> {
  if (!address) return { ok: false, error: "Missing address" };
  const addr = encodeURIComponent(address);
  const ch = chain?.trim();
  const path = ch ? `/wallets/${addr}/stats?chain=${encodeURIComponent(ch)}` : `/wallets/${addr}/stats`;
  return moralisGet(path);
}

/** GET /wallets/{address}/chains — active chains + first/last tx timestamps. */
export async function fetchMoralisWalletActiveChains(
  address: string,
  chains?: string[],
): Promise<MoralisWalletTokensResult> {
  if (!address) return { ok: false, error: "Missing address" };
  const addr = encodeURIComponent(address);
  let path = `/wallets/${addr}/chains`;
  if (chains?.length) {
    const sp = new URLSearchParams();
    for (const c of chains) {
      const s = String(c).trim();
      if (s) sp.append("chains", s);
    }
    path += `?${sp.toString()}`;
  }
  return moralisGet(path);
}

/**
 * GET /wallets/{address}/nfts — NFTs by wallet.
 * ~50 CUs per request (see Moralis pricing). Docs:
 * https://docs.moralis.com/data-api/evm/nft/collections/nfts-by-wallet
 */
export async function fetchMoralisWalletNfts(
  address: string,
  chain: string = "base",
  limit = 40,
  opts?: {
    media_items?: boolean;
    normalizeMetadata?: boolean;
    include_prices?: boolean;
    cursor?: string;
  },
): Promise<MoralisWalletTokensResult> {
  if (!address) return { ok: false, error: "Missing address" };
  const ch = encodeURIComponent(chain);
  const lim = Math.min(100, Math.max(1, Math.floor(Number(limit) || 40)));
  const media_items = opts?.media_items !== false;
  const normalizeMetadata = opts?.normalizeMetadata !== false;
  const include_prices = opts?.include_prices === true;
  let q = `/wallets/${encodeURIComponent(address)}/nfts?chain=${ch}&limit=${lim}&exclude_spam=true`;
  q += `&media_items=${media_items}&normalizeMetadata=${normalizeMetadata}`;
  if (include_prices) q += `&include_prices=true`;
  if (opts?.cursor) q += `&cursor=${encodeURIComponent(opts.cursor)}`;
  return moralisGet(q);
}

/**
 * GET /{address}/nft/transfers — NFT transfers involving this wallet (in or out).
 * ~20 CUs. Docs: https://docs.moralis.com/data-api/evm/wallet/nft-transfers
 */
export async function fetchMoralisWalletNftTransfers(
  address: string,
  chain: string = "base",
  opts?: {
    limit?: number;
    cursor?: string;
    order?: "ASC" | "DESC";
    include_prices?: boolean;
    format?: "decimal" | "hex";
  },
): Promise<MoralisWalletTokensResult> {
  if (!address) return { ok: false, error: "Missing address" };
  const addr = encodeURIComponent(address);
  const ch = encodeURIComponent(chain);
  const lim = Math.min(100, Math.max(1, opts?.limit ?? 25));
  const order = opts?.order ?? "DESC";
  const fmt = opts?.format ?? "decimal";
  let path = `/${addr}/nft/transfers?chain=${ch}&limit=${lim}&order=${order}&format=${fmt}`;
  if (opts?.cursor) path += `&cursor=${encodeURIComponent(opts.cursor)}`;
  if (opts?.include_prices === true) path += `&include_prices=true`;
  return moralisGet(path);
}

/**
 * NFTs minted under a contract (paginated). Moralis GET /nft/{address}.
 * https://docs.moralis.com/data-api/evm/nft/collections/nfts-by-collection
 */
export async function fetchMoralisNftsByContract(
  contractAddress: string,
  chain: string,
  opts?: {
    limit?: number;
    cursor?: string;
    /** Default true (Moralis OpenAPI default). */
    normalizeMetadata?: boolean;
    /** Default false (OpenAPI). */
    media_items?: boolean;
    /** Default false (OpenAPI). */
    include_prices?: boolean;
    format?: "decimal" | "hex";
    totalRanges?: number;
    range?: number;
  },
): Promise<MoralisWalletTokensResult> {
  if (!contractAddress) return { ok: false, error: "Missing contract address" };
  const addr = encodeURIComponent(contractAddress);
  const ch = encodeURIComponent(chain);
  const lim = Math.min(100, Math.max(1, opts?.limit ?? 40));
  const norm = opts?.normalizeMetadata !== false;
  const media = opts?.media_items === true;
  const prices = opts?.include_prices === true;
  const fmt = opts?.format === "hex" ? "hex" : "decimal";
  let path = `/nft/${addr}?chain=${ch}&format=${fmt}&limit=${lim}&normalizeMetadata=${norm}&media_items=${media}&include_prices=${prices}`;
  if (opts?.cursor) path += `&cursor=${encodeURIComponent(opts.cursor)}`;
  if (opts?.totalRanges != null && Number.isFinite(opts.totalRanges) && opts.totalRanges >= 1) {
    path += `&totalRanges=${Math.floor(opts.totalRanges)}`;
  }
  if (opts?.range != null && Number.isFinite(opts.range) && opts.range >= 1) {
    path += `&range=${Math.floor(opts.range)}`;
  }
  return moralisGet(path);
}

/** GET /nft/{address}/{token_id}. See https://docs.moralis.com/data-api/evm/nft/metadata/nft-metadata */
export async function fetchMoralisNftMetadata(
  contractAddress: string,
  tokenId: string,
  chain: string,
  opts?: {
    format?: "decimal" | "hex";
    normalizeMetadata?: boolean;
    media_items?: boolean;
    include_prices?: boolean;
  },
): Promise<MoralisWalletTokensResult> {
  if (!contractAddress) return { ok: false, error: "Missing contract address" };
  if (!tokenId) return { ok: false, error: "Missing token id" };
  const addr = encodeURIComponent(contractAddress);
  const tid = encodeURIComponent(tokenId);
  const ch = encodeURIComponent(chain);
  const fmt = opts?.format ?? "decimal";
  const norm = opts?.normalizeMetadata !== false;
  const media = opts?.media_items !== false;
  const prices = opts?.include_prices !== false;
  return moralisGet(
    `/nft/${addr}/${tid}?chain=${ch}&format=${fmt}&normalizeMetadata=${norm}&media_items=${media}&include_prices=${prices}`,
  );
}

/** GET /nft/{address}/metadata. See https://docs.moralis.com/data-api/evm/nft/metadata/collection-metadata */
export async function fetchMoralisNftCollectionMetadata(
  contractAddress: string,
  chain: string,
  include_prices = true,
): Promise<MoralisWalletTokensResult> {
  if (!contractAddress) return { ok: false, error: "Missing contract address" };
  const addr = encodeURIComponent(contractAddress);
  const ch = encodeURIComponent(chain);
  return moralisGet(`/nft/${addr}/metadata?chain=${ch}&include_prices=${include_prices}`);
}

/** GET /nft/{address}/stats. See https://docs.moralis.com/data-api/evm/nft/metadata/collection-stats */
export async function fetchMoralisNftCollectionStats(
  contractAddress: string,
  chain: string,
): Promise<MoralisWalletTokensResult> {
  if (!contractAddress) return { ok: false, error: "Missing contract address" };
  const addr = encodeURIComponent(contractAddress);
  const ch = encodeURIComponent(chain);
  return moralisGet(`/nft/${addr}/stats?chain=${ch}`);
}

/**
 * GET /nft/{address}/price — sale price stats for a collection (last / low / high / avg, total_trades, message).
 * Query `days`: OpenAPI minimum 0, maximum 365; if omitted, Moralis defaults to 7.
 * ~1 CU, mainnet-only for this endpoint in Moralis pricing UI. See:
 * https://docs.moralis.com/data-api/evm/nft/prices/sale-price-by-contract
 */
export async function fetchMoralisNftCollectionSalePrices(
  contractAddress: string,
  chain: string,
  days?: number,
): Promise<MoralisWalletTokensResult> {
  if (!contractAddress) return { ok: false, error: "Missing contract address" };
  const addr = encodeURIComponent(contractAddress);
  const ch = encodeURIComponent(chain);
  let path = `/nft/${addr}/price?chain=${ch}`;
  if (days != null && Number.isFinite(Number(days))) {
    const d = Math.min(365, Math.max(0, Math.floor(Number(days))));
    path += `&days=${d}`;
  }
  return moralisGet(path);
}

/**
 * GET /nft/{address}/traits/paginate — trait distribution for a collection (cursor pagination).
 * ~50 CUs. See https://docs.moralis.com/data-api/evm/nft/traits/traits-by-collection-paginated
 */
export async function fetchMoralisNftTraitsPaginate(
  contractAddress: string,
  chain: string,
  opts?: {
    limit?: number;
    cursor?: string;
    order?: "ASC" | "DESC";
  },
): Promise<MoralisWalletTokensResult> {
  if (!contractAddress) return { ok: false, error: "Missing contract address" };
  const addr = encodeURIComponent(contractAddress);
  const ch = encodeURIComponent(chain);
  const lim = Math.min(100, Math.max(1, opts?.limit ?? 50));
  const order = opts?.order ?? "DESC";
  let path = `/nft/${addr}/traits/paginate?chain=${ch}&limit=${lim}&order=${order}`;
  if (opts?.cursor) path += `&cursor=${encodeURIComponent(opts.cursor)}`;
  return moralisGet(path);
}

/**
 * GET /nft/{address}/transfers — transfers for the collection (cursor, dates/blocks, optional last-sale prices).
 * ~50 CUs. OpenAPI: from_block | from_date, to_block | to_date, include_prices, order, limit, cursor.
 */
export async function fetchMoralisNftContractTransfers(
  contractAddress: string,
  chain: string,
  opts?: {
    from_block?: number;
    to_block?: number;
    from_date?: string;
    to_date?: string;
    format?: "decimal" | "hex";
    include_prices?: boolean;
    limit?: number;
    order?: "ASC" | "DESC";
    cursor?: string;
  },
): Promise<MoralisWalletTokensResult> {
  if (!contractAddress) return { ok: false, error: "Missing contract address" };
  const addr = encodeURIComponent(contractAddress);
  const ch = encodeURIComponent(chain);
  let path = `/nft/${addr}/transfers?chain=${ch}`;
  const o = opts ?? {};
  if (o.from_block != null && Number.isFinite(o.from_block)) {
    path += `&from_block=${Math.max(0, Math.floor(o.from_block))}`;
  }
  if (o.to_block != null && Number.isFinite(o.to_block)) {
    path += `&to_block=${Math.max(0, Math.floor(o.to_block))}`;
  }
  if (o.from_date != null && String(o.from_date).trim() !== "") {
    path += `&from_date=${encodeURIComponent(String(o.from_date).trim())}`;
  }
  if (o.to_date != null && String(o.to_date).trim() !== "") {
    path += `&to_date=${encodeURIComponent(String(o.to_date).trim())}`;
  }
  path += `&format=${encodeURIComponent(o.format ?? "decimal")}`;
  if (o.include_prices === true) path += `&include_prices=true`;
  if (o.limit != null && Number.isFinite(o.limit) && o.limit >= 0) {
    path += `&limit=${Math.floor(o.limit)}`;
  }
  if (o.order) path += `&order=${encodeURIComponent(o.order)}`;
  if (o.cursor) path += `&cursor=${encodeURIComponent(o.cursor)}`;
  return moralisGet(path);
}

/**
 * GET /nft/{address}/{token_id}/metadata/resync — queue or run metadata refresh (flag: uri | metadata, mode: async | sync).
 * ~50 CUs; sync can return 200/404 with body per Moralis.
 */
export async function fetchMoralisNftMetadataResync(
  contractAddress: string,
  tokenId: string,
  chain: string,
  opts?: {
    flag?: "uri" | "metadata";
    mode?: "async" | "sync";
  },
): Promise<MoralisWalletTokensResult> {
  if (!contractAddress) return { ok: false, error: "Missing contract address" };
  const tid = String(tokenId).trim();
  if (!tid) return { ok: false, error: "Missing token id" };
  const addr = encodeURIComponent(contractAddress);
  const ch = encodeURIComponent(chain);
  let path = `/nft/${addr}/${encodeURIComponent(tid)}/metadata/resync?chain=${ch}`;
  if (opts?.flag) path += `&flag=${encodeURIComponent(opts.flag)}`;
  if (opts?.mode) path += `&mode=${encodeURIComponent(opts.mode)}`;
  return moralisGet(path);
}

/**
 * GET /nft/{address}/traits/resync — refresh trait/rarity index for the contract (typically 202 + status).
 * ~10 CUs.
 */
export async function fetchMoralisNftTraitsResync(
  contractAddress: string,
  chain: string,
): Promise<MoralisWalletTokensResult> {
  if (!contractAddress) return { ok: false, error: "Missing contract address" };
  const addr = encodeURIComponent(contractAddress);
  const ch = encodeURIComponent(chain);
  return moralisGet(`/nft/${addr}/traits/resync?chain=${ch}`);
}

/**
 * POST /nft/getMultipleNFTs (max 25 tokens). See
 * https://docs.moralis.com/data-api/evm/nft/metadata/nft-metadata-batch
 */
export async function fetchMoralisMultipleNftMetadata(
  chain: string,
  tokens: { token_address: string; token_id: string }[],
  opts?: { normalizeMetadata?: boolean; media_items?: boolean },
): Promise<MoralisWalletTokensResult> {
  const ch = encodeURIComponent(chain);
  const body = {
    tokens: tokens
      .slice(0, 25)
      .map((t) => ({
        token_address: String(t.token_address).trim().toLowerCase(),
        token_id: String(t.token_id),
      }))
      .filter((t) => /^0x[a-f0-9]{40}$/.test(t.token_address)),
    normalizeMetadata: opts?.normalizeMetadata !== false,
    media_items: opts?.media_items !== false,
  };
  if (!body.tokens.length) return { ok: false, error: "No valid tokens" };
  return moralisPostJson(`/nft/getMultipleNFTs?chain=${ch}`, body);
}

export async function fetchMoralisWalletTransactions(
  address: string,
  chain: string = "base",
  limit = 50,
): Promise<MoralisWalletTokensResult> {
  if (!address) return { ok: false, error: "Missing address" };
  const ch = encodeURIComponent(chain);
  return moralisGet(
    `/wallets/${encodeURIComponent(address)}/transactions?chain=${ch}&order=block_timestamp.DESC&limit=${limit}`,
  );
}

export async function fetchMoralisErc20TopGainers(
  tokenAddress: string,
  chain: string,
  limit = 25,
): Promise<MoralisWalletTokensResult> {
  if (!tokenAddress) return { ok: false, error: "Missing token address" };
  const addr = encodeURIComponent(tokenAddress);
  const ch = encodeURIComponent(chain);
  const lim = encodeURIComponent(String(limit));
  return moralisGet(`/erc20/${addr}/top-gainers?chain=${ch}&limit=${lim}`);
}

export async function fetchMoralisErc20Owners(
  tokenAddress: string,
  chain: string,
  limit = 25,
): Promise<MoralisWalletTokensResult> {
  if (!tokenAddress) return { ok: false, error: "Missing token address" };
  const addr = encodeURIComponent(tokenAddress);
  const ch = encodeURIComponent(chain);
  const lim = encodeURIComponent(String(limit));
  /** `order=DESC` — largest holders first (see Moralis Data API token owners). */
  return moralisGet(`/erc20/${addr}/owners?chain=${ch}&limit=${lim}&order=DESC`);
}

export async function fetchMoralisErc20Price(
  tokenAddress: string,
  chain: string,
): Promise<MoralisWalletTokensResult> {
  if (!tokenAddress) return { ok: false, error: "Missing token address" };
  const addr = encodeURIComponent(tokenAddress);
  const ch = encodeURIComponent(chain);
  return moralisGet(`/erc20/${addr}/price?chain=${ch}`);
}

export async function fetchMoralisErc20Transfers(
  tokenAddress: string,
  chain: string,
  limit = 20,
): Promise<MoralisWalletTokensResult> {
  if (!tokenAddress) return { ok: false, error: "Missing token address" };
  const addr = encodeURIComponent(tokenAddress);
  const ch = encodeURIComponent(chain);
  const lim = encodeURIComponent(String(limit));
  return moralisGet(
    `/erc20/${addr}/transfers?chain=${ch}&limit=${lim}&order=block_timestamp.DESC`,
  );
}

/**
 * Token trading analytics (buy/sell volume, buyers/sellers, liquidity & FDV breakdowns by window).
 * ~80 CUs, mainnet only. See https://docs.moralis.com/data-api/universal/token/analytics/token-analytics
 */
export async function fetchMoralisTokenAnalytics(
  tokenAddress: string,
  chain: string,
): Promise<MoralisWalletTokensResult> {
  if (!tokenAddress) return { ok: false, error: "Missing token address" };
  const addr = encodeURIComponent(tokenAddress);
  const ch = encodeURIComponent(chain);
  return moralisGet(`/tokens/${addr}/analytics?chain=${ch}`);
}

/** OpenAPI `GetTimeSeriesTokenAnalyticsDto.tokens` maxItems (do not exceed). */
export const MORALIS_TOKEN_ANALYTICS_TIMESERIES_MAX_TOKENS = 30;

function isMoralisAnalyticsSolanaMint(s: string): boolean {
  const t = s.trim();
  if (!t || /^0x/i.test(t)) return false;
  return /^[1-9A-HJ-NP-Za-km-z]{32,48}$/.test(t);
}

/**
 * Timeseries buy/sell volume, liquidity, FDV. Premium (Pro+), ~150 CUs, mainnet only.
 * EVM: `chain` per Moralis `chainList`; `tokenAddress` checksummed or lowercase hex.
 * Solana: `chain` must be `solana`; mint is case-sensitive (no lowercasing).
 * Body is capped at {@link MORALIS_TOKEN_ANALYTICS_TIMESERIES_MAX_TOKENS} tokens.
 * https://docs.moralis.com/data-api/universal/token/analytics/token-analytics-timeseries
 */
export async function fetchMoralisTokenAnalyticsTimeseries(
  tokens: { chain: string; tokenAddress: string }[],
  timeframe: "1d" | "7d" | "30d",
): Promise<MoralisWalletTokensResult> {
  const normalized = tokens
    .map((t) => {
      const chainRaw = String(t.chain || "").trim();
      const addrRaw = String(t.tokenAddress || "").trim();
      const chLower = chainRaw.toLowerCase();
      if (chLower === "solana") {
        return { chain: "solana" as const, tokenAddress: addrRaw };
      }
      return { chain: chLower, tokenAddress: addrRaw.toLowerCase() };
    })
    .filter((t) => {
      if (!t.chain || !t.tokenAddress) return false;
      if (t.chain === "solana") return isMoralisAnalyticsSolanaMint(t.tokenAddress);
      return /^0x[a-f0-9]{40}$/.test(t.tokenAddress);
    })
    .slice(0, MORALIS_TOKEN_ANALYTICS_TIMESERIES_MAX_TOKENS);

  const body = { tokens: normalized };
  if (!body.tokens.length) return { ok: false, error: "No valid tokens" };
  const tf = encodeURIComponent(timeframe);
  return moralisPostJson(`/tokens/analytics/timeseries?timeframe=${tf}`, body);
}

/**
 * Moralis Token Score (0–100) + liquidity / volume / tx metrics.
 * Premium (Pro+), ~100 CUs, mainnet only.
 * EVM: `chain` = eth, base, … SPL mints: `chain=solana` + mint address (see OpenAPI `chainListWithSolana`).
 * https://docs.moralis.com/data-api/evm/token/metadata/token-score
 */
export async function fetchMoralisTokenScore(
  tokenAddress: string,
  chain: string,
): Promise<MoralisWalletTokensResult> {
  if (!tokenAddress) return { ok: false, error: "Missing token address" };
  const addr = encodeURIComponent(tokenAddress.trim());
  const ch = encodeURIComponent(chain);
  return moralisGet(`/tokens/${addr}/score?chain=${ch}`);
}

/**
 * Historical token scores. Premium (Pro+), ~150 CUs, mainnet only. See
 * https://docs.moralis.com/data-api/evm/token/metadata/token-score-timeseries
 */
export async function fetchMoralisTokenScoreHistorical(
  tokenAddress: string,
  chain: string,
  timeframe: "1d" | "7d" | "30d" = "7d",
): Promise<MoralisWalletTokensResult> {
  if (!tokenAddress) return { ok: false, error: "Missing token address" };
  const addr = encodeURIComponent(tokenAddress);
  const ch = encodeURIComponent(chain);
  const tf = encodeURIComponent(timeframe);
  return moralisGet(`/tokens/${addr}/score/historical?chain=${ch}&timeframe=${tf}`);
}

/**
 * DEX pairs for an ERC20 (liquidity, volume, exchange). See
 * https://docs.moralis.com/data-api/evm/token/swaps/token-pairs
 */
export async function fetchMoralisTokenPairs(
  tokenAddress: string,
  chain: string,
  limit = 15,
): Promise<MoralisWalletTokensResult> {
  if (!tokenAddress) return { ok: false, error: "Missing token address" };
  const addr = encodeURIComponent(tokenAddress);
  const ch = encodeURIComponent(chain);
  const lim = encodeURIComponent(String(limit));
  return moralisGet(`/erc20/${addr}/pairs?chain=${ch}&limit=${lim}`);
}

/**
 * DEX swap events for an ERC-20. ~50 CUs, mainnet-focused. See
 * https://docs.moralis.com/data-api/evm/token/swaps/token-swaps
 */
export async function fetchMoralisErc20Swaps(
  tokenAddress: string,
  chain: string,
  limit = 20,
  order: "ASC" | "DESC" = "DESC",
): Promise<MoralisWalletTokensResult> {
  if (!tokenAddress) return { ok: false, error: "Missing token address" };
  const addr = encodeURIComponent(tokenAddress);
  const ch = encodeURIComponent(chain);
  const lim = encodeURIComponent(String(limit));
  const ord = encodeURIComponent(order);
  return moralisGet(`/erc20/${addr}/swaps?chain=${ch}&limit=${lim}&order=${ord}`);
}

/**
 * GET /block/{block_number_or_hash} — full block (metadata + transactions[]).
 * Optional `include=internal_transactions` (adds internal txs per tx; heavy). ~100 CUs per Moralis.
 * https://docs.moralis.com/data-api/evm/reference/block-by-hash-or-number
 */
export async function fetchMoralisBlock(
  blockNumberOrHash: string,
  chain: string,
  opts?: { includeInternalTransactions?: boolean },
): Promise<MoralisWalletTokensResult> {
  const raw = String(blockNumberOrHash ?? "").trim();
  if (!raw) return { ok: false, error: "Missing block number or hash" };
  const seg = encodeURIComponent(raw);
  const ch = encodeURIComponent(chain);
  let path = `/block/${seg}?chain=${ch}`;
  if (opts?.includeInternalTransactions) {
    path += `&include=${encodeURIComponent("internal_transactions")}`;
  }
  return moralisGet(path);
}

/**
 * GET /dateToBlock — block closest to a calendar date (~1 CU).
 * `date`: unix ms, seconds, or string accepted by Moralis (moment-style).
 * https://docs.moralis.com/data-api/evm/reference/block-by-date
 */
export async function fetchMoralisDateToBlock(
  chain: string,
  date?: string,
): Promise<MoralisWalletTokensResult> {
  const ch = encodeURIComponent(chain);
  let path = `/dateToBlock?chain=${ch}`;
  if (date != null && String(date).trim() !== "") {
    path += `&date=${encodeURIComponent(String(date).trim())}`;
  }
  return moralisGet(path);
}

/**
 * GET /latest/block — head block for `chain`. See Blockchain API in Moralis docs.
 */
export async function fetchMoralisLatestBlock(chain: string = "base"): Promise<MoralisWalletTokensResult> {
  const ch = encodeURIComponent(chain);
  return moralisGet(`/latest/block?chain=${ch}`);
}

/**
 * GET /transaction/{hash} — transaction by hash.
 */
export async function fetchMoralisTransaction(
  txHash: string,
  chain: string = "base",
): Promise<MoralisWalletTokensResult> {
  const h = String(txHash ?? "").trim();
  if (!h) return { ok: false, error: "Missing transaction hash" };
  const ch = encodeURIComponent(chain);
  return moralisGet(`/transaction/${encodeURIComponent(h)}?chain=${ch}`);
}

/**
 * GET /wallets/{address}/profitability — per-token PnL breakdown (not the summary endpoint).
 */
export async function fetchMoralisWalletProfitability(
  address: string,
  chain: string = "base",
  days: string = "all",
): Promise<MoralisWalletTokensResult> {
  if (!address) return { ok: false, error: "Missing address" };
  const ch = encodeURIComponent(chain);
  const d = encodeURIComponent(days);
  return moralisGet(`/wallets/${encodeURIComponent(address)}/profitability?chain=${ch}&days=${d}`);
}

/**
 * GET /wallets/{address}/approvals — ERC-20 allowances (Wallet API).
 */
export async function fetchMoralisWalletTokenApprovals(
  address: string,
  chain: string = "base",
  limit = 50,
): Promise<MoralisWalletTokensResult> {
  if (!address) return { ok: false, error: "Missing address" };
  const ch = encodeURIComponent(chain);
  const lim = encodeURIComponent(String(Math.min(100, Math.max(1, limit))));
  return moralisGet(
    `/wallets/${encodeURIComponent(address)}/approvals?chain=${ch}&limit=${lim}`,
  );
}

/** GET /tokens/categories — discovery / taxonomy (cheap global snapshot). */
export async function fetchMoralisTokenCategories(): Promise<MoralisWalletTokensResult> {
  return moralisGet("/tokens/categories");
}

/**
 * GET /discovery/tokens/top-losers — chain-wide losers (high CU; use sparingly in sync).
 */
export async function fetchMoralisDiscoveryTopLosers(
  chain: string = "eth",
  opts?: { limit?: number; time_frame?: string },
): Promise<MoralisWalletTokensResult> {
  const ch = encodeURIComponent(chain);
  let path = `/discovery/tokens/top-losers?chain=${ch}`;
  if (opts?.limit != null && opts.limit > 0) {
    path += `&limit=${encodeURIComponent(String(Math.min(100, opts.limit)))}`;
  }
  if (opts?.time_frame) path += `&time_frame=${encodeURIComponent(opts.time_frame)}`;
  return moralisGet(path);
}

/**
 * GET /erc20/{address}/top-losers — symmetric to top-gainers on the token.
 */
export async function fetchMoralisErc20TopLosers(
  tokenAddress: string,
  chain: string,
  limit = 20,
): Promise<MoralisWalletTokensResult> {
  if (!tokenAddress) return { ok: false, error: "Missing token address" };
  const addr = encodeURIComponent(tokenAddress);
  const ch = encodeURIComponent(chain);
  const lim = encodeURIComponent(String(limit));
  return moralisGet(`/erc20/${addr}/top-losers?chain=${ch}&limit=${lim}`);
}

/**
 * GET /pairs/{address}/snipers — snipers for a liquidity pair (needs pair address, not token).
 */
export async function fetchMoralisPairSnipers(
  pairAddress: string,
  chain: string,
  blocksAfterCreation = 3,
): Promise<MoralisWalletTokensResult> {
  if (!pairAddress) return { ok: false, error: "Missing pair address" };
  const addr = encodeURIComponent(pairAddress);
  const ch = encodeURIComponent(chain);
  const b = encodeURIComponent(String(Math.min(1000, Math.max(0, blocksAfterCreation))));
  return moralisGet(`/pairs/${addr}/snipers?chain=${ch}&blocksAfterCreation=${b}`);
}

export type MoralisSolanaNetwork = "mainnet" | "devnet";

/**
 * GET /account/{network}/{address}/portfolio — native SOL + SPL + NFTs (~10 CUs).
 * https://docs.moralis.com/data-api/solana/reference/get-wallet-portfolio
 */
export async function fetchMoralisSolanaPortfolio(
  address: string,
  network: MoralisSolanaNetwork = "mainnet",
  opts?: { nftMetadata?: boolean; mediaItems?: boolean; excludeSpam?: boolean },
): Promise<MoralisWalletTokensResult> {
  const a = String(address ?? "").trim();
  if (!a) return { ok: false, error: "Missing address" };
  const net = network === "devnet" ? "devnet" : "mainnet";
  const qs = new URLSearchParams();
  if (opts?.nftMetadata) qs.set("nftMetadata", "true");
  if (opts?.mediaItems) qs.set("mediaItems", "true");
  if (opts?.excludeSpam) qs.set("excludeSpam", "true");
  const q = qs.toString();
  return moralisSolanaGet(
    `/account/${net}/${encodeURIComponent(a)}/portfolio${q ? `?${q}` : ""}`,
  );
}

/**
 * GET /account/{network}/{address}/swaps — wallet swap history (~50 CUs).
 * https://docs.moralis.com/data-api/solana/reference/get-wallet-swaps
 */
export async function fetchMoralisSolanaSwaps(
  address: string,
  network: MoralisSolanaNetwork = "mainnet",
  opts?: {
    limit?: number;
    cursor?: string;
    order?: "ASC" | "DESC";
    fromDate?: string;
    toDate?: string;
    transactionTypes?: string;
    tokenAddress?: string;
  },
): Promise<MoralisWalletTokensResult> {
  const a = String(address ?? "").trim();
  if (!a) return { ok: false, error: "Missing address" };
  const net = network === "devnet" ? "devnet" : "mainnet";
  const qs = new URLSearchParams();
  if (opts?.limit != null) {
    const lim = Math.min(100, Math.max(1, Math.floor(opts.limit)));
    qs.set("limit", String(lim));
  }
  if (opts?.cursor) qs.set("cursor", opts.cursor);
  if (opts?.order) qs.set("order", opts.order);
  if (opts?.fromDate) qs.set("fromDate", opts.fromDate);
  if (opts?.toDate) qs.set("toDate", opts.toDate);
  if (opts?.transactionTypes) qs.set("transactionTypes", opts.transactionTypes);
  if (opts?.tokenAddress) qs.set("tokenAddress", opts.tokenAddress);
  const q = qs.toString();
  return moralisSolanaGet(`/account/${net}/${encodeURIComponent(a)}/swaps${q ? `?${q}` : ""}`);
}

/**
 * GET /token/{network}/{address}/metadata — SPL mint metadata (name, symbol, supply, metaplex, …) (~10 CUs).
 * https://docs.moralis.com/data-api/solana/token/token-metadata
 */
export async function fetchMoralisSolanaTokenMetadata(
  mintAddress: string,
  network: MoralisSolanaNetwork = "mainnet",
): Promise<MoralisWalletTokensResult> {
  const a = String(mintAddress ?? "").trim();
  if (!a) return { ok: false, error: "Missing mint address" };
  const net = network === "devnet" ? "devnet" : "mainnet";
  return moralisSolanaGet(`/token/${net}/${encodeURIComponent(a)}/metadata`);
}

/** `timeFrame` for GET /token/{network}/holders/{mint}/historical */
export type MoralisSolanaHolderTimeFrame =
  | "1min"
  | "5min"
  | "10min"
  | "30min"
  | "1h"
  | "4h"
  | "12h"
  | "1d"
  | "1w"
  | "1m";

const MORALIS_SOLANA_HOLDER_TF = new Set<string>([
  "1min",
  "5min",
  "10min",
  "30min",
  "1h",
  "4h",
  "12h",
  "1d",
  "1w",
  "1m",
]);

/**
 * GET /token/{network}/{address}/top-holders — paginated top holders (~50 CUs, Pro+).
 * https://docs.moralis.com/data-api/solana/token/holders/top-holders
 */
export async function fetchMoralisSolanaTokenTopHolders(
  mintAddress: string,
  network: MoralisSolanaNetwork = "mainnet",
  opts?: { limit?: number; cursor?: string },
): Promise<MoralisWalletTokensResult> {
  const a = String(mintAddress ?? "").trim();
  if (!a) return { ok: false, error: "Missing mint address" };
  const net = network === "devnet" ? "devnet" : "mainnet";
  const qs = new URLSearchParams();
  if (opts?.limit != null) {
    const lim = Math.min(100, Math.max(1, Math.floor(opts.limit)));
    qs.set("limit", String(lim));
  }
  if (opts?.cursor) qs.set("cursor", opts.cursor);
  const q = qs.toString();
  return moralisSolanaGet(`/token/${net}/${encodeURIComponent(a)}/top-holders${q ? `?${q}` : ""}`);
}

/**
 * GET /token/{network}/holders/{address}/historical — holder count timeline (~50 CUs, Pro+).
 * https://docs.moralis.com/data-api/solana/token/holders/historical-token-holders
 */
export async function fetchMoralisSolanaTokenHoldersHistorical(
  mintAddress: string,
  network: MoralisSolanaNetwork = "mainnet",
  opts: {
    timeFrame: MoralisSolanaHolderTimeFrame;
    fromDate: string;
    toDate: string;
    limit?: number;
    cursor?: string;
  },
): Promise<MoralisWalletTokensResult> {
  const a = String(mintAddress ?? "").trim();
  if (!a) return { ok: false, error: "Missing mint address" };
  const from = String(opts.fromDate ?? "").trim();
  const to = String(opts.toDate ?? "").trim();
  if (!from || !to) return { ok: false, error: "fromDate and toDate are required" };
  const tf = String(opts.timeFrame ?? "").trim();
  if (!MORALIS_SOLANA_HOLDER_TF.has(tf)) {
    return { ok: false, error: `Invalid timeFrame (allowed: ${[...MORALIS_SOLANA_HOLDER_TF].join(", ")})` };
  }
  const net = network === "devnet" ? "devnet" : "mainnet";
  const qs = new URLSearchParams();
  qs.set("timeFrame", tf);
  qs.set("fromDate", from);
  qs.set("toDate", to);
  if (opts.limit != null && opts.limit > 0) {
    qs.set("limit", String(Math.floor(opts.limit)));
  }
  if (opts.cursor) qs.set("cursor", opts.cursor);
  return moralisSolanaGet(
    `/token/${net}/holders/${encodeURIComponent(a)}/historical?${qs.toString()}`,
  );
}

/**
 * GET /token/{network}/{address}/swaps — DEX swaps where this mint is involved (~50 CUs, Pro+).
 * https://docs.moralis.com/data-api/solana/token/swaps/token-swaps
 */
export async function fetchMoralisSolanaTokenSwaps(
  mintAddress: string,
  network: MoralisSolanaNetwork = "mainnet",
  opts?: {
    limit?: number;
    cursor?: string;
    order?: "ASC" | "DESC";
    fromDate?: string;
    toDate?: string;
    transactionTypes?: string;
  },
): Promise<MoralisWalletTokensResult> {
  const a = String(mintAddress ?? "").trim();
  if (!a) return { ok: false, error: "Missing mint address" };
  const net = network === "devnet" ? "devnet" : "mainnet";
  const qs = new URLSearchParams();
  if (opts?.limit != null) {
    const lim = Math.min(100, Math.max(1, Math.floor(opts.limit)));
    qs.set("limit", String(lim));
  }
  if (opts?.cursor) qs.set("cursor", opts.cursor);
  if (opts?.order) qs.set("order", opts.order);
  if (opts?.fromDate) qs.set("fromDate", opts.fromDate);
  if (opts?.toDate) qs.set("toDate", opts.toDate);
  if (opts?.transactionTypes) qs.set("transactionTypes", opts.transactionTypes);
  const q = qs.toString();
  return moralisSolanaGet(`/token/${net}/${encodeURIComponent(a)}/swaps${q ? `?${q}` : ""}`);
}

/**
 * GET /token/{network}/pairs/{pairAddress}/swaps — swaps + add/remove liquidity for a pool (~50 CUs, Pro+).
 * https://docs.moralis.com/data-api/solana/token/swaps/pair-swaps
 */
export async function fetchMoralisSolanaPairSwaps(
  pairAddress: string,
  network: MoralisSolanaNetwork = "mainnet",
  opts?: {
    limit?: number;
    cursor?: string;
    order?: "ASC" | "DESC";
    fromDate?: string;
    toDate?: string;
    transactionTypes?: string;
  },
): Promise<MoralisWalletTokensResult> {
  const a = String(pairAddress ?? "").trim();
  if (!a) return { ok: false, error: "Missing pair address" };
  const net = network === "devnet" ? "devnet" : "mainnet";
  const qs = new URLSearchParams();
  if (opts?.limit != null) {
    const lim = Math.min(100, Math.max(1, Math.floor(opts.limit)));
    qs.set("limit", String(lim));
  }
  if (opts?.cursor) qs.set("cursor", opts.cursor);
  if (opts?.order) qs.set("order", opts.order);
  if (opts?.fromDate) qs.set("fromDate", opts.fromDate);
  if (opts?.toDate) qs.set("toDate", opts.toDate);
  if (opts?.transactionTypes) qs.set("transactionTypes", opts.transactionTypes);
  const q = qs.toString();
  return moralisSolanaGet(`/token/${net}/pairs/${encodeURIComponent(a)}/swaps${q ? `?${q}` : ""}`);
}

/**
 * GET /token/{network}/{address}/pairs — supported DEX pairs for a mint (limit max 50, ~50 CUs, Pro+).
 * https://docs.moralis.com/data-api/solana/token/pairs/token-pairs
 */
export async function fetchMoralisSolanaTokenPairs(
  mintAddress: string,
  network: MoralisSolanaNetwork = "mainnet",
  opts?: { limit?: number; cursor?: string },
): Promise<MoralisWalletTokensResult> {
  const a = String(mintAddress ?? "").trim();
  if (!a) return { ok: false, error: "Missing mint address" };
  const net = network === "devnet" ? "devnet" : "mainnet";
  const qs = new URLSearchParams();
  if (opts?.limit != null) {
    const lim = Math.min(50, Math.max(1, Math.floor(opts.limit)));
    qs.set("limit", String(lim));
  }
  if (opts?.cursor) qs.set("cursor", opts.cursor);
  const q = qs.toString();
  return moralisSolanaGet(`/token/${net}/${encodeURIComponent(a)}/pairs${q ? `?${q}` : ""}`);
}
