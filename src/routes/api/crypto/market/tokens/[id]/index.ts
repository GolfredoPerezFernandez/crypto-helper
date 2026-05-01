import type { RequestHandler } from "@builder.io/qwik-city";
import { getMarketTokenById } from "~/server/crypto-helper/market-queries";

export const onGet: RequestHandler = async ({ params, json }) => {
  const id = Number(params.id);
  if (!Number.isFinite(id) || id < 1) {
    json(400, { error: "invalid id" });
    return;
  }
  const item = await getMarketTokenById(id);
  if (!item) {
    json(404, { error: "not found" });
    return;
  }
  json(200, { ok: true, item });
};
