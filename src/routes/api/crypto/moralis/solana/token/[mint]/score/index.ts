import type { RequestHandler } from "@builder.io/qwik-city";
import { fetchMoralisTokenScore } from "~/server/crypto-ghost/moralis-api";
import { isSolanaWalletAddress } from "~/server/crypto-ghost/wallet-snapshot";

/** SPL token score via deep-index `GET /tokens/{mint}/score?chain=solana` (~100 CUs, Pro+). */
export const onGet: RequestHandler = async ({ params, json }) => {
  const raw = params.mint?.trim() || "";
  if (!isSolanaWalletAddress(raw)) {
    json(400, { ok: false, error: "invalid Solana mint address" });
    return;
  }

  const out = await fetchMoralisTokenScore(raw, "solana");
  if (!out.ok) {
    json(502, { ok: false, error: out.error, chain: "solana" });
    return;
  }
  json(200, { ok: true, data: out.data, chain: "solana", mint: raw });
};
