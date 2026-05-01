import type { RequestHandler } from "@builder.io/qwik-city";
import {
  fetchMoralisSolanaPairOhlcv,
  type MoralisSolanaNetwork,
} from "~/server/crypto-helper/moralis-api";
import { verifyAuth } from "~/utils/auth";

/** GET …/solana/pairs/:address/ohlcv?network=&timeframe=&currency=&fromDate=&toDate=&limit= — Solana pair OHLCV. Session required. */
export const onGet: RequestHandler = async (ev) => {
  if (!(await verifyAuth(ev))) {
    ev.json(401, { ok: false, error: "Unauthorized" });
    return;
  }
  const pair = ev.params.address?.trim() || "";
  if (!pair) {
    ev.json(400, { ok: false, error: "missing pair address" });
    return;
  }
  const sp = ev.url.searchParams;
  const netRaw = (sp.get("network")?.trim() || "mainnet").toLowerCase();
  const network: MoralisSolanaNetwork = netRaw === "devnet" ? "devnet" : "mainnet";
  const timeframe = sp.get("timeframe")?.trim() || "1h";
  const currency = (sp.get("currency")?.trim() || "usd") as "usd" | "native";
  const fromDate = sp.get("fromDate")?.trim() || undefined;
  const toDate = sp.get("toDate")?.trim() || undefined;
  const limitRaw = sp.get("limit");
  const limitParsed = limitRaw != null && limitRaw !== "" ? parseInt(limitRaw, 10) : NaN;
  const limit = Number.isFinite(limitParsed) ? limitParsed : undefined;

  const out = await fetchMoralisSolanaPairOhlcv(pair, network, {
    timeframe,
    currency: currency === "native" ? "native" : "usd",
    fromDate,
    toDate,
    limit,
  });
  if (!out.ok) {
    ev.json(502, { ok: false, error: out.error });
    return;
  }
  ev.json(200, { ok: true, pair, network, data: out.data });
};
