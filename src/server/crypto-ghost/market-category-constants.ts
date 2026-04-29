/** Pure constants for market categories — no DB / Turso (safe for client route modules). */

export const MARKET_CATEGORIES = [
  "memes",
  "ai-big-data",
  "gaming",
  "mineable",
  "volume",
  "trending",
  "most-visited",
  "earlybird",
] as const;
export type MarketCategory = (typeof MARKET_CATEGORIES)[number];

/** Route segment under `/{locale}/*` for each category (token detail “back” links). */
export const CATEGORY_DASHBOARD_PATH: Record<string, string> = {
  memes: "meme-coins",
  "ai-big-data": "ai-coins",
  gaming: "gaming-coins",
  mineable: "mineable-coins",
  volume: "volume-coins",
  trending: "trending-coins",
  "most-visited": "most-visit-coins",
  earlybird: "earlybird-coins",
};

export function isMarketCategory(s: string): s is MarketCategory {
  return (MARKET_CATEGORIES as readonly string[]).includes(s);
}

/** Short labels for filters and token cards (EN). */
export const MARKET_CATEGORY_LABEL: Record<string, string> = {
  memes: "Meme",
  "ai-big-data": "AI & big data",
  gaming: "Gaming",
  mineable: "Mineable",
  volume: "Top volume",
  trending: "Trending",
  "most-visited": "Most visited",
  earlybird: "New listings",
};
