import type { RequestHandler } from "@builder.io/qwik-city";
import type { MoralisSolanaNetwork } from "~/server/crypto-ghost/moralis-api";
import { fetchMoralisSolanaPortfolio } from "~/server/crypto-ghost/moralis-api";
import { isSolanaWalletAddress } from "~/server/crypto-ghost/wallet-snapshot";

/** GET solana-gateway …/account/{network}/{address}/portfolio (~10 CUs). */
export const onGet: RequestHandler = async ({ params, query, json }) => {
  const raw = params.address?.trim() || "";
  if (!isSolanaWalletAddress(raw)) {
    json(400, { ok: false, error: "invalid Solana wallet address" });
    return;
  }

  const net = (query.get("network")?.trim().toLowerCase() || "mainnet") as string;
  const network: MoralisSolanaNetwork = net === "devnet" ? "devnet" : "mainnet";

  const nftMetadata = query.get("nftMetadata")?.toLowerCase() === "true";
  const mediaItems = query.get("mediaItems")?.toLowerCase() === "true";
  const excludeSpam = query.get("excludeSpam")?.toLowerCase() === "true";

  const out = await fetchMoralisSolanaPortfolio(raw, network, {
    nftMetadata,
    mediaItems,
    excludeSpam,
  });
  if (!out.ok) {
    json(502, { ok: false, error: out.error, network });
    return;
  }
  json(200, { ok: true, data: out.data, network, address: raw });
};
