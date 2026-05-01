import type { RequestHandler } from "@builder.io/qwik-city";
import { getWalletSnapshotJson } from "~/server/crypto-helper/api-snapshot-sync";
import { isEvmAddress } from "~/server/crypto-helper/market-queries";

export const onGet: RequestHandler = async ({ params, query, json }) => {
  const raw = params.address?.trim() || "";
  if (!isEvmAddress(raw)) {
    json(400, { error: "invalid address" });
    return;
  }
  const address = raw.toLowerCase();
  const chain = (query.get("chain")?.trim() || "eth").toLowerCase();
  const days = (query.get("days")?.trim() || "all").toLowerCase();

  const snap = await getWalletSnapshotJson(address);
  const r =
    chain === "base" || chain === "base-mainnet" ? snap?.pnlBase : snap?.pnlEth;
  if (!snap || !r) {
    json(503, { ok: false, error: "Datos de la wallet aún no disponibles." });
    return;
  }
  if (!r.ok) {
    json(502, { ok: false, error: r.error });
    return;
  }
  json(200, { ok: true, address, chain, days, data: r.data });
};
