import type { RequestHandler } from "@builder.io/qwik-city";
import type { MoralisSolanaHolderTimeFrame, MoralisSolanaNetwork } from "~/server/crypto-ghost/moralis-api";
import { fetchMoralisSolanaTokenHoldersHistorical } from "~/server/crypto-ghost/moralis-api";
import { isSolanaWalletAddress } from "~/server/crypto-ghost/wallet-snapshot";

export const onGet: RequestHandler = async ({ params, query, json }) => {
  const raw = params.mint?.trim() || "";
  if (!isSolanaWalletAddress(raw)) {
    json(400, { ok: false, error: "invalid Solana mint address" });
    return;
  }
  const net = (query.get("network")?.trim().toLowerCase() || "mainnet") as string;
  const network: MoralisSolanaNetwork = net === "devnet" ? "devnet" : "mainnet";

  const fromDate = query.get("fromDate")?.trim() || "";
  const toDate = query.get("toDate")?.trim() || "";
  if (!fromDate || !toDate) {
    json(400, {
      ok: false,
      error: "fromDate and toDate are required (ISO string or unix seconds per Moralis)",
    });
    return;
  }

  const timeFrame = (query.get("timeFrame")?.trim() || "1min") as MoralisSolanaHolderTimeFrame;
  const cursor = query.get("cursor")?.trim() || undefined;
  const limitRaw = query.get("limit");
  const limit = limitRaw != null ? Number(limitRaw) : undefined;

  const out = await fetchMoralisSolanaTokenHoldersHistorical(raw, network, {
    timeFrame,
    fromDate,
    toDate,
    cursor,
    limit: Number.isFinite(limit) ? limit : undefined,
  });
  if (!out.ok) {
    json(502, { ok: false, error: out.error, network, timeFrame });
    return;
  }
  json(200, { ok: true, data: out.data, network, mint: raw, timeFrame, fromDate, toDate });
};
