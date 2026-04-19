import type { RequestHandler } from "@builder.io/qwik-city";
import { fetchMoralisWalletHistory } from "~/server/crypto-ghost/moralis-api";
import { isEvmAddress } from "~/server/crypto-ghost/market-queries";
import { verifyAuth } from "~/utils/auth";

/** GET /wallets/{address}/history — decoded wallet history (Moralis). Session required. */
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

  const r = await fetchMoralisWalletHistory(address, chain, { limit, cursor, order });
  if (!r.ok) {
    ev.json(502, { ok: false, error: r.error });
    return;
  }
  ev.json(200, { ok: true, address, chain, data: r.data });
};
