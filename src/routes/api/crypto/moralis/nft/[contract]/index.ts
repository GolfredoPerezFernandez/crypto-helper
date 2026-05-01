import type { RequestHandler } from "@builder.io/qwik-city";
import { fetchMoralisNftsByContract } from "~/server/crypto-helper/moralis-api";
import { isEvmAddress } from "~/server/crypto-helper/market-queries";
import { verifyAuth } from "~/utils/auth";
import { apiError, apiOk } from "~/routes/api/crypto/_shared/api-response";
import { parseNftContractQuery } from "~/routes/api/crypto/moralis/_shared/nft-contract-query";

/**
 * Proxies Moralis GET /nft/{address} — NFTs by collection (paginated).
 * Same data as `/nfts/[contract]` list; useful for authenticated clients. Burns CUs.
 */
export const onGet: RequestHandler = async (ev) => {
  if (!(await verifyAuth(ev))) {
    ev.json(401, apiError("UNAUTHORIZED", "Unauthorized"));
    return;
  }
  const raw = ev.params.contract?.trim() || "";
  if (!isEvmAddress(raw)) {
    ev.json(400, apiError("BAD_REQUEST", "invalid contract"));
    return;
  }
  const contract = raw.toLowerCase();
  const q = parseNftContractQuery(ev.query);

  const r = await fetchMoralisNftsByContract(contract, q.chain, q);
  if (!r.ok) {
    ev.json(502, apiError("UPSTREAM_ERROR", r.error || "Moralis upstream failed"));
    return;
  }
  ev.json(200, apiOk(r.data, { contract, chain: q.chain }));
};
