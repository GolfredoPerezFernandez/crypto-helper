import { and, eq, or } from "drizzle-orm";
import { sendPushToUser } from "~/lib/webpush";
import { db } from "~/lib/turso";
import { cachedMarketTokens, userPriceAlerts, users } from "../../../drizzle/schema";
import { syncLogInfo, syncLogWarn } from "~/server/crypto-ghost/sync-logger";

/** Min seconds between repeat pushes for the same rule (crossing can re-fire after cooldown). */
const COOLDOWN_SEC = 4 * 60 * 60;

function defaultLocale() {
  return (
    (typeof process !== "undefined" && process.env.PUBLIC_DEFAULT_LOCALE?.trim()) ||
    "en-us"
  );
}

function parseUsd(s: string | null | undefined): number | null {
  if (s == null || s === "") return null;
  const n = Number(String(s).replace(/,/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * After CMC-backed market rows are fresh, evaluate Pro user price rules and send Web Push.
 * Fire-and-forget from sync; logs only.
 */
export async function runPriceAlertEvaluation(): Promise<void> {
  try {
    const rows = await db
      .select({
        alertId: userPriceAlerts.id,
        userId: userPriceAlerts.userId,
        tokenId: userPriceAlerts.tokenId,
        direction: userPriceAlerts.direction,
        thresholdUsd: userPriceAlerts.thresholdUsd,
        lastTriggeredAt: userPriceAlerts.lastTriggeredAt,
        price: cachedMarketTokens.price,
        symbol: cachedMarketTokens.symbol,
        name: cachedMarketTokens.name,
      })
      .from(userPriceAlerts)
      .innerJoin(users, eq(userPriceAlerts.userId, users.id))
      .innerJoin(cachedMarketTokens, eq(userPriceAlerts.tokenId, cachedMarketTokens.id))
      .where(
        and(
          eq(userPriceAlerts.enabled, 1),
          or(eq(users.type, "admin"), eq(users.subscriber, 1)),
        ),
      );

    if (!rows.length) return;

    const now = Math.floor(Date.now() / 1000);
    let triggered = 0;

    for (const r of rows) {
      const price = parseUsd(r.price);
      const threshold = parseUsd(r.thresholdUsd);
      if (price == null || threshold == null) continue;

      const dir = String(r.direction || "").toLowerCase();
      let shouldFire = false;
      if (dir === "above") shouldFire = price >= threshold;
      else if (dir === "below") shouldFire = price <= threshold;
      else continue;

      if (!shouldFire) continue;

      const last = r.lastTriggeredAt;
      if (last != null && now - last < COOLDOWN_SEC) continue;

      const loc = defaultLocale();
      const link = `/${loc}/token/${r.tokenId}/`;
      const sym = (r.symbol || "TOKEN").toUpperCase();
      const title = `${sym} price ${dir === "above" ? "≥" : "≤"} $${threshold.toLocaleString("en-US", { maximumFractionDigits: 8 })}`;
      const body = `Now ~$${price.toLocaleString("en-US", { maximumFractionDigits: 8 })} · ${r.name || sym}`;

      await sendPushToUser(r.userId, {
        title: title.slice(0, 200),
        body: body.slice(0, 500),
        data: {
          link,
          kind: "price",
          tag: `cg-price-${r.alertId}-${now}`,
        },
      });

      await db
        .update(userPriceAlerts)
        .set({ lastTriggeredAt: now })
        .where(eq(userPriceAlerts.id, r.alertId));
      triggered += 1;
    }

    if (triggered > 0) {
      syncLogInfo("price alerts — push notifications sent", { triggered, rules: rows.length });
    }
  } catch (e) {
    syncLogWarn("price alerts — evaluation failed", { error: e instanceof Error ? e.message : String(e) });
  }
}
