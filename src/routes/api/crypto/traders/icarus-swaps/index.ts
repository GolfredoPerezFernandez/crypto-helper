import type { RequestHandler } from "@builder.io/qwik-city";
import {
  getGlobalSnapshotJson,
  GLOBAL_ICARUS_TOP_USERS,
} from "~/server/crypto-helper/api-snapshot-sync";
import type { IcarusTopUser } from "~/server/crypto-helper/icarus-top-users";

export const onGet: RequestHandler = async ({ query, json }) => {
  const limit = Math.min(100, Math.max(1, parseInt(query.get("limit") || "40", 10) || 40));
  const offset = Math.max(0, parseInt(query.get("offset") || "0", 10) || 0);

  const cached = await getGlobalSnapshotJson<{ traders: IcarusTopUser[] } | null>(GLOBAL_ICARUS_TOP_USERS);
  if (!cached?.traders) {
    json(503, {
      ok: false,
      error: "No Icarus snapshot — run daily sync to populate api_global_snapshots.",
    });
    return;
  }

  const traders = cached.traders.slice(offset, offset + limit);
  json(200, { ok: true, count: traders.length, limit, offset, traders });
};
