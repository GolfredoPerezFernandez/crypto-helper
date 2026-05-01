import type { RequestHandler } from "@builder.io/qwik-city";
import { fetchMoralisWalletTransactionsRawNative } from "~/server/crypto-helper/moralis-api";
import { isEvmAddress } from "~/server/crypto-helper/market-queries";
import { verifyAuth } from "~/utils/auth";

/** GET /{address} — raw native txs (Moralis). Proxied as …/native. Session required. */
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
  const from_block = ev.query.get("from_block") ? Number(ev.query.get("from_block")) : undefined;
  const to_block = ev.query.get("to_block") ? Number(ev.query.get("to_block")) : undefined;
  const from_date = ev.query.get("from_date")?.trim() || undefined;
  const to_date = ev.query.get("to_date")?.trim() || undefined;
  const includeInternal = ev.query.get("include")?.trim() === "internal_transactions";

  const r = await fetchMoralisWalletTransactionsRawNative(address, chain, {
    limit,
    cursor,
    order,
    from_block: Number.isFinite(from_block) ? from_block : undefined,
    to_block: Number.isFinite(to_block) ? to_block : undefined,
    from_date,
    to_date,
    includeInternal,
  });
  if (!r.ok) {
    ev.json(502, { ok: false, error: r.error });
    return;
  }
  ev.json(200, { ok: true, address, chain, data: r.data });
};
