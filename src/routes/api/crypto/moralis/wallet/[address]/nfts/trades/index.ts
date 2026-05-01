import type { RequestHandler } from "@builder.io/qwik-city";
import { fetchMoralisWalletNftTrades } from "~/server/crypto-helper/moralis-api";
import { isEvmAddress } from "~/server/crypto-helper/market-queries";
import { verifyAuth } from "~/utils/auth";

/** GET /wallets/{address}/nfts/trades — NFT trades for wallet. Session required. */
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
  const chain = (ev.query.get("chain")?.trim() || "base").toLowerCase();
  const limit = Math.min(100, Math.max(1, Number(ev.query.get("limit")) || 25));
  const cursor = ev.query.get("cursor")?.trim() || undefined;
  const nft_metadata = ev.query.get("nft_metadata") !== "false";
  const from_block = ev.query.get("from_block") ? Number(ev.query.get("from_block")) : undefined;
  const to_block = ev.query.get("to_block")?.trim() || undefined;
  const from_date = ev.query.get("from_date")?.trim() || undefined;
  const to_date = ev.query.get("to_date")?.trim() || undefined;

  const r = await fetchMoralisWalletNftTrades(address, chain, {
    limit,
    cursor,
    nft_metadata,
    from_block: Number.isFinite(from_block) ? from_block : undefined,
    to_block,
    from_date,
    to_date,
  });
  if (!r.ok) {
    ev.json(502, { ok: false, error: r.error });
    return;
  }
  ev.json(200, { ok: true, address, chain, data: r.data });
};
