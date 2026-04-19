/**
 * Quote currency for Crypto Bubbles: cached CMC values are USD; we scale FDV/volume for display.
 * Fiat rates: open.er-api.com (no key). Crypto: divide USD by anchor price from the same board.
 */

export const BUBBLE_QUOTE_FIAT = [
  { id: "USD", label: "$ USD" },
  { id: "EUR", label: "\u20AC EUR" },
  { id: "GBP", label: "\u00A3 GBP" },
  { id: "BRL", label: "R$ BRL" },
  { id: "CAD", label: "C$ CAD" },
  { id: "AUD", label: "A$ AUD" },
  { id: "PLN", label: "PLN" },
  { id: "INR", label: "INR" },
  { id: "RUB", label: "RUB" },
  { id: "CHF", label: "CHF" },
  { id: "ZAR", label: "ZAR" },
  { id: "TRY", label: "TRY" },
] as const;

export const BUBBLE_QUOTE_CRYPTO = [
  { id: "BTC", label: "BTC" },
  { id: "ETH", label: "ETH" },
  { id: "SOL", label: "SOL" },
] as const;

export type BubbleQuoteId =
  | (typeof BUBBLE_QUOTE_FIAT)[number]["id"]
  | (typeof BUBBLE_QUOTE_CRYPTO)[number]["id"];

export type BubbleCryptoAnchors = { BTC: number; ETH: number; SOL: number };

const FIAT_IDS = new Set(BUBBLE_QUOTE_FIAT.map((x) => x.id));

export function isBubbleQuoteId(s: string): s is BubbleQuoteId {
  return FIAT_IDS.has(s as BubbleQuoteId) || ["BTC", "ETH", "SOL"].includes(s);
}

/** USD -> target: multiply USD amount by this factor (fiat: units per 1 USD; crypto: 1/price_usd). */
export function bubbleQuoteFactor(
  id: BubbleQuoteId,
  fxRates: Record<string, number>,
  crypto: BubbleCryptoAnchors,
): { factor: number; ok: boolean } {
  if (id === "USD") return { factor: 1, ok: true };
  if (id === "BTC") {
    const p = crypto.BTC;
    return p > 0 ? { factor: 1 / p, ok: true } : { factor: 1, ok: false };
  }
  if (id === "ETH") {
    const p = crypto.ETH;
    return p > 0 ? { factor: 1 / p, ok: true } : { factor: 1, ok: false };
  }
  if (id === "SOL") {
    const p = crypto.SOL;
    return p > 0 ? { factor: 1 / p, ok: true } : { factor: 1, ok: false };
  }
  const r = fxRates[id];
  if (r != null && Number.isFinite(r) && r > 0) return { factor: r, ok: true };
  return { factor: 1, ok: false };
}

export async function fetchUsdFiatRates(): Promise<Record<string, number>> {
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return {};
    const j = (await res.json()) as { result?: string; rates?: Record<string, number> };
    if (j.result !== "success" || !j.rates || typeof j.rates !== "object") return {};
    return j.rates;
  } catch {
    return {};
  }
}

export function extractCryptoAnchorsFromRows(
  rows: { symbol?: string | null; price?: string | null }[],
): BubbleCryptoAnchors {
  const m = new Map<string, number>();
  for (const r of rows) {
    const sym = String(r.symbol ?? "").toUpperCase();
    const px = Number(String(r.price ?? "").replace(",", ".")) || 0;
    if (sym && px > 0) m.set(sym, px);
  }
  return {
    BTC: m.get("BTC") || 0,
    ETH: m.get("ETH") || 0,
    SOL: m.get("SOL") || 0,
  };
}

/** Compact notional for tooltip / list (amount already in display quote units). */
export function formatBubbleNotional(displayAmount: number, quoteId: BubbleQuoteId): string {
  if (!Number.isFinite(displayAmount)) return "\u2014";
  const n = displayAmount;
  const abs = Math.abs(n);

  const prefix =
    quoteId === "USD"
      ? "$"
      : quoteId === "EUR"
        ? "\u20AC"
        : quoteId === "GBP"
          ? "\u00A3"
          : quoteId === "BRL"
            ? "R$"
            : quoteId === "CAD"
              ? "C$"
              : quoteId === "AUD"
                ? "A$"
                : quoteId === "INR"
                  ? "INR "
                  : quoteId === "RUB"
                    ? "RUB "
                    : quoteId === "TRY"
                      ? "TRY "
                      : "";

  const suffix =
    quoteId === "PLN"
      ? " PLN"
      : quoteId === "CHF"
        ? " CHF"
        : quoteId === "ZAR"
          ? " ZAR"
          : ["BTC", "ETH", "SOL"].includes(quoteId)
            ? ` ${quoteId}`
            : "";

  if (abs >= 1_000_000_000) {
    const v = n / 1_000_000_000;
    return (
      prefix +
      v.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 0, useGrouping: "always" }) +
      " B" +
      suffix
    );
  }
  if (abs >= 1_000_000) {
    const v = n / 1_000_000;
    return (
      prefix +
      v.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 0, useGrouping: "always" }) +
      " M" +
      suffix
    );
  }
  if (abs >= 1) {
    return (
      prefix +
      n.toLocaleString(undefined, {
        maximumFractionDigits: abs >= 100 ? 0 : 2,
        minimumFractionDigits: 0,
        useGrouping: "always",
      }) +
      suffix
    );
  }
  return (
    prefix + n.toLocaleString(undefined, { maximumFractionDigits: 6, minimumFractionDigits: 0 }) + suffix
  );
}

export function formatBubbleMetricFromUsd(
  usdAmount: number,
  quoteId: BubbleQuoteId,
  factor: number,
): string {
  return formatBubbleNotional(usdAmount * factor, quoteId);
}
