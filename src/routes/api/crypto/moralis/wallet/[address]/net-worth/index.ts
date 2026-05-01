import type { RequestHandler } from "@builder.io/qwik-city";
import { getWalletSnapshotJson } from "~/server/crypto-helper/api-snapshot-sync";
import { isEvmAddress } from "~/server/crypto-helper/market-queries";

export const onGet: RequestHandler = async ({ request, params, json }) => {
  const raw = params.address?.trim() || "";
  if (!isEvmAddress(raw)) {
    json(400, { error: "invalid address" });
    return;
  }
  const address = raw.toLowerCase();
  const url = new URL(request.url);
  const repeated = url.searchParams.getAll("chains");
  const single = url.searchParams.get("chains")?.trim();
  const chainsInput =
    repeated.length > 0 ? repeated : single ? [single] : ["eth"];

  const snap = await getWalletSnapshotJson(address);
  if (!snap) {
    json(503, { ok: false, error: "No wallet snapshot — run daily sync." });
    return;
  }

  const onlyEth =
    chainsInput.length === 1 && String(chainsInput[0]).toLowerCase() === "eth";
  const src = onlyEth ? snap.nwEth : snap.nw;
  if (!src.ok) {
    json(502, { ok: false, error: src.error });
    return;
  }
  json(200, { ok: true, address, chains: chainsInput, data: src.data });
};
