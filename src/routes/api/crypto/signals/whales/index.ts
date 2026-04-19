import type { RequestHandler } from "@builder.io/qwik-city";
import { clampLimit, queryWhaleSignals } from "~/server/crypto-ghost/market-queries";
import { getUserProAccess } from "~/server/crypto-ghost/user-access";
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
  const limit = clampLimit(
    ev.query.get("limit") ? Number(ev.query.get("limit")) : undefined,
    100,
  );
  const items = await queryWhaleSignals(limit);
  ev.json(200, { ok: true, count: items.length, limit, items });
};
