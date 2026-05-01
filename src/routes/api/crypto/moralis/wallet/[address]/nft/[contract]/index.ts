import type { RequestHandler } from "@builder.io/qwik-city";
import { fetchMoralisNftsByContract } from "~/server/crypto-helper/moralis-api";
import { isEvmAddress } from "~/server/crypto-helper/market-queries";
import { verifyAuth } from "~/utils/auth";
import { apiError, apiOk } from "~/routes/api/crypto/_shared/api-response";
import { parseNftContractQuery } from "~/routes/api/crypto/moralis/_shared/nft-contract-query";

/**
 * Moralis GET /nft/{contract} — NFTs by collection, scoped under wallet URL for parity with
 * …/wallet/:address/nft/collections. Same backend as GET /api/crypto/moralis/nft/:contract.
 */
export const onGet: RequestHandler = async (ev) => {
  if (!(await verifyAuth(ev))) {
    ev.json(401, apiError("UNAUTHORIZED", "Unauthorized"));
    return;
  }
  const rawWallet = ev.params.address?.trim() || "";
  const rawContract = ev.params.contract?.trim() || "";
  if (!isEvmAddress(rawWallet)) {
    ev.json(400, apiError("BAD_REQUEST", "invalid wallet address"));
    return;
  }
  if (!isEvmAddress(rawContract)) {
    ev.json(400, apiError("BAD_REQUEST", "invalid contract"));
    return;
  }
  const wallet = rawWallet.toLowerCase();
  const contract = rawContract.toLowerCase();
  const q = parseNftContractQuery(ev.query);

  const r = await fetchMoralisNftsByContract(contract, q.chain, q);
  if (!r.ok) {
    ev.json(502, apiError("UPSTREAM_ERROR", r.error || "Moralis upstream failed"));
    return;
  }
  ev.json(200, apiOk(r.data, { wallet, contract, chain: q.chain }));
};
