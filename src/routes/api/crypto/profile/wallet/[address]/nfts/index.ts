import type { RequestHandler } from "@builder.io/qwik-city";
import { fetchProfileWalletNftsBundle } from "~/server/crypto-helper-actions";
import { isEvmAddress } from "~/server/crypto-helper/market-queries";
import { verifyAuth } from "~/utils/auth";

export const onGet: RequestHandler = async (ev) => {
  if (!(await verifyAuth(ev))) {
    ev.json(401, { ok: false, error: "Unauthorized" });
    return;
  }

  const raw = (ev.params.address || "").trim().toLowerCase();
  if (!isEvmAddress(raw)) {
    ev.json(400, { ok: false, error: "invalid address" });
    return;
  }

  ev.cacheControl({
    public: false,
    maxAge: 90,
    sMaxAge: 0,
    staleWhileRevalidate: 60 * 10,
  });

  try {
    const r = await fetchProfileWalletNftsBundle(raw);
    if (!r.ok) {
      ev.json(502, { ok: false, error: r.error || "NFT bundle unavailable" });
      return;
    }
    ev.json(200, {
      ok: true,
      items: r.items,
      transfers: r.transfers,
      warnings: r.warnings ?? [],
    });
  } catch (e) {
    ev.json(500, {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    });
  }
};

