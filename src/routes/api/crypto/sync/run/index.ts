import type { RequestHandler } from "@builder.io/qwik-city";
import { runDailyMarketSync } from "~/server/crypto-helper/cmc-sync";

/**
 * POST /api/crypto/sync/run
 * Fills `cached_market_tokens` from CoinMarketCap (needs CMC_API_KEY).
 *
 * Auth: if CRON_SECRET is set, send header Authorization: Bearer <CRON_SECRET>
 * (same as Express POST /api/internal/daily-sync).
 * If CRON_SECRET is empty and NODE_ENV !== "production", the request is allowed (local dev only).
 */
export const onPost: RequestHandler = async ({ request, json }) => {
  const secret = process.env.CRON_SECRET?.trim() ?? "";
  const auth = request.headers.get("authorization") ?? "";
  const isProd = process.env.NODE_ENV === "production";

  if (secret) {
    if (auth !== `Bearer ${secret}`) {
      json(401, { ok: false, error: "Unauthorized" });
      return;
    }
  } else if (isProd) {
    json(503, {
      ok: false,
      error: "Set CRON_SECRET in production and send Authorization: Bearer <secret>",
    });
    return;
  }

  const out = await runDailyMarketSync();
  json(out.ok ? 200 : 500, out);
};
