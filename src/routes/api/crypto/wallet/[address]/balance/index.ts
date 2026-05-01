import type { RequestHandler } from "@builder.io/qwik-city";
import { getWalletSnapshotJson } from "~/server/crypto-helper/api-snapshot-sync";
import { isEvmAddress } from "~/server/crypto-helper/market-queries";
import { apiError, apiOk } from "~/routes/api/crypto/_shared/api-response";

export const onGet: RequestHandler = async ({ params, query, json, cacheControl }) => {
  cacheControl({
    public: true,
    maxAge: 60,
    staleWhileRevalidate: 60 * 10,
  });
  const raw = params.address?.trim() || "";
  if (!isEvmAddress(raw)) {
    json(400, apiError("BAD_REQUEST", "invalid EVM address"));
    return;
  }
  const address = raw.toLowerCase();
  const chain = (query.get("chain")?.trim() || "base").toLowerCase();

  const snap = await getWalletSnapshotJson(address);
  const r = chain === "eth" ? snap?.nativeEth : snap?.nativeBase;
  if (!snap || !r) {
    json(503, apiError("SNAPSHOT_MISSING", "Datos de la wallet aún no disponibles."));
    return;
  }
  if (!r.ok) {
    json(502, apiError("UPSTREAM_ERROR", r.error || "Balance nativo no disponible"));
    return;
  }
  json(200, apiOk(r.data, { address, chain }));
};
