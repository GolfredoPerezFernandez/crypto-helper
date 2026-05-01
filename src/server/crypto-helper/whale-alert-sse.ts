/**
 * Proxies Whale Alert Custom Alerts WebSocket (server-side API key) to the browser via SSE.
 * Browser: EventSource → GET /api/stream/whale-alert (Pro). Upstream: wss://leviathan.whale-alert.io/ws
 *
 * Whale Alert limits concurrent WebSocket connections per API key — avoid many open SSE tabs.
 *
 * Optional env: WHALE_ALERT_SSE_SUBSCRIBE_JSON — JSON object for subscribe_alerts (merged with defaults).
 * min_value_usd is clamped to at least 100_000 per Whale Alert rules.
 */
import type { Request, Response } from "express";
import WebSocket from "ws";
import { expressRequestHasProAccess } from "./user-access";

const LEVIATHAN_WS = "wss://leviathan.whale-alert.io/ws";
const MIN_VALUE_USD = 100_000;

function defaultSubscribe(): Record<string, unknown> {
  return {
    type: "subscribe_alerts",
    id: "crypto-helper-sse",
    blockchains: ["ethereum", "bitcoin"],
    symbols: ["eth", "btc"],
    tx_types: ["transfer"],
    min_value_usd: 1_000_000,
  };
}

function mergeSubscribePayload(): Record<string, unknown> {
  const raw = process.env.WHALE_ALERT_SSE_SUBSCRIBE_JSON?.trim();
  let base = defaultSubscribe();
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      base = { ...base, ...parsed };
    } catch {
      /* keep defaults */
    }
  }
  base.type = "subscribe_alerts";
  const minRaw = Number(base.min_value_usd);
  const min = Number.isFinite(minRaw) ? minRaw : MIN_VALUE_USD;
  base.min_value_usd = Math.max(MIN_VALUE_USD, min);
  return base;
}

function safeWrite(res: Response, chunk: string): boolean {
  if (res.writableEnded) return false;
  try {
    res.write(chunk);
    return true;
  } catch {
    return false;
  }
}

export async function attachWhaleAlertSse(req: Request, res: Response): Promise<void> {
  if (!(await expressRequestHasProAccess(req))) {
    res.status(403).setHeader("Content-Type", "text/plain; charset=utf-8").send("Pro subscription required");
    return;
  }

  const apiKey = process.env.WHALE_ALERT_API_KEY?.trim();
  if (!apiKey) {
    res.status(503).setHeader("Content-Type", "text/plain; charset=utf-8").send("WHALE_ALERT_API_KEY not configured");
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  if (typeof (res as { flushHeaders?: () => void }).flushHeaders === "function") {
    (res as { flushHeaders: () => void }).flushHeaders();
  }

  const wsUrl = new URL(LEVIATHAN_WS);
  wsUrl.searchParams.set("api_key", apiKey);
  const ws = new WebSocket(wsUrl.toString());

  let finished = false;
  const ping = setInterval(() => {
    safeWrite(res, `: ping ${Date.now()}\n\n`);
  }, 25_000);

  function finish(): void {
    if (finished) return;
    finished = true;
    clearInterval(ping);
    try {
      ws.removeAllListeners();
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    } catch {
      /* ignore */
    }
    if (!res.writableEnded) {
      try {
        res.end();
      } catch {
        /* ignore */
      }
    }
  }

  req.on("close", finish);

  ws.on("open", () => {
    if (finished) return;
    try {
      ws.send(JSON.stringify(mergeSubscribePayload()));
    } catch {
      const line = JSON.stringify({ error: "subscribe_send_failed" });
      safeWrite(res, `event: upstream-error\ndata: ${line}\n\n`);
      finish();
    }
  });

  ws.on("message", (data: WebSocket.RawData) => {
    if (finished) return;
    const text = Buffer.isBuffer(data) ? data.toString("utf8") : String(data);
    let out: unknown;
    try {
      out = JSON.parse(text) as unknown;
    } catch {
      out = { _raw: text };
    }
    const line = JSON.stringify(out);
    if (!safeWrite(res, `event: message\ndata: ${line}\n\n`)) {
      finish();
    }
  });

  ws.on("error", (err: Error) => {
    if (finished) return;
    const line = JSON.stringify({ error: "upstream", message: err.message });
    safeWrite(res, `event: upstream-error\ndata: ${line}\n\n`);
    finish();
  });

  ws.on("close", (code: number, reason: Buffer) => {
    if (finished) return;
    const line = JSON.stringify({
      error: "upstream_closed",
      code,
      reason: reason?.toString?.() ?? "",
    });
    safeWrite(res, `event: upstream-error\ndata: ${line}\n\n`);
    finish();
  });
}
