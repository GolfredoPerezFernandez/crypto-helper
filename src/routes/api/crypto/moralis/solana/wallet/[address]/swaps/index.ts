import type { RequestHandler } from "@builder.io/qwik-city";
import type { MoralisSolanaNetwork } from "~/server/crypto-ghost/moralis-api";
import { fetchMoralisSolanaSwaps } from "~/server/crypto-ghost/moralis-api";
import { isSolanaWalletAddress } from "~/server/crypto-ghost/wallet-snapshot";

/** GET solana-gateway …/account/{network}/{address}/swaps (~50 CUs). */
export const onGet: RequestHandler = async ({ params, query, json }) => {
  const raw = params.address?.trim() || "";
  if (!isSolanaWalletAddress(raw)) {
    json(400, { ok: false, error: "invalid Solana wallet address" });
    return;
  }

  const net = (query.get("network")?.trim().toLowerCase() || "mainnet") as string;
  const network: MoralisSolanaNetwork = net === "devnet" ? "devnet" : "mainnet";

  const limitRaw = query.get("limit");
  const limit = limitRaw != null ? Number(limitRaw) : undefined;
  const cursor = query.get("cursor")?.trim() || undefined;
  const o = query.get("order")?.trim().toUpperCase();
  const order = o === "ASC" || o === "DESC" ? o : undefined;
  const fromDate = query.get("fromDate")?.trim() || undefined;
  const toDate = query.get("toDate")?.trim() || undefined;
  const transactionTypes = query.get("transactionTypes")?.trim() || undefined;
  const tokenAddress = query.get("tokenAddress")?.trim() || undefined;

  const out = await fetchMoralisSolanaSwaps(raw, network, {
    limit,
    cursor,
    order,
    fromDate,
    toDate,
    transactionTypes,
    tokenAddress,
  });
  if (!out.ok) {
    json(502, { ok: false, error: out.error, network });
    return;
  }
  json(200, { ok: true, data: out.data, network, address: raw });
};
