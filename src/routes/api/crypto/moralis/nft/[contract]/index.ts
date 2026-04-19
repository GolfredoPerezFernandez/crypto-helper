import type { RequestHandler } from "@builder.io/qwik-city";
import { fetchMoralisNftsByContract } from "~/server/crypto-ghost/moralis-api";
import { isEvmAddress } from "~/server/crypto-ghost/market-queries";
import { verifyAuth } from "~/utils/auth";

/**
 * Proxies Moralis GET /nft/{address} — NFTs by collection (paginated).
 * Same data as dashboard `/dashboard/nfts/[contract]` list; useful for authenticated clients. Burns CUs.
 */
export const onGet: RequestHandler = async (ev) => {
  if (!(await verifyAuth(ev))) {
    ev.json(401, { ok: false, error: "Unauthorized" });
    return;
  }
  const raw = ev.params.contract?.trim() || "";
  if (!isEvmAddress(raw)) {
    ev.json(400, { ok: false, error: "invalid contract" });
    return;
  }
  const contract = raw.toLowerCase();
  const q = ev.query;
  const chain = (q.get("chain")?.trim() || "base").toLowerCase();
  const limit = Math.min(100, Math.max(1, Number(q.get("limit") || 40) || 40));
  const cursor = q.get("cursor")?.trim() || undefined;
  const format = q.get("format")?.trim().toLowerCase() === "hex" ? "hex" : "decimal";
  const normalizeMetadata = q.get("normalizeMetadata") !== "false";
  const media_items = q.get("media_items") === "true";
  const include_prices = q.get("include_prices") === "true";
  const tr = q.get("totalRanges");
  const totalRanges = tr != null && tr !== "" ? Number(tr) : undefined;
  const rg = q.get("range");
  const range = rg != null && rg !== "" ? Number(rg) : undefined;

  const r = await fetchMoralisNftsByContract(contract, chain, {
    limit,
    cursor,
    format,
    normalizeMetadata,
    media_items,
    include_prices,
    totalRanges: Number.isFinite(totalRanges) && (totalRanges as number) >= 1 ? totalRanges : undefined,
    range: Number.isFinite(range) && (range as number) >= 1 ? range : undefined,
  });
  if (!r.ok) {
    ev.json(502, { ok: false, error: r.error });
    return;
  }
  ev.json(200, { ok: true, contract, chain, data: r.data });
};
