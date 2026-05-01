type NftContractQuery = {
  chain: string;
  limit: number;
  cursor?: string;
  format: "decimal" | "hex";
  normalizeMetadata: boolean;
  media_items: boolean;
  include_prices: boolean;
  totalRanges?: number;
  range?: number;
};

export function parseNftContractQuery(query: URLSearchParams): NftContractQuery {
  const chain = (query.get("chain")?.trim() || "base").toLowerCase();
  const limit = Math.min(100, Math.max(1, Number(query.get("limit") || 40) || 40));
  const cursor = query.get("cursor")?.trim() || undefined;
  const format = query.get("format")?.trim().toLowerCase() === "hex" ? "hex" : "decimal";
  const normalizeMetadata = query.get("normalizeMetadata") !== "false";
  const media_items = query.get("media_items") === "true";
  const include_prices = query.get("include_prices") === "true";
  const tr = query.get("totalRanges");
  const totalRangesRaw = tr != null && tr !== "" ? Number(tr) : undefined;
  const rg = query.get("range");
  const rangeRaw = rg != null && rg !== "" ? Number(rg) : undefined;
  const totalRanges =
    Number.isFinite(totalRangesRaw) && (totalRangesRaw as number) >= 1 ? totalRangesRaw : undefined;
  const range = Number.isFinite(rangeRaw) && (rangeRaw as number) >= 1 ? rangeRaw : undefined;
  return {
    chain,
    limit,
    cursor,
    format,
    normalizeMetadata,
    media_items,
    include_prices,
    totalRanges,
    range,
  };
}
