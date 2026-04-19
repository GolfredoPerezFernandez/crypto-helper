import type { RequestHandler } from "@builder.io/qwik-city";
import { eq } from "drizzle-orm";
import { db } from "~/lib/turso";
import { users } from "../../../../../drizzle/schema";
import { rejectCrossOriginPushPost } from "~/lib/push-api-guard";
import { getUserId } from "~/utils/auth";

function toFlag(v: unknown): number | undefined {
  if (v === undefined) return undefined;
  if (v === true || v === "true" || v === 1 || v === "1") return 1;
  if (v === false || v === "false" || v === 0 || v === "0") return 0;
  return undefined;
}

export const onGet: RequestHandler = async (event) => {
  const uid = getUserId(event);
  if (!uid) {
    event.json(401, { error: "Unauthorized" });
    return;
  }

  const userId = Number.parseInt(uid, 10);
  const row = await db
    .select({
      pushWhaleAlerts: users.pushWhaleAlerts,
      pushTraderAlerts: users.pushTraderAlerts,
      pushSmartAlerts: users.pushSmartAlerts,
      pushPriceAlerts: users.pushPriceAlerts,
    })
    .from(users)
    .where(eq(users.id, userId))
    .get();

  if (!row) {
    event.json(401, { error: "Unauthorized" });
    return;
  }

  const n = (x: number | null | undefined) => (x === 0 ? false : true);

  event.json(200, {
    pushWhaleAlerts: n(row.pushWhaleAlerts ?? 1),
    pushTraderAlerts: n(row.pushTraderAlerts ?? 1),
    pushSmartAlerts: n(row.pushSmartAlerts ?? 1),
    pushPriceAlerts: n(row.pushPriceAlerts ?? 1),
  });
};

export const onPost: RequestHandler = async (event) => {
  if (rejectCrossOriginPushPost(event)) return;

  const uid = getUserId(event);
  if (!uid) {
    event.json(401, { error: "Unauthorized" });
    return;
  }

  const userId = Number.parseInt(uid, 10);
  if (!Number.isFinite(userId)) {
    event.json(400, { error: "Invalid session" });
    return;
  }

  const body = (await event.parseBody()) as Record<string, unknown> | undefined;
  const w = toFlag(body?.pushWhaleAlerts);
  const t = toFlag(body?.pushTraderAlerts);
  const s = toFlag(body?.pushSmartAlerts);
  const p = toFlag(body?.pushPriceAlerts);

  const patch: {
    pushWhaleAlerts?: number;
    pushTraderAlerts?: number;
    pushSmartAlerts?: number;
    pushPriceAlerts?: number;
  } = {};
  if (w !== undefined) patch.pushWhaleAlerts = w;
  if (t !== undefined) patch.pushTraderAlerts = t;
  if (s !== undefined) patch.pushSmartAlerts = s;
  if (p !== undefined) patch.pushPriceAlerts = p;

  if (!Object.keys(patch).length) {
    event.json(400, { error: "No valid fields" });
    return;
  }

  await db.update(users).set(patch).where(eq(users.id, userId));

  event.json(200, { success: true });
};
