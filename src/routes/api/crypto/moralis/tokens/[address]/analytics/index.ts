import type { RequestHandler } from "@builder.io/qwik-city";
import { fetchMoralisTokenAnalytics } from "~/server/crypto-helper/moralis-api";
import { getMarketTokenById, isEvmAddress } from "~/server/crypto-helper/market-queries";
import { parseTokenApiSnapshot } from "~/server/crypto-helper/market-token-snapshot";

export const onGet: RequestHandler = async ({ params, query, json }) => {
  const raw = params.address?.trim() || "";
  if (!isEvmAddress(raw)) {
    json(400, { ok: false, error: "invalid token address" });
    return;
  }
  const tokenAddress = raw.toLowerCase();

  const tokenId = Number(query.get("tokenId") || "");
  if (!Number.isFinite(tokenId) || tokenId < 1) {
    json(400, { ok: false, error: "tokenId required" });
    return;
  }

  const row = await getMarketTokenById(tokenId);
  if (!row || String(row.address).toLowerCase() !== tokenAddress) {
    json(404, { ok: false, error: "token not found or address mismatch" });
    return;
  }

  const snap = parseTokenApiSnapshot(row.apiSnapshot ?? null);
  const chain = (query.get("chain")?.trim() || snap?.moralisChain || "eth").toLowerCase();

  const out = await fetchMoralisTokenAnalytics(tokenAddress, chain);
  if (!out.ok) {
    json(502, { ok: false, error: out.error });
    return;
  }
  json(200, { ok: true, data: out.data, chain });
};
