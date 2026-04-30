import type { RequestHandler } from "@builder.io/qwik-city";
import {
  fetchNansenTgm,
  getDefaultTgmRequest,
  parseTgmEndpoint,
} from "~/server/crypto-ghost/nansen-smart-money";
import { getUserProAccess } from "~/server/crypto-ghost/user-access";
import { verifyAuth } from "~/utils/auth";

async function readBody(ev: Parameters<RequestHandler>[0]): Promise<unknown> {
  try {
    return await ev.parseBody();
  } catch {
    return null;
  }
}

function boolQ(v: string | null, fallback: boolean): boolean {
  if (v == null) return fallback;
  return /^1|true|yes$/i.test(v);
}

export const onGet: RequestHandler = async (ev) => {
  if (!(await verifyAuth(ev))) {
    ev.json(401, { ok: false, error: "Unauthorized" });
    return;
  }
  if (!(await getUserProAccess(ev)).hasPro) {
    ev.json(403, { ok: false, error: "Pro subscription required" });
    return;
  }

  const endpoint = parseTgmEndpoint(ev.params.endpoint);
  if (!endpoint) {
    ev.json(400, { ok: false, error: "Invalid Nansen TGM endpoint" });
    return;
  }
  const chain = ev.query.get("chain") || "ethereum";
  const tokenAddress = ev.query.get("token") || "";
  const timeframe = ev.query.get("timeframe") || "24h";
  const tokenSymbol = ev.query.get("symbol") || "ETH";

  const payload = getDefaultTgmRequest(endpoint, { chain, tokenAddress, timeframe, tokenSymbol });
  if (endpoint === "perp-pnl-leaderboard") {
    (payload as Record<string, unknown>).premium_labels = boolQ(ev.query.get("premium_labels"), true);
  }
  const out = await fetchNansenTgm(endpoint, payload);
  if (!out.ok) {
    ev.json(out.status, {
      ok: false,
      error: out.error,
      creditsUsed: out.creditsUsed ?? null,
      creditsRemaining: out.creditsRemaining ?? null,
    });
    return;
  }
  ev.json(200, {
    ok: true,
    endpoint,
    data: out.data,
    creditsUsed: out.creditsUsed ?? null,
    creditsRemaining: out.creditsRemaining ?? null,
  });
};

export const onPost: RequestHandler = async (ev) => {
  if (!(await verifyAuth(ev))) {
    ev.json(401, { ok: false, error: "Unauthorized" });
    return;
  }
  if (!(await getUserProAccess(ev)).hasPro) {
    ev.json(403, { ok: false, error: "Pro subscription required" });
    return;
  }

  const endpoint = parseTgmEndpoint(ev.params.endpoint);
  if (!endpoint) {
    ev.json(400, { ok: false, error: "Invalid Nansen TGM endpoint" });
    return;
  }
  const body = await readBody(ev);
  const payload =
    body && typeof body === "object" && "payload" in (body as Record<string, unknown>)
      ? (body as Record<string, unknown>).payload
      : body;
  const out = await fetchNansenTgm(endpoint, payload ?? {});
  if (!out.ok) {
    ev.json(out.status, {
      ok: false,
      error: out.error,
      creditsUsed: out.creditsUsed ?? null,
      creditsRemaining: out.creditsRemaining ?? null,
    });
    return;
  }
  ev.json(200, {
    ok: true,
    endpoint,
    data: out.data,
    creditsUsed: out.creditsUsed ?? null,
    creditsRemaining: out.creditsRemaining ?? null,
  });
};

