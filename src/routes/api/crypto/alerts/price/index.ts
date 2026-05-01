import type { RequestHandler } from "@builder.io/qwik-city";
import { eq } from "drizzle-orm";
import { db } from "~/lib/turso";
import { cachedMarketTokens, userPriceAlerts } from "../../../../../../drizzle/schema";
import { getUserProAccess } from "~/server/crypto-helper/user-access";
import { verifyAuth } from "~/utils/auth";

export const onGet: RequestHandler = async (ev) => {
  if (!(await verifyAuth(ev))) {
    ev.json(401, { ok: false, error: "Unauthorized" });
    return;
  }
  if (!(await getUserProAccess(ev)).hasPro) {
    ev.json(403, { ok: false, error: "Pro subscription required" });
    return;
  }

  const uid = ev.cookie.get("auth_token")?.value;
  const userId = uid ? Number.parseInt(uid, 10) : NaN;
  if (!Number.isFinite(userId)) {
    ev.json(400, { ok: false, error: "Invalid session" });
    return;
  }

  const rows = await db
    .select({
      id: userPriceAlerts.id,
      tokenId: userPriceAlerts.tokenId,
      direction: userPriceAlerts.direction,
      thresholdUsd: userPriceAlerts.thresholdUsd,
      enabled: userPriceAlerts.enabled,
      lastTriggeredAt: userPriceAlerts.lastTriggeredAt,
      createdAt: userPriceAlerts.createdAt,
      symbol: cachedMarketTokens.symbol,
      name: cachedMarketTokens.name,
      price: cachedMarketTokens.price,
    })
    .from(userPriceAlerts)
    .innerJoin(cachedMarketTokens, eq(userPriceAlerts.tokenId, cachedMarketTokens.id))
    .where(eq(userPriceAlerts.userId, userId));

  ev.json(200, { ok: true, items: rows });
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

  const uid = ev.cookie.get("auth_token")?.value;
  const userId = uid ? Number.parseInt(uid, 10) : NaN;
  if (!Number.isFinite(userId)) {
    ev.json(400, { ok: false, error: "Invalid session" });
    return;
  }

  const body = (await ev.parseBody()) as Record<string, unknown> | undefined;
  const tokenId = typeof body?.tokenId === "number" ? body.tokenId : Number(body?.tokenId);
  const direction = String(body?.direction || "").toLowerCase();
  const rawTh = body?.thresholdUsd;
  const thNum =
    typeof rawTh === "number" ? rawTh : typeof rawTh === "string" ? Number(rawTh.replace(/,/g, "")) : NaN;

  if (!Number.isFinite(tokenId) || tokenId < 1) {
    ev.json(400, { ok: false, error: "Invalid tokenId" });
    return;
  }
  if (direction !== "above" && direction !== "below") {
    ev.json(400, { ok: false, error: "direction must be 'above' or 'below'" });
    return;
  }
  if (!Number.isFinite(thNum) || thNum <= 0) {
    ev.json(400, { ok: false, error: "Invalid thresholdUsd (positive number required)" });
    return;
  }

  const tok = await db
    .select({ id: cachedMarketTokens.id })
    .from(cachedMarketTokens)
    .where(eq(cachedMarketTokens.id, tokenId))
    .get();
  if (!tok) {
    ev.json(404, { ok: false, error: "Token not in market cache" });
    return;
  }

  const thresholdUsd = String(thNum);

  try {
    const [row] = await db
      .insert(userPriceAlerts)
      .values({
        userId,
        tokenId,
        direction,
        thresholdUsd,
        enabled: 1,
      })
      .returning();

    ev.json(200, { ok: true, alert: row });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/unique|UNIQUE|constraint/i.test(msg)) {
      ev.json(409, { ok: false, error: "An alert already exists for this token and direction" });
      return;
    }
    console.error("[api/crypto/alerts/price] insert", e);
    ev.json(500, { ok: false, error: "Could not create alert" });
  }
};
