import type { RequestHandler } from "@builder.io/qwik-city";
import { and, eq } from "drizzle-orm";
import { db } from "~/lib/turso";
import { userPriceAlerts } from "../../../../../../../drizzle/schema";
import { getUserProAccess } from "~/server/crypto-helper/user-access";
import { verifyAuth } from "~/utils/auth";

function toFlag(v: unknown): number | undefined {
  if (v === undefined) return undefined;
  if (v === true || v === "true" || v === 1 || v === "1") return 1;
  if (v === false || v === "false" || v === 0 || v === "0") return 0;
  return undefined;
}

export const onDelete: RequestHandler = async (ev) => {
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

  const id = Number(ev.params.id);
  if (!Number.isFinite(id) || id < 1) {
    ev.json(400, { ok: false, error: "Invalid id" });
    return;
  }

  const del = await db
    .delete(userPriceAlerts)
    .where(and(eq(userPriceAlerts.id, id), eq(userPriceAlerts.userId, userId)))
    .returning({ id: userPriceAlerts.id });

  if (!del.length) {
    ev.json(404, { ok: false, error: "Not found" });
    return;
  }

  ev.json(200, { ok: true });
};

export const onPatch: RequestHandler = async (ev) => {
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

  const id = Number(ev.params.id);
  if (!Number.isFinite(id) || id < 1) {
    ev.json(400, { ok: false, error: "Invalid id" });
    return;
  }

  const body = (await ev.parseBody()) as Record<string, unknown> | undefined;
  const en = toFlag(body?.enabled);
  const rawTh = body?.thresholdUsd;
  const thNum =
    rawTh === undefined
      ? undefined
      : typeof rawTh === "number"
        ? rawTh
        : typeof rawTh === "string"
          ? Number(rawTh.replace(/,/g, ""))
          : NaN;

  const patch: { enabled?: number; thresholdUsd?: string } = {};
  if (en !== undefined) patch.enabled = en;
  if (rawTh !== undefined) {
    if (!Number.isFinite(thNum) || (thNum as number) <= 0) {
      ev.json(400, { ok: false, error: "Invalid thresholdUsd" });
      return;
    }
    patch.thresholdUsd = String(thNum);
  }

  if (!Object.keys(patch).length) {
    ev.json(400, { ok: false, error: "No valid fields" });
    return;
  }

  const upd = await db
    .update(userPriceAlerts)
    .set(patch)
    .where(and(eq(userPriceAlerts.id, id), eq(userPriceAlerts.userId, userId)))
    .returning();

  if (!upd.length) {
    ev.json(404, { ok: false, error: "Not found" });
    return;
  }

  ev.json(200, { ok: true, alert: upd[0] });
};
