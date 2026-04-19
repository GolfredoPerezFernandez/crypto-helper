import type { RequestHandler } from "@builder.io/qwik-city";
import { getMarketTokenByAddressLoose, isEvmAddress } from "~/server/crypto-ghost/market-queries";

export const onGet: RequestHandler = async ({ params, query, json }) => {
  const raw = params.address?.trim() || "";
  if (!isEvmAddress(raw)) {
    json(400, { error: "invalid token contract address" });
    return;
  }
  const tokenAddress = raw.toLowerCase();
  const chain = (query.get("chain")?.trim() || "base").toLowerCase();

  const row = await getMarketTokenByAddressLoose(tokenAddress);
  if (!row || String(row.address).toLowerCase() !== tokenAddress) {
    json(404, {
      ok: false,
      error: "Token not in CMC sync cache — no live Moralis call; run market sync.",
    });
    return;
  }

  const item = {
    token_address: row.address,
    address: row.address,
    symbol: row.symbol,
    name: row.name,
    decimals: Number(row.decimals ?? 18),
    logo: row.logo || undefined,
    chain,
  };
  json(200, {
    ok: true,
    tokenAddress,
    chain,
    data: { result: [item] },
    source: "cached_market_tokens",
  });
};
