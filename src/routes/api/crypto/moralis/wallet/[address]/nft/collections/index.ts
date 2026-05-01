import type { RequestHandler } from "@builder.io/qwik-city";
import { fetchMoralisWalletNftCollections } from "~/server/crypto-helper/moralis-api";
import { isEvmAddress } from "~/server/crypto-helper/market-queries";
import { verifyAuth } from "~/utils/auth";

/**
 * Proxies Moralis GET /{address}/nft/collections (live). Requires session — burns CUs.
 * Query: chain (default base), limit, cursor, exclude_spam (default true), include_prices, token_counts (default true).
 */
export const onGet: RequestHandler = async (ev) => {
  if (!(await verifyAuth(ev))) {
    ev.json(401, { ok: false, error: "Unauthorized" });
    return;
  }
  const raw = ev.params.address?.trim() || "";
  if (!isEvmAddress(raw)) {
    ev.json(400, { ok: false, error: "invalid address" });
    return;
  }
  const address = raw.toLowerCase();
  const q = ev.query;
  const chain = (q.get("chain")?.trim() || "base").toLowerCase();
  const limit = Math.min(100, Math.max(1, Number(q.get("limit") || 50) || 50));
  const cursor = q.get("cursor")?.trim() || undefined;
  const exclude_spam = q.get("exclude_spam") !== "false";
  const include_prices = q.get("include_prices") === "true";
  const token_counts = q.get("token_counts") !== "false";

  const r = await fetchMoralisWalletNftCollections(address, chain, {
    limit,
    cursor,
    exclude_spam,
    include_prices,
    token_counts,
  });
  if (!r.ok) {
    ev.json(502, { ok: false, error: r.error });
    return;
  }
  ev.json(200, { ok: true, address, chain, data: r.data });
};
