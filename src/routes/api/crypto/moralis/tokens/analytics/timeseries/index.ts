import type { RequestHandler } from "@builder.io/qwik-city";
import {
  fetchMoralisTokenAnalyticsTimeseries,
  MORALIS_TOKEN_ANALYTICS_TIMESERIES_MAX_TOKENS,
} from "~/server/crypto-ghost/moralis-api";
import { getMarketTokenById, isEvmAddress } from "~/server/crypto-ghost/market-queries";
import { parseTokenApiSnapshot } from "~/server/crypto-ghost/market-token-snapshot";
import { isSolanaWalletAddress } from "~/server/crypto-ghost/wallet-snapshot";

const TF = new Set(["1d", "7d", "30d"]);

type TokenEntry = { chain?: string; tokenAddress?: string };

export const onPost: RequestHandler = async ({ request, json }) => {
  let body: { tokenId?: number; timeframe?: string; tokens?: TokenEntry[] };
  try {
    body = (await request.json()) as { tokenId?: number; timeframe?: string; tokens?: TokenEntry[] };
  } catch {
    json(400, { ok: false, error: "invalid JSON body" });
    return;
  }

  const timeframe = String(body.timeframe || "1d").toLowerCase();
  if (!TF.has(timeframe)) {
    json(400, { ok: false, error: "timeframe must be 1d, 7d, or 30d" });
    return;
  }

  const rawTokens = Array.isArray(body.tokens) ? body.tokens : [];
  if (rawTokens.length > 0) {
    const pairs = rawTokens
      .map((t) => ({
        chain: String(t?.chain ?? "").trim(),
        tokenAddress: String(t?.tokenAddress ?? "").trim(),
      }))
      .filter((t) => t.chain && t.tokenAddress);
    if (!pairs.length) {
      json(400, { ok: false, error: "tokens[] must include chain and tokenAddress per item" });
      return;
    }
    if (pairs.length > MORALIS_TOKEN_ANALYTICS_TIMESERIES_MAX_TOKENS) {
      json(400, {
        ok: false,
        error: `at most ${MORALIS_TOKEN_ANALYTICS_TIMESERIES_MAX_TOKENS} tokens per request`,
      });
      return;
    }
    const out = await fetchMoralisTokenAnalyticsTimeseries(
      pairs,
      timeframe as "1d" | "7d" | "30d",
    );
    if (!out.ok) {
      json(502, { ok: false, error: out.error });
      return;
    }
    json(200, { ok: true, data: out.data, timeframe, tokens: pairs });
    return;
  }

  const tokenId = Number(body.tokenId);
  if (!Number.isFinite(tokenId) || tokenId < 1) {
    json(400, { ok: false, error: "tokenId required unless tokens[] is provided" });
    return;
  }

  const row = await getMarketTokenById(tokenId);
  if (!row) {
    json(404, { ok: false, error: "token not found" });
    return;
  }

  const snap = parseTokenApiSnapshot(row.apiSnapshot ?? null);
  const chain = String(snap?.moralisChain || "").trim().toLowerCase();
  const addrRaw = String(row.address || "").trim();
  const addrEvm = addrRaw.toLowerCase();

  if (isEvmAddress(addrEvm)) {
    if (!chain) {
      json(400, { ok: false, error: "missing moralisChain on snapshot — run sync first" });
      return;
    }
    const out = await fetchMoralisTokenAnalyticsTimeseries(
      [{ chain, tokenAddress: addrEvm }],
      timeframe as "1d" | "7d" | "30d",
    );
    if (!out.ok) {
      json(502, { ok: false, error: out.error });
      return;
    }
    json(200, { ok: true, data: out.data, chain, tokenAddress: addrEvm, timeframe });
    return;
  }

  if (isSolanaWalletAddress(addrRaw)) {
    if (chain && chain !== "solana") {
      json(400, {
        ok: false,
        error: "Solana mint requires moralisChain solana on snapshot (or omit chain)",
      });
      return;
    }
    const out = await fetchMoralisTokenAnalyticsTimeseries(
      [{ chain: "solana", tokenAddress: addrRaw }],
      timeframe as "1d" | "7d" | "30d",
    );
    if (!out.ok) {
      json(502, { ok: false, error: out.error });
      return;
    }
    json(200, { ok: true, data: out.data, chain: "solana", tokenAddress: addrRaw, timeframe });
    return;
  }

  json(400, { ok: false, error: "token address is neither EVM nor Solana mint" });
};
