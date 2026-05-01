import type { RequestHandler } from "@builder.io/qwik-city";
import { clampLimit, getLatestSyncRun, queryRecentSyncRuns } from "~/server/crypto-helper/market-queries";

export const onGet: RequestHandler = async ({ query, json }) => {
  const latest = await getLatestSyncRun();
  const histN = clampLimit(
    query.get("history") ? Number(query.get("history")) : undefined,
    20,
  );
  const history = await queryRecentSyncRuns(Math.min(histN, 50));
  json(200, { ok: true, latest, history });
};
