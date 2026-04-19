import type { RequestHandler } from "@builder.io/qwik-city";
import { fetchMoralisTokenAnalyticsTimeseries } from "~/server/crypto-ghost/moralis-api";
import { isSolanaWalletAddress } from "~/server/crypto-ghost/wallet-snapshot";

const TF = new Set(["1d", "7d", "30d"]);

/** SPL mint: POST deep-index `POST /tokens/analytics/timeseries` with `{ chain: solana, tokenAddress: mint }` (~150 CUs, Pro+). */
export const onPost: RequestHandler = async ({ params, request, json }) => {
  const raw = params.mint?.trim() || "";
  if (!isSolanaWalletAddress(raw)) {
    json(400, { ok: false, error: "invalid Solana mint address" });
    return;
  }

  let body: { timeframe?: string };
  try {
    body = (await request.json()) as { timeframe?: string };
  } catch {
    json(400, { ok: false, error: "invalid JSON body" });
    return;
  }

  const timeframe = String(body.timeframe || "1d").toLowerCase();
  if (!TF.has(timeframe)) {
    json(400, { ok: false, error: "timeframe must be 1d, 7d, or 30d" });
    return;
  }

  const out = await fetchMoralisTokenAnalyticsTimeseries(
    [{ chain: "solana", tokenAddress: raw }],
    timeframe as "1d" | "7d" | "30d",
  );
  if (!out.ok) {
    json(502, { ok: false, error: out.error, chain: "solana" });
    return;
  }
  json(200, { ok: true, data: out.data, chain: "solana", mint: raw, timeframe });
};
