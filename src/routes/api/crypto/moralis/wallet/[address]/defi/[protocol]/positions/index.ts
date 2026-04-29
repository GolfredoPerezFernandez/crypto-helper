import type { RequestHandler } from "@builder.io/qwik-city";
import { fetchMoralisWalletDefiPositionsByProtocol } from "~/server/crypto-ghost/moralis-api";
import { isEvmAddress } from "~/server/crypto-ghost/market-queries";
import { verifyAuth } from "~/utils/auth";

/**
 * GET /wallets/{address}/defi/{protocol}/positions — Moralis Universal API v1.
 * Returns detailed DeFi positions for a single protocol (e.g. `aave-v3`, `uniswap-v3`)
 * across selected chains. Session required (Pro feature on the upstream).
 *
 * Query params:
 *   - chain | chains: comma-separated chain ids (e.g. `ethereum,base`). Default: `ethereum,base`.
 *   - limit:          1..100, default 25.
 *   - cursor:         pagination cursor returned by Moralis.
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
  const protocol = (ev.params.protocol || "").trim();
  if (!protocol || !/^[a-z0-9-]{1,80}$/i.test(protocol)) {
    ev.json(400, { ok: false, error: "invalid protocol" });
    return;
  }
  const address = raw.toLowerCase();

  const chainsParam = (ev.query.get("chains") || ev.query.get("chain") || "").trim();
  const chains = chainsParam
    ? chainsParam.split(",").map((s) => s.trim()).filter(Boolean)
    : ["ethereum", "base"];

  const limitRaw = Number(ev.query.get("limit") ?? 25);
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(100, Math.floor(limitRaw))) : 25;
  const cursor = ev.query.get("cursor")?.trim() || undefined;

  const r = await fetchMoralisWalletDefiPositionsByProtocol(address, protocol, chains, {
    limit,
    cursor,
  });
  if (!r.ok) {
    ev.json(502, { ok: false, error: r.error });
    return;
  }
  ev.json(200, { ok: true, address, protocol, chains, data: r.data });
};
