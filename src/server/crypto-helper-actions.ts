import { server$ } from "@builder.io/qwik-city";
import { getUserId } from "~/utils/auth";
import {
  fetchMoralisErc20Metadata,
  fetchMoralisErc20Owners,
  fetchMoralisErc20Price,
  fetchMoralisErc20PricesBatch,
  fetchMoralisErc20TopGainers,
  fetchMoralisErc20Transfers,
  fetchMoralisBlock,
  fetchMoralisDateToBlock,
  fetchMoralisNativeBalance,
  fetchMoralisNftContractTransfers,
  fetchMoralisNftHottestCollections,
  fetchMoralisNftCollectionSalePrices,
  fetchMoralisNftMetadataResync,
  fetchMoralisNftTraitsPaginate,
  fetchMoralisNftTraitsResync,
  fetchMoralisNftTopCollections,
  fetchMoralisWalletDefiPositions,
  fetchMoralisWalletDefiPositionsByProtocol,
  fetchMoralisWalletDefiSummary,
  fetchMoralisWalletNetWorth,
  fetchMoralisWalletNftTransfers,
  fetchMoralisWalletNfts,
  fetchMoralisWalletProfitabilitySummary,
  fetchMoralisWalletTokens,
  fetchMoralisWalletTransactions,
  moralisGet,
} from "~/server/crypto-helper/moralis-api";
import { getMoralisWalletNftSyncChains } from "~/server/crypto-helper/moralis-nft-sync-chains";

export type { MoralisWalletTokensResult, MoralisErc20PriceTokenItem } from "~/server/crypto-helper/moralis-api";

export type CmcSyncTriggerResult =
  | { ok: true; Upserted?: number }
  | { ok: false; error?: string };

const SYNC_RATE_WINDOW_MS = 60_000;
const lastSyncByUser = new Map<number, number>();

function consumeSyncRateLimit(userId: number): { ok: true } | { ok: false; retryInSec: number } {
  const now = Date.now();
  const last = lastSyncByUser.get(userId) ?? 0;
  const remaining = SYNC_RATE_WINDOW_MS - (now - last);
  if (remaining > 0) {
    return { ok: false, retryInSec: Math.max(1, Math.ceil(remaining / 1000)) };
  }
  lastSyncByUser.set(userId, now);
  return { ok: true };
}

/** Logged-in users only; uses server `CMC_API_KEY` (no browser CRON_SECRET). */
export const triggerCmcMarketSync = server$(async function (): Promise<CmcSyncTriggerResult> {
  const uidStr = getUserId(this);
  if (!uidStr) return { ok: false, error: "Inicia sesión para actualizar datos." };
  const userId = Number(uidStr);
  if (!Number.isFinite(userId)) return { ok: false, error: "Sesión no válida." };
  const { assertUserMayTriggerFullMarketSync } = await import("~/server/crypto-helper/user-access");
  const gate = await assertUserMayTriggerFullMarketSync(userId);
  if (!gate.ok) return { ok: false, error: gate.error };
  const rate = consumeSyncRateLimit(userId);
  if (!rate.ok) {
    return { ok: false, error: `Espera ${rate.retryInSec}s antes de lanzar otro sync.` };
  }
  const { runDailyMarketSync } = await import("~/server/crypto-helper/cmc-sync");
  return runDailyMarketSync();
});

/** Full daily sync (CMC + auxiliary snapshots). Only allowlisted account emails. */
export const triggerOwnerFullMarketSync = server$(async function (): Promise<CmcSyncTriggerResult> {
  const uidStr = getUserId(this);
  if (!uidStr) return { ok: false, error: "Inicia sesión." };
  const userId = Number(uidStr);
  if (!Number.isFinite(userId)) return { ok: false, error: "Sesión no válida." };
  const { assertUserMayTriggerFullMarketSync } = await import("~/server/crypto-helper/user-access");
  const gate = await assertUserMayTriggerFullMarketSync(userId);
  if (!gate.ok) return { ok: false, error: gate.error };
  const rate = consumeSyncRateLimit(userId);
  if (!rate.ok) {
    return { ok: false, error: `Espera ${rate.retryInSec}s antes de lanzar otro sync.` };
  }
  const { runDailyMarketSync } = await import("~/server/crypto-helper/cmc-sync");
  return runDailyMarketSync();
});

export {
  moralisGet,
  fetchMoralisWalletTokens,
  fetchMoralisNativeBalance,
  fetchMoralisErc20Metadata,
  fetchMoralisWalletProfitabilitySummary,
  fetchMoralisWalletNetWorth,
  fetchMoralisWalletDefiSummary,
  fetchMoralisWalletDefiPositions,
  fetchMoralisWalletDefiPositionsByProtocol,
  fetchMoralisNftHottestCollections,
  fetchMoralisNftCollectionSalePrices,
  fetchMoralisNftContractTransfers,
  fetchMoralisNftMetadataResync,
  fetchMoralisNftTraitsPaginate,
  fetchMoralisNftTraitsResync,
  fetchMoralisNftTopCollections,
  fetchMoralisWalletNftTransfers,
  fetchMoralisWalletNfts,
  fetchMoralisWalletTransactions,
  fetchMoralisErc20TopGainers,
  fetchMoralisErc20Owners,
  fetchMoralisErc20Price,
  fetchMoralisErc20Transfers,
  fetchMoralisErc20PricesBatch,
  fetchMoralisBlock,
  fetchMoralisDateToBlock,
};

/**
 * Client-invokable Moralis wallet tokens (runs on server; key stays server-only).
 */
export const moralisWalletTokens = server$(async function (address: string, chain: string = "base") {
  return fetchMoralisWalletTokens(address, chain);
});

export type ProfileNftCard = {
  chain: string;
  contract: string;
  tokenId: string;
  name: string;
  symbol: string | null;
  image: string | null;
  contractType: string | null;
  amount: string | null;
  verifiedCollection: boolean;
  floorUsd: string | null;
  floorCurrency: string | null;
  lastSaleUsd: string | null;
  lastSaleNative: string | null;
  lastSalePaySymbol: string | null;
  rarityRank: number | null;
  rarityLabel: string | null;
  listPriceUsd: string | null;
  listMarketplace: string | null;
  listCurrency: string | null;
};

export type ProfileNftTransferRow = {
  chain: string;
  contract: string;
  tokenId: string;
  label: string;
  txHash: string;
  ts: string;
  from: string;
  to: string;
  direction: "in" | "out" | "other";
  contractType: string | null;
  amount: string | null;
};

/**
 * Profile: NFTs by wallet + recent NFT transfers (multi-chain Moralis; mismo listado que el sync
 * diario vía `MORALIS_SYNC_WALLET_NFT_CHAINS`), server Moralis key.
 */
export const fetchProfileWalletNftsBundle = server$(async function (
  address: string,
): Promise<
  | { ok: true; items: ProfileNftCard[]; transfers: ProfileNftTransferRow[]; warnings?: string[] }
  | { ok: false; error: string }
> {
  if (!getUserId(this)) {
    return { ok: false, error: "Inicia sesión para cargar NFTs." };
  }
  const a = String(address ?? "")
    .trim()
    .toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(a)) {
    return { ok: false, error: "Dirección de wallet no válida." };
  }

  const { nftImage } = await import("~/server/crypto-helper/wallet-snapshot");

  const warnings: string[] = [];
  const chains = getMoralisWalletNftSyncChains();
  const perChainNftLimit = Math.min(48, Math.max(12, Number(process.env.MORALIS_PROFILE_NFT_LIMIT ?? 28)));
  const perChainTxLimit = Math.min(25, Math.max(8, Number(process.env.MORALIS_PROFILE_NFT_TRANSFER_LIMIT ?? 14)));

  const chainResults = await Promise.all(
    chains.map(async (ch) => {
      const chain = ch.trim().toLowerCase();
      const [nftsR, trR] = await Promise.all([
        fetchMoralisWalletNfts(a, chain, perChainNftLimit, { include_prices: true }),
        fetchMoralisWalletNftTransfers(a, chain, { limit: perChainTxLimit, order: "DESC" }),
      ]);
      return { chain, nftsR, trR };
    }),
  );

  for (const { chain, nftsR, trR } of chainResults) {
    if (!nftsR.ok) warnings.push(`${chain} NFTs: ${nftsR.error}`);
    if (!trR.ok) warnings.push(`${chain} NFT transfers: ${trR.error}`);
  }

  function extractRows(data: unknown): Record<string, unknown>[] {
    if (!data || typeof data !== "object") return [];
    const o = data as { result?: unknown[] };
    return Array.isArray(o.result) ? (o.result as Record<string, unknown>[]) : [];
  }

  const items: ProfileNftCard[] = [];
  const seen = new Set<string>();

  function numOrNull(v: unknown): number | null {
    if (v == null) return null;
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : null;
  }

  function pushRows(rows: Record<string, unknown>[], chain: string) {
    for (const n of rows) {
      if (n.possible_spam === true) continue;
      const contract = String(n.token_address ?? "").toLowerCase();
      const tokenId = String(n.token_id ?? "");
      if (!contract.startsWith("0x") || !tokenId) continue;
      const key = `${chain}:${contract}:${tokenId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const norm = n.normalized_metadata as { name?: string } | undefined;
      const nm = norm?.name != null ? String(norm.name) : "";
      const contractName = String(n.name ?? "").trim();
      const displayName =
        nm || (contractName && contractName !== "Unknown" ? contractName : "") || `Token #${tokenId}`;
      const sym = String(n.symbol ?? "").trim();
      const ctype = String(n.contract_type ?? "").trim();
      const amtRaw = n.amount != null ? String(n.amount).trim() : "";
      const amount =
        ctype.toUpperCase().includes("1155") && amtRaw && amtRaw !== "1" ? amtRaw : null;
      const lastSale = n.last_sale as {
        usd_price_at_sale?: string;
        price_formatted?: string;
        payment_token?: { token_symbol?: string };
      } | null;
      const lp = n.list_price as {
        listed?: boolean;
        price_usd?: string;
        marketplace?: string;
        price_currency?: string;
      } | null;
      const listPriceUsd =
        lp?.listed === true && lp.price_usd != null ? String(lp.price_usd) : null;
      const listMarketplace =
        listPriceUsd != null && lp?.marketplace != null ? String(lp.marketplace) : null;
      const listCurrency =
        listPriceUsd != null && lp?.price_currency != null ? String(lp.price_currency) : null;
      items.push({
        chain,
        contract,
        tokenId,
        name: displayName,
        symbol: sym || null,
        image: nftImage(n),
        contractType: ctype || null,
        amount,
        verifiedCollection: n.verified_collection === true,
        floorUsd: n.floor_price_usd != null ? String(n.floor_price_usd) : null,
        floorCurrency: n.floor_price_currency != null ? String(n.floor_price_currency) : null,
        lastSaleUsd:
          lastSale && lastSale.usd_price_at_sale != null
            ? String(lastSale.usd_price_at_sale)
            : null,
        lastSaleNative:
          lastSale && lastSale.price_formatted != null
            ? String(lastSale.price_formatted)
            : null,
        lastSalePaySymbol:
          lastSale?.payment_token?.token_symbol != null
            ? String(lastSale.payment_token.token_symbol)
            : null,
        rarityRank: numOrNull(n.rarity_rank),
        rarityLabel: n.rarity_label != null ? String(n.rarity_label) : null,
        listPriceUsd,
        listMarketplace,
        listCurrency,
      });
    }
  }

  for (const { chain, nftsR } of chainResults) {
    pushRows(extractRows(nftsR.ok ? nftsR.data : null), chain);
  }

  function transferSpam(v: unknown): boolean {
    return v === true || String(v).toLowerCase() === "true";
  }

  function mapNftTransferRow(
    row: Record<string, unknown>,
    chain: string,
    walletLower: string,
  ): ProfileNftTransferRow | null {
    if (transferSpam(row.possible_spam)) return null;
    const contract = String(row.token_address ?? "").toLowerCase();
    const tokenId = String(row.token_id ?? "");
    if (!contract.startsWith("0x") || !tokenId) return null;
    const from = String(row.from_address ?? "").toLowerCase();
    const to = String(row.to_address ?? "").toLowerCase();
    let direction: "in" | "out" | "other" = "other";
    if (to === walletLower && from !== walletLower) direction = "in";
    else if (from === walletLower && to !== walletLower) direction = "out";
    const tn = String(row.token_name ?? "").trim();
    const tsym = String(row.token_symbol ?? "").trim();
    const label = tn || tsym || `Token #${tokenId}`;
    const ctype = String(row.contract_type ?? "").trim();
    const amt = row.amount != null ? String(row.amount).trim() : "";
    const amount = ctype.toUpperCase().includes("1155") && amt && amt !== "1" ? amt : null;
    return {
      chain,
      contract,
      tokenId,
      label,
      txHash: String(row.transaction_hash ?? ""),
      ts: String(row.block_timestamp ?? ""),
      from,
      to,
      direction,
      contractType: ctype || null,
      amount,
    };
  }

  const transferAcc: ProfileNftTransferRow[] = [];
  for (const { chain, trR } of chainResults) {
    for (const row of extractRows(trR.ok ? trR.data : null)) {
      const m = mapNftTransferRow(row, chain, a);
      if (m) transferAcc.push(m);
    }
  }
  transferAcc.sort((x, y) => {
    const bx = Date.parse(x.ts);
    const by = Date.parse(y.ts);
    const nx = Number.isFinite(bx) ? bx : 0;
    const ny = Number.isFinite(by) ? by : 0;
    return ny - nx;
  });
  const transfers = transferAcc.slice(0, 28);

  return {
    ok: true,
    items,
    transfers,
    warnings: warnings.length ? warnings : undefined,
  };
});
