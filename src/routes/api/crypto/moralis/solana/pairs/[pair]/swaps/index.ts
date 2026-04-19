import type { RequestHandler } from "@builder.io/qwik-city";
import type { MoralisSolanaNetwork } from "~/server/crypto-ghost/moralis-api";
import { fetchMoralisSolanaPairSwaps } from "~/server/crypto-ghost/moralis-api";
import { isSolanaWalletAddress } from "~/server/crypto-ghost/wallet-snapshot";

function parseOrder(v: string | null): "ASC" | "DESC" | undefined {
  const u = v?.trim().toUpperCase();
  if (u === "ASC" || u === "DESC") return u;
  return undefined;
}

export const onGet: RequestHandler = async ({ params, query, json }) => {
  const raw = params.pair?.trim() || "";
  if (!isSolanaWalletAddress(raw)) {
    json(400, { ok: false, error: "invalid Solana pair address" });
    return;
  }
  const net = (query.get("network")?.trim().toLowerCase() || "mainnet") as string;
  const network: MoralisSolanaNetwork = net === "devnet" ? "devnet" : "mainnet";
  const cursor = query.get("cursor")?.trim() || undefined;
  const limitRaw = query.get("limit");
  const limit = limitRaw != null ? Number(limitRaw) : undefined;
  const order = parseOrder(query.get("order"));
  const fromDate = query.get("fromDate")?.trim() || undefined;
  const toDate = query.get("toDate")?.trim() || undefined;
  const transactionTypes = query.get("transactionTypes")?.trim() || undefined;

  const out = await fetchMoralisSolanaPairSwaps(raw, network, {
    cursor,
    limit: Number.isFinite(limit) ? limit : undefined,
    order,
    fromDate,
    toDate,
    transactionTypes,
  });
  if (!out.ok) {
    json(502, { ok: false, error: out.error, network });
    return;
  }
  json(200, { ok: true, data: out.data, network, pair: raw });
};
