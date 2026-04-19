import type { RequestHandler } from "@builder.io/qwik-city";
import {
  MARKET_CATEGORIES,
  getMarketTokenBySlug,
  isMarketCategory,
} from "~/server/crypto-ghost/market-queries";

export const onGet: RequestHandler = async ({ params, json }) => {
  const category = params.category || "";
  const slug = decodeURIComponent(params.slug || "").trim();
  if (!isMarketCategory(category)) {
    json(400, {
      error: "invalid category",
      allowed: [...MARKET_CATEGORIES],
    });
    return;
  }
  if (!slug) {
    json(400, { error: "slug required" });
    return;
  }
  const item = await getMarketTokenBySlug(category, slug);
  if (!item) {
    json(404, { error: "not found" });
    return;
  }
  json(200, { ok: true, item });
};
