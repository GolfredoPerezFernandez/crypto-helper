import type { RequestHandler } from "@builder.io/qwik-city";
import { fetchMoralisEvmWalletSwaps } from "~/server/crypto-ghost/moralis-api";
import { isEvmAddress } from "~/server/crypto-ghost/market-queries";
import { verifyAuth } from "~/utils/auth";

/** GET /wallets/{address}/swaps — DEX swaps for wallet. Session required. */
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
  const order = (ev.query.get("order")?.trim().toUpperCase() === "ASC" ? "ASC" : "DESC") as "ASC" | "DESC";
  const tokenAddress = ev.query.get("tokenAddress")?.trim() || undefined;
  const fromBlock = ev.query.get("fromBlock") ? Number(ev.query.get("fromBlock")) : undefined;
  const toBlock = ev.query.get("toBlock")?.trim() || undefined;
  const fromDate = ev.query.get("fromDate")?.trim() || undefined;
  const toDate = ev.query.get("toDate")?.trim() || undefined;
  const transactionTypes = ev.query.get("transactionTypes")?.trim() || undefined;

  const r = await fetchMoralisEvmWalletSwaps(address, chain, {
    limit,
    cursor,
    order,
    tokenAddress,
    fromBlock: Number.isFinite(fromBlock) ? fromBlock : undefined,
    toBlock,
    fromDate,
    toDate,
    transactionTypes,
  });
  if (!r.ok) {
    ev.json(502, { ok: false, error: r.error });
    return;
  }
  ev.json(200, { ok: true, address, chain, data: r.data });
};
