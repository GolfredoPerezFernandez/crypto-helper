/**
 * Crypto Helper — Express-only routes (SSE, webhooks, cron trigger).
 * JSON REST for market/signals/wallet lives under Qwik: `/api/crypto/*` (served by the city router).
 *
 * Qwik API overview:
 * - GET /api/crypto/health
 * - GET /api/crypto/meta/categories
 * - GET /api/crypto/market/tokens?category=&limit=&offset=
 * - GET /api/crypto/market/tokens/:id
 * - GET /api/crypto/market/by-slug/:category/:slug
 * - GET /api/crypto/sync/status?history=
 * - POST /api/crypto/sync/run (Qwik; Bearer CRON_SECRET if set; dev OK without secret)
 * - GET /api/crypto/signals/{whales|traders|smart}?limit=
 * - GET /api/crypto/wallet/:address/tokens?chain=
 * - GET /api/crypto/wallet/:address/balance?chain=
 * - GET /api/crypto/moralis/erc20/:address?chain=
 * - GET /api/crypto/moralis/solana/wallet/:address/portfolio?network=&nftMetadata=&mediaItems=&excludeSpam=
 * - GET /api/crypto/moralis/solana/wallet/:address/swaps?network=&limit=&cursor=&order=&fromDate=&toDate=&transactionTypes=&tokenAddress=
 * - GET /api/crypto/moralis/solana/token/:mint/top-holders?network=&limit=&cursor=
 * - GET /api/crypto/moralis/solana/token/:mint/holders/historical?network=&timeFrame=&fromDate=&toDate=&limit=&cursor=
 * - GET /api/crypto/moralis/solana/token/:mint/pairs?network=&limit=&cursor=
 * - GET /api/crypto/moralis/solana/token/:mint/swaps?network=&limit=&cursor=&order=&fromDate=&toDate=&transactionTypes=
 * - GET /api/crypto/moralis/solana/pairs/:pair/swaps?network=&limit=&cursor=&order=&fromDate=&toDate=&transactionTypes=
 * - GET /api/crypto/moralis/tokens/:address/analytics?tokenId=&chain=
 * - GET /api/crypto/moralis/token-search?query=&chains=&limit=&sortBy= (session; Moralis /tokens/search Pro)
 * - GET /api/crypto/moralis/pairs/:pairAddress/ohlcv?chain=&timeframe=&currency=&from_date=&to_date=&limit= (session; EVM OHLCV)
 * - GET /api/crypto/moralis/solana/pairs/:pairAddress/ohlcv?network=&timeframe=&currency=&fromDate=&toDate=&limit= (session; Solana OHLCV)
 * - POST /api/crypto/moralis/tokens/analytics/timeseries (JSON: tokenId or tokens[], timeframe 1d|7d|30d; max 30 tokens)
 * - POST /api/crypto/moralis/solana/token/:mint/analytics-timeseries (JSON: timeframe)
 * - Solana (live Moralis): /[locale]/solana/wallet/[address]/?network= · /[locale]/solana/token/[mint]/?network=
 * - NFTs: /[locale]/nfts/[0xContract]/?chain= · /[locale]/nfts/[0xContract]/[tokenId]/?chain= (Moralis server loaders)
 * - GET /api/crypto/moralis/wallet/:address/pnl?chain=&days=
 * - GET /api/crypto/moralis/wallet/:address/net-worth?chains=
 * - GET /api/crypto/moralis/wallet/:address/nft/collections?chain=&limit=&cursor=&exclude_spam=&include_prices=&token_counts= (session; Moralis GET /{address}/nft/collections)
 * - GET /api/crypto/moralis/wallet/:address/nft/:contract?chain=&limit=&cursor=&… (session; Moralis GET /nft/{contract}; alias of /api/crypto/moralis/nft/:contract)
 * - GET /api/crypto/moralis/nft/:contract?chain=&limit=&cursor=&format=&normalizeMetadata=&media_items=&include_prices=&totalRanges=&range= (session; Moralis GET /nft/{address})
 * - GET /api/crypto/moralis/wallet/:address/history?chain=&limit=&cursor=&order= (session; wallet history)
 * - GET /api/crypto/moralis/wallet/:address/erc20/transfers?chain=&limit=&cursor=&order=&from_block=&to_block= (session; ERC20 by wallet)
 * - GET /api/crypto/moralis/wallet/:address/swaps?chain=&limit=&cursor=&order=&tokenAddress= (session; DEX swaps)
 * - GET /api/crypto/moralis/wallet/:address/nfts/trades?chain=&limit=&cursor=&nft_metadata= (session; NFT trades)
 * - GET /api/crypto/moralis/wallet/:address/verbose?chain=&limit=&cursor=&order=&include= (session; native txs decoded)
 * - GET /api/crypto/moralis/wallet/:address/native?chain=&limit=&cursor=&order=&include= (session; Moralis GET /{address} raw native txs)
 * - GET /api/crypto/moralis/wallet/:address/insight?chains=&includeChainBreakdown= (session; wallet insight)
 * - GET /api/crypto/moralis/wallet/:address/stats?chain= (session; wallet stats)
 * - GET /api/crypto/moralis/wallet/:address/chains?chains= (session; active chains)
 * - GET /api/crypto/traders/icarus-swaps?limit=&offset=
 *
 * Express-only streams:
 * - GET /api/stream/whale-alert (SSE; Pro; server WHALE_ALERT_API_KEY; bridges wss://leviathan.whale-alert.io/ws)
 */
import type { Express, Request, Response } from "express";
import cron from "node-cron";
import { and, desc, eq, gt } from "drizzle-orm";
import { runDailyMarketSync } from "./crypto-helper/cmc-sync";
import { handleMoralisStreamWebhook } from "./crypto-helper/webhook-processor";
import { expressRequestHasProAccess } from "./crypto-helper/user-access";
import { smartEmitter, traderEmitter, whaleEmitter } from "./realtime/emitters";
import { startUsdtWatcher } from "./crypto-helper/usdt-watcher";
import { db } from "~/lib/turso";
import { syncRuns } from "../../drizzle/schema";
import { attachWhaleAlertSse } from "./crypto-helper/whale-alert-sse";

const BOOL_TRUE_RE = /^1|true|yes$/i;
const DEFAULT_BOOT_SYNC_FRESHNESS_HOURS = 20;

function attachSse(emitter: typeof whaleEmitter, eventName: string) {
  return async (_req: Request, res: Response) => {
    if (!(await expressRequestHasProAccess(_req))) {
      res.status(403).setHeader("Content-Type", "text/plain; charset=utf-8").send("Pro subscription required");
      return;
    }
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    if (typeof (res as any).flushHeaders === "function") (res as any).flushHeaders();

    const onMsg = (msg: string) => {
      res.write(`event: ${eventName}\ndata: ${msg}\n\n`);
    };
    emitter.on("message", onMsg);

    const ping = setInterval(() => {
      res.write(`: ping ${Date.now()}\n\n`);
    }, 25_000);

    _req.on("close", () => {
      clearInterval(ping);
      emitter.off("message", onMsg);
    });
  };
}

async function attachSmartSse(_req: Request, res: Response) {
  if (!(await expressRequestHasProAccess(_req))) {
    res.status(403).setHeader("Content-Type", "text/plain; charset=utf-8").send("Pro subscription required");
    return;
  }
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  if (typeof (res as any).flushHeaders === "function") (res as any).flushHeaders();

  const onAlert = (payload: string) => {
    res.write(`event: alert\ndata: ${payload}\n\n`);
  };
  smartEmitter.on("alert", onAlert);

  const ping = setInterval(() => {
    res.write(`: ping ${Date.now()}\n\n`);
  }, 25_000);

  _req.on("close", () => {
    clearInterval(ping);
    smartEmitter.off("alert", onAlert);
  });
}

export function registerCryptoHelperRoutes(app: Express): void {
  app.get("/api/stream/whales", attachSse(whaleEmitter, "new-message"));
  app.get("/api/stream/traders", attachSse(traderEmitter, "new-message"));
  app.get("/api/stream/smart", attachSmartSse);
  app.get("/api/stream/whale-alert", attachWhaleAlertSse);

  app.post("/api/webhook/moralis/whales", async (req, res) => {
    try {
      const r = await handleMoralisStreamWebhook(req.body, "whale");
      res.status(r.ok ? 200 : 500).json(r);
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e?.message });
    }
  });

  app.post("/api/webhook/moralis/traders", async (req, res) => {
    try {
      const r = await handleMoralisStreamWebhook(req.body, "trader");
      res.status(r.ok ? 200 : 500).json(r);
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e?.message });
    }
  });

  app.post("/api/internal/daily-sync", async (req, res) => {
    const auth = req.headers.authorization || "";
    const secret = process.env.CRON_SECRET?.trim() || "";
    if (!secret || auth !== `Bearer ${secret}`) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    console.log(
      "[Crypto Helper] manual sync trigger via /api/internal/daily-sync",
      new Date().toISOString(),
    );
    const t0 = Date.now();
    const out = await runDailyMarketSync();
    console.log(
      "[Crypto Helper] manual sync finished",
      JSON.stringify({ ok: out.ok, ms: Date.now() - t0, error: out.error }),
    );
    res.json(out);
  });
}

export function scheduleCryptoHelperJobs(): void {
  console.log("[Crypto Helper] scheduleCryptoHelperJobs() — start", new Date().toISOString());
  // Default once per day (UTC 03:00). Override with SYNC_CRON for custom cadence.
  const expr = process.env.SYNC_CRON || "0 3 * * *";
  cron.schedule(expr, () => {
    const tsStart = new Date().toISOString();
    console.log("[Crypto Helper] cron: scheduled market sync starting", tsStart);
    const t0 = Date.now();
    runDailyMarketSync()
      .then((out) =>
        console.log(
          "[Crypto Helper] cron: scheduled market sync finished",
          JSON.stringify({ ok: out.ok, ms: Date.now() - t0, error: out.error, skipped: out.skipped }),
        ),
      )
      .catch((e) => console.error("[cron] CMC sync", e));
  });
  console.log(`[Crypto Helper] market sync scheduled (cron): ${expr}`);

  const bootSyncEnabled = BOOL_TRUE_RE.test(String(process.env.SYNC_BOOTSTRAP_ENABLED ?? "1"));
  if (bootSyncEnabled) {
    console.log("[Crypto Helper] bootstrap sync enabled — will check freshness in 45s");
    setTimeout(async () => {
      try {
        const freshnessHoursRaw = Number(
          process.env.SYNC_BOOTSTRAP_FRESHNESS_HOURS ?? DEFAULT_BOOT_SYNC_FRESHNESS_HOURS,
        );
        const freshnessHours = Number.isFinite(freshnessHoursRaw)
          ? Math.max(1, Math.floor(freshnessHoursRaw))
          : DEFAULT_BOOT_SYNC_FRESHNESS_HOURS;
        const freshnessSeconds = freshnessHours * 60 * 60;
        const nowSec = Math.floor(Date.now() / 1000);
        const threshold = nowSec - freshnessSeconds;

        console.log(
          "[Crypto Helper] bootstrap sync — checking last success",
          JSON.stringify({ freshnessHours, thresholdEpoch: threshold }),
        );

        const lastRecentSuccess = await db
          .select({ id: syncRuns.id, finishedAt: syncRuns.finishedAt })
          .from(syncRuns)
          .where(
            and(
              eq(syncRuns.source, "daily-market-sync"),
              eq(syncRuns.status, "success"),
              gt(syncRuns.finishedAt, threshold),
            ),
          )
          .orderBy(desc(syncRuns.finishedAt))
          .limit(1);

        if (lastRecentSuccess.length > 0) {
          console.log(
            `[Crypto Helper] delayed initial market sync skipped (recent success within ${freshnessHours}h)`,
            JSON.stringify({ lastFinishedAt: lastRecentSuccess[0].finishedAt }),
          );
          return;
        }

        console.log("[Crypto Helper] delayed initial market sync (45s after boot)", new Date().toISOString());
        const t0 = Date.now();
        const out = await runDailyMarketSync();
        console.log(
          "[Crypto Helper] delayed initial market sync finished",
          JSON.stringify({ ok: out.ok, ms: Date.now() - t0, error: out.error, skipped: out.skipped }),
        );
      } catch (e) {
        console.error("[Crypto Helper] delayed initial sync failed", e);
      }
    }, 45_000);
  } else {
    console.log("[Crypto Helper] delayed initial market sync disabled via SYNC_BOOTSTRAP_ENABLED");
  }

  const rpc = process.env.ETHEREUM_RPC_URL?.trim();
  if (rpc) {
    const stop = startUsdtWatcher(smartEmitter, rpc);
    process.on("SIGTERM", stop);
    console.log("[Crypto Helper] USDT fresh-wallet watcher enabled");
  } else {
    console.warn("[Crypto Helper] ETHEREUM_RPC_URL not set — smart watcher disabled");
  }
  console.log("[Crypto Helper] scheduleCryptoHelperJobs() — done");
}
