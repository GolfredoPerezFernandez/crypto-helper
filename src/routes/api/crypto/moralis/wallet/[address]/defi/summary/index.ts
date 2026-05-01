import type { RequestHandler } from "@builder.io/qwik-city";
import { fetchMoralisWalletDefiSummary } from "~/server/crypto-helper/moralis-api";
import { isEvmAddress } from "~/server/crypto-helper/market-queries";
import { verifyAuth } from "~/utils/auth";

/** GET /wallets/{address}/defi/summary — Moralis DeFi protocol summary (session required). */
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
  const r = await fetchMoralisWalletDefiSummary(address, chain);
  if (!r.ok) {
    ev.json(502, { ok: false, error: r.error });
    return;
  }
  ev.json(200, { ok: true, address, chain, data: r.data });
};
