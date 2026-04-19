import webpush from "web-push";
import { and, eq, isNull, or } from "drizzle-orm";
import { db } from "~/lib/turso";
import { pushSubscriptions, users } from "../../drizzle/schema";

let vapidConfigured = false;
let warnedMissingVapid = false;

function sanitizeKey(v: string | undefined) {
  return String(v || "")
    .trim()
    .replace(/^['"]+|['"]+$/g, "")
    .replace(/\s+/g, "");
}

function ensureVapid(): boolean {
  if (vapidConfigured) return true;
  const publicKey = sanitizeKey(process.env.PUBLIC_VAPID_KEY);
  const privateKey = sanitizeKey(process.env.PRIVATE_VAPID_KEY);
  const contact = sanitizeKey(process.env.VAPID_CONTACT_EMAIL) || "mailto:noreply@example.com";
  if (!publicKey || !privateKey) {
    if (!warnedMissingVapid) {
      console.warn("[webpush] PUBLIC_VAPID_KEY / PRIVATE_VAPID_KEY missing — live signal push disabled");
      warnedMissingVapid = true;
    }
    return false;
  }
  try {
    webpush.setVapidDetails(contact, publicKey, privateKey);
    vapidConfigured = true;
    return true;
  } catch (e) {
    console.error("[webpush] setVapidDetails failed", e);
    return false;
  }
}

function prefColumn(kind: "whale" | "trader" | "smart") {
  if (kind === "whale") return users.pushWhaleAlerts;
  if (kind === "trader") return users.pushTraderAlerts;
  return users.pushSmartAlerts;
}

/** Enabled when coalesce(pref,1)=1 (null treated as on). */
function prefEnabled(kind: "whale" | "trader" | "smart") {
  const col = prefColumn(kind);
  return or(isNull(col), eq(col, 1));
}

export type LiveSignalPushPayload = {
  title: string;
  body: string;
  data: Record<string, string>;
};

/**
 * Fan-out Web Push to all subscribed users who opted into this signal kind.
 * Fire-and-forget from SSE pipeline; errors are logged per subscription.
 */
export async function sendLiveSignalPush(
  kind: "whale" | "trader" | "smart",
  payload: LiveSignalPushPayload,
): Promise<void> {
  if (!ensureVapid()) return;

  const rows = await db
    .select({
      endpoint: pushSubscriptions.endpoint,
      p256dh: pushSubscriptions.p256dh,
      auth: pushSubscriptions.auth,
    })
    .from(pushSubscriptions)
    .innerJoin(users, eq(pushSubscriptions.userId, users.id))
    .where(and(prefEnabled(kind)));

  if (!rows.length) return;

  const json = JSON.stringify({
    title: payload.title,
    body: payload.body,
    data: payload.data,
  });

  await Promise.all(
    rows.map(async (s) => {
      const pushSub = {
        endpoint: s.endpoint,
        keys: { p256dh: s.p256dh, auth: s.auth },
      };
      try {
        await webpush.sendNotification(pushSub, json, {
          TTL: 86_400,
          urgency: "high",
        });
      } catch (err: any) {
        const code = err?.statusCode;
        if (code === 410 || code === 404 || code === 400 || code === 403) {
          await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, s.endpoint));
        }
        console.warn("[webpush] send failed", code, s.endpoint.slice(0, 64));
      }
    }),
  );
}

const pricePrefOn = or(isNull(users.pushPriceAlerts), eq(users.pushPriceAlerts, 1));

/**
 * Web Push to one user (e.g. Pro price alerts). Respects `users.pushPriceAlerts`.
 */
export async function sendPushToUser(userId: number, payload: LiveSignalPushPayload): Promise<void> {
  if (!ensureVapid()) return;

  const rows = await db
    .select({
      endpoint: pushSubscriptions.endpoint,
      p256dh: pushSubscriptions.p256dh,
      auth: pushSubscriptions.auth,
    })
    .from(pushSubscriptions)
    .innerJoin(users, eq(pushSubscriptions.userId, users.id))
    .where(and(eq(users.id, userId), pricePrefOn));

  if (!rows.length) return;

  const json = JSON.stringify({
    title: payload.title,
    body: payload.body,
    data: payload.data,
  });

  await Promise.all(
    rows.map(async (s) => {
      const pushSub = {
        endpoint: s.endpoint,
        keys: { p256dh: s.p256dh, auth: s.auth },
      };
      try {
        await webpush.sendNotification(pushSub, json, {
          TTL: 86_400,
          urgency: "normal",
        });
      } catch (err: any) {
        const code = err?.statusCode;
        if (code === 410 || code === 404 || code === 400 || code === 403) {
          await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, s.endpoint));
        }
        console.warn("[webpush] user push failed", code, s.endpoint.slice(0, 64));
      }
    }),
  );
}
