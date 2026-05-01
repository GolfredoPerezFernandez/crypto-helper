import type { RequestHandler } from "@builder.io/qwik-city";
import { MARKET_CATEGORIES } from "~/server/crypto-helper/market-queries";

export const onGet: RequestHandler = async ({ json }) => {
  json(200, { ok: true, categories: [...MARKET_CATEGORIES] });
};
