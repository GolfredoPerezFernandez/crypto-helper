/**
 * Live CoinMarketCap Pro data (not from Turso cache).
 * @see https://coinmarketcap.com/api/documentation/v1/#tag/cryptocurrency/operation/getV1CryptocurrencyQuotesLatest
 * @see https://coinmarketcap.com/api/documentation/v1/#tag/cryptocurrency/operation/getV1CryptocurrencyInfo
 */

export type CmcJsonResult = { ok: true; data: unknown } | { ok: false; error: string };

export async function fetchCmcQuotesLatestById(cmcId: number): Promise<CmcJsonResult> {
  const key = process.env.CMC_API_KEY?.trim();
  if (!key) return { ok: false, error: "Missing CMC_API_KEY" };
  if (!Number.isFinite(cmcId) || cmcId < 1) return { ok: false, error: "Invalid CMC id" };
  const url = `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?id=${cmcId}&convert=USD`;
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json", "X-CMC_PRO_API_KEY": key },
    });
    if (!res.ok) return { ok: false, error: await res.text() };
    return { ok: true, data: await res.json() };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** URLs, description, tags — optional enrichment on token page */
export async function fetchCmcInfoById(cmcId: number): Promise<CmcJsonResult> {
  const key = process.env.CMC_API_KEY?.trim();
  if (!key) return { ok: false, error: "Missing CMC_API_KEY" };
  if (!Number.isFinite(cmcId) || cmcId < 1) return { ok: false, error: "Invalid CMC id" };
  const url = `https://pro-api.coinmarketcap.com/v1/cryptocurrency/info?id=${cmcId}`;
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json", "X-CMC_PRO_API_KEY": key },
    });
    if (!res.ok) return { ok: false, error: await res.text() };
    return { ok: true, data: await res.json() };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

const QUOTES_LATEST_MAX_IDS = 120;

/**
 * Batch `quotes/latest` for bubble % (and fallback when Turso snapshot/columns are stale or zero).
 * @see https://coinmarketcap.com/api/documentation/v1/#operation/getV1CryptocurrencyQuotesLatest
 */
export async function fetchCmcQuotesUsdMapByIds(ids: number[]): Promise<Map<number, Record<string, unknown>>> {
  const out = new Map<number, Record<string, unknown>>();
  const key = process.env.CMC_API_KEY?.trim();
  if (!key || ids.length === 0) return out;
  const uniq = [...new Set(ids.filter((n) => Number.isFinite(n) && n > 0))];
  for (let i = 0; i < uniq.length; i += QUOTES_LATEST_MAX_IDS) {
    const batch = uniq.slice(i, i + QUOTES_LATEST_MAX_IDS);
    const url = `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?id=${batch.join(",")}&convert=USD`;
    let res: Response;
    try {
      res = await fetch(url, {
        headers: { Accept: "application/json", "X-CMC_PRO_API_KEY": key },
      });
    } catch (e) {
      console.warn("[CMC] quotes/latest batch fetch failed (network)", e);
      continue;
    }
    if (!res.ok) {
      try {
        console.warn("[CMC] quotes/latest batch failed", res.status, (await res.text()).slice(0, 240));
      } catch {
        console.warn("[CMC] quotes/latest batch failed", res.status);
      }
      continue;
    }
    let json: { data?: Record<string, { quote?: Record<string, unknown> }> };
    try {
      json = (await res.json()) as { data?: Record<string, { quote?: Record<string, unknown> }> };
    } catch (e) {
      console.warn("[CMC] quotes/latest batch invalid JSON", e);
      continue;
    }
    const data = json?.data;
    if (!data || typeof data !== "object") continue;
    for (const [sid, coin] of Object.entries(data)) {
      const id = Number(sid);
      if (!Number.isFinite(id)) continue;
      const q = coin?.quote;
      if (q == null || typeof q !== "object") continue;
      const qr = q as Record<string, unknown>;
      const usd = qr.USD ?? qr.usd;
      if (usd != null && typeof usd === "object") out.set(id, usd as Record<string, unknown>);
    }
  }
  return out;
}
