import type { RequestHandler } from "@builder.io/qwik-city";
import {
  MARKET_CATEGORIES,
  clampLimit,
  clampOffset,
  isMarketCategory,
  queryMarketTokens,
} from "~/server/crypto-helper/market-queries";

export const onGet: RequestHandler = async ({ query, json }) => {
  const catRaw = query.get("category")?.trim() || "";
  const category = catRaw ? (isMarketCategory(catRaw) ? catRaw : null) : null;
  if (catRaw && category === null) {
    json(400, {
      error: "invalid category",
      allowed: [...MARKET_CATEGORIES],
    });
    return;
  }
  const limit = clampLimit(
    query.get("limit") ? Number(query.get("limit")) : undefined,
    100,
  );
  const offset = clampOffset(query.get("offset") ? Number(query.get("offset")) : undefined);
  const items = await queryMarketTokens({ category, limit, offset });
  json(200, {
    ok: true,
    count: items.length,
    limit,
    offset,
    category: category ?? null,
    items,
  });
};
