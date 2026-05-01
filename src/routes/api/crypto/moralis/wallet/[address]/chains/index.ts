import type { RequestHandler } from "@builder.io/qwik-city";
import { fetchMoralisWalletActiveChains } from "~/server/crypto-helper/moralis-api";
import { isEvmAddress } from "~/server/crypto-helper/market-queries";
import { verifyAuth } from "~/utils/auth";

/** GET /wallets/{address}/chains — active chains for wallet. Session required. */
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
  const chains = ev.url.searchParams.getAll("chains").map((c) => c.trim()).filter(Boolean);

  const r = await fetchMoralisWalletActiveChains(address, chains.length ? chains : undefined);
  if (!r.ok) {
    ev.json(502, { ok: false, error: r.error });
    return;
  }
  ev.json(200, { ok: true, address, data: r.data });
};
