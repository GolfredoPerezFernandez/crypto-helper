import type { RequestHandler } from "@builder.io/qwik-city";
import { fetchMoralisPairOhlcv } from "~/server/crypto-helper/moralis-api";
import { isEvmAddress } from "~/server/crypto-helper/market-queries";
import { verifyAuth } from "~/utils/auth";

/** GET …/pairs/:address/ohlcv?chain=&timeframe=&currency=&from_date=&to_date=&limit= — Moralis pair OHLCV (~150 CUs). Session required. */
export const onGet: RequestHandler = async (ev) => {
  if (!(await verifyAuth(ev))) {
    ev.json(401, { ok: false, error: "Unauthorized" });
    return;
  }
  const raw = ev.params.address?.trim() || "";
  if (!isEvmAddress(raw)) {
    ev.json(400, { ok: false, error: "invalid pair address" });
    return;
  }
  const pair = raw.toLowerCase();
  const sp = ev.url.searchParams;
  const chain = (sp.get("chain")?.trim() || "eth").toLowerCase();
  const timeframe = sp.get("timeframe")?.trim() || "1h";
  const currency = (sp.get("currency")?.trim() || "usd") as "usd" | "native";
  const fromDate = sp.get("from_date")?.trim() || sp.get("fromDate")?.trim() || undefined;
  const toDate = sp.get("to_date")?.trim() || sp.get("toDate")?.trim() || undefined;
  const limitRaw = sp.get("limit");
  const limitParsed = limitRaw != null && limitRaw !== "" ? parseInt(limitRaw, 10) : NaN;
  const limit = Number.isFinite(limitParsed) ? limitParsed : undefined;

  const out = await fetchMoralisPairOhlcv(pair, chain, {
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
  ev.json(200, { ok: true, pair, chain, data: out.data });
};
