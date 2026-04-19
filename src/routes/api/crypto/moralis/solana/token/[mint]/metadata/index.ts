import type { RequestHandler } from "@builder.io/qwik-city";
import type { MoralisSolanaNetwork } from "~/server/crypto-ghost/moralis-api";
import { fetchMoralisSolanaTokenMetadata } from "~/server/crypto-ghost/moralis-api";
import { isSolanaWalletAddress } from "~/server/crypto-ghost/wallet-snapshot";

export const onGet: RequestHandler = async ({ params, query, json }) => {
  const raw = params.mint?.trim() || "";
  if (!isSolanaWalletAddress(raw)) {
    json(400, { ok: false, error: "invalid Solana mint address" });
    return;
  }
  const net = (query.get("network")?.trim().toLowerCase() || "mainnet") as string;
  const network: MoralisSolanaNetwork = net === "devnet" ? "devnet" : "mainnet";

  const out = await fetchMoralisSolanaTokenMetadata(raw, network);
  if (!out.ok) {
    json(502, { ok: false, error: out.error, network });
    return;
  }
  json(200, { ok: true, data: out.data, network, mint: raw });
};
