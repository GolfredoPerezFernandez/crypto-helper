import type { RequestHandler } from "@builder.io/qwik-city";
import { fetchMoralisWalletInsight } from "~/server/crypto-helper/moralis-api";
import { isEvmAddress } from "~/server/crypto-helper/market-queries";
import { verifyAuth } from "~/utils/auth";

/** GET /wallets/{address}/insight — wallet insight metrics. Session required. */
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
  const includeChainBreakdown = ev.url.searchParams.get("includeChainBreakdown") === "true";

  const r = await fetchMoralisWalletInsight(address, {
    chains: chains.length ? chains : undefined,
    includeChainBreakdown,
  });
  if (!r.ok) {
    ev.json(502, { ok: false, error: r.error });
    return;
  }
  ev.json(200, { ok: true, address, data: r.data });
};
