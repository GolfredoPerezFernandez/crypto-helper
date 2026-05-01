import type { RequestHandler } from "@builder.io/qwik-city";
import {
  fetchMoralisTokensSearch,
  type MoralisTokenSearchSortBy,
} from "~/server/crypto-helper/moralis-api";
import { verifyAuth } from "~/utils/auth";

const SORT: MoralisTokenSearchSortBy[] = [
  "volume1hDesc",
  "volume24hDesc",
  "liquidityDesc",
  "marketCapDesc",
];

/** GET …/token-search?query=&chains=&limit=&sortBy=&isVerifiedContract= — Moralis /tokens/search (Pro). Session required. */
export const onGet: RequestHandler = async (ev) => {
  if (!(await verifyAuth(ev))) {
    ev.json(401, { ok: false, error: "Unauthorized" });
    return;
  }
  const sp = ev.url.searchParams;
  const query = sp.get("query")?.trim() || undefined;
  const chains = sp.get("chains")?.trim() || undefined;
  const limitRaw = sp.get("limit");
  const limit = limitRaw ? parseInt(limitRaw, 10) : 25;
  const sortRaw = sp.get("sortBy")?.trim() || "volume24hDesc";
  const sortBy = SORT.includes(sortRaw as MoralisTokenSearchSortBy)
    ? (sortRaw as MoralisTokenSearchSortBy)
    : "volume24hDesc";
  const isVerifiedContract = sp.get("isVerifiedContract") === "true";
  const boostOff = sp.get("boostVerifiedContracts") === "false";

  const out = await fetchMoralisTokensSearch({
    query,
    chains,
    limit: Number.isFinite(limit) ? Math.min(1000, Math.max(1, limit)) : 25,
    sortBy,
    isVerifiedContract: isVerifiedContract || undefined,
    boostVerifiedContracts: boostOff ? false : undefined,
  });
  if (!out.ok) {
    ev.json(502, { ok: false, error: out.error });
    return;
  }
  ev.json(200, { ok: true, data: out.data, sortBy, chains: chains ?? null });
};
