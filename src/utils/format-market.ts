/**
 * Human-readable USD formatting for cached CMC / on-chain snapshot numbers.
 * Avoids scientific notation and trims noise from DB string decimals.
 */

function toNum(input: number | string | null | undefined): number | null {
  if (input === null || input === undefined || input === "") return null;
  const n = typeof input === "string" ? Number(input.trim()) : input;
  return Number.isFinite(n) ? n : null;
}

/** Single-token USD price (e.g. PEPE). No $ prefix. */
export function formatTokenUsdPrice(input: number | string | null | undefined): string {
  const n = toNum(input);
  if (n === null) return "—";
  if (n === 0) return "0";

  const abs = Math.abs(n);

  const priceFmt = {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    useGrouping: "always" as const,
  };

  if (abs >= 1000) {
    return n.toLocaleString(undefined, priceFmt);
  }
  if (abs >= 1) {
    /* Same style as muchas apps: 2 decimales para precios “normales” (ej. TAO ~334,42). */
    return n.toLocaleString(undefined, priceFmt);
  }
  if (abs >= 0.01) {
    return n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 6 });
  }

  /* Sub-cent: pocas cifras significativas para no llenar la tarjeta (ej. CHEEMS). */
  return n.toLocaleString(undefined, {
    maximumSignificantDigits: 6,
    minimumSignificantDigits: 1,
  });
}

/** 24h volume, FDV, market cap–scale USD amounts. Includes $ prefix. */
export function formatUsdLiquidity(input: number | string | null | undefined): string {
  const n = toNum(input);
  if (n === null) return "—";
  if (n === 0) return "$0";

  const abs = Math.abs(n);
  const prefix = "$";

  /* Intl "compact" en es-ES produce p. ej. "36,51 mil M" (mil millones); en tablas crypto suele leerse mejor B/M. */
  if (abs >= 1_000_000_000) {
    const v = n / 1_000_000_000;
    return (
      prefix +
      v.toLocaleString(undefined, {
        maximumFractionDigits: 2,
        minimumFractionDigits: 0,
        useGrouping: "always",
      }) +
      " B"
    );
  }
  if (abs >= 1_000_000) {
    const v = n / 1_000_000;
    return (
      prefix +
      v.toLocaleString(undefined, {
        maximumFractionDigits: 2,
        minimumFractionDigits: 0,
        useGrouping: "always",
      }) +
      " M"
    );
  }

  if (abs >= 1) {
    return (
      prefix +
      n.toLocaleString(undefined, {
        maximumFractionDigits: abs >= 100 ? 0 : 2,
        minimumFractionDigits: 0,
      })
    );
  }

  return prefix + n.toLocaleString(undefined, { maximumFractionDigits: 6, minimumFractionDigits: 0 });
}

/** Wallet / portfolio USD totals (grouping + decimals). Uses en-US so UI does not mix `1.234,56` vs `$1,234.56`. */
export function formatUsdBalance(input: number | string | null | undefined): string {
  const n = toNum(input);
  if (n === null) return "—";
  return new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);
}

/** Wallet PnL / net worth: above this absolute value is treated as bad API data (avoids absurd UI). */
export const MAX_PLAUSIBLE_WALLET_USD = 1e15;

/**
 * Snapshot / API USD fields: may be number, or string with `,` or EU-style `1.234,56`.
 */
export function parseWalletUsdField(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  if (typeof raw === "number") {
    if (!Number.isFinite(raw)) return null;
    if (Math.abs(raw) > MAX_PLAUSIBLE_WALLET_USD) return null;
    return raw;
  }
  let s = String(raw).trim().replace(/\s/g, "");
  if (s === "" || s === "—") return null;
  s = s.replace(/^\$/, "").replace(/^USD/i, "").trim();
  /*
   * EU thousands: `1.234.567,89` or `1.234.567`. Do not treat `-157.195` as EU (that is US decimal −157.195).
   * Require either a comma decimal part, or at least two `.\d{3}` thousand groups.
   * Simple EU cents: `1234,56` (no `.` thousands) — not `1,234` US-style (handled below).
   */
  const euSimpleCents = /^-?\d+,\d{2}$/;
  const euWithCommaDecimal = /^-?\d{1,3}(\.\d{3})*,\d{1,6}$/;
  const euMultiGroup = /^-?\d{1,3}(\.\d{3}){2,}(,\d+)?$/;
  if (euSimpleCents.test(s) && !s.includes(".")) {
    s = s.replace(",", ".");
  } else if (euWithCommaDecimal.test(s) || euMultiGroup.test(s)) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else {
    s = s.replace(/,/g, "");
  }
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  if (Math.abs(n) > MAX_PLAUSIBLE_WALLET_USD) return null;
  return n;
}

/**
 * Watchlist / small cards: compact currency for large |USD| (avoids layout break from absurd API values).
 * Always en-US + narrow $ so locale never yields `USD-157.195,18`-style output.
 */
export function formatUsdWalletCard(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  const a = Math.abs(n);
  if (a > MAX_PLAUSIBLE_WALLET_USD) return "—";
  const fmtCompact: Intl.NumberFormatOptions = {
    style: "currency",
    currency: "USD",
    currencyDisplay: "narrowSymbol",
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: 2,
    maximumSignificantDigits: 5,
  };
  const fmtStandard: Intl.NumberFormatOptions = {
    style: "currency",
    currency: "USD",
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  };
  if (a >= 1_000_000) {
    return new Intl.NumberFormat("en-US", fmtCompact).format(n);
  }
  return new Intl.NumberFormat("en-US", fmtStandard).format(n);
}

/** Parse CMC / DB percent strings ("1.23", "-4.5%", "1,2"). */
export function parsePercentNumber(raw: number | string | null | undefined): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  const s = String(raw).replace(/%/g, "").replace(/,/g, ".").trim();
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** e.g. +2.34% / −0.5% for token cards. */
export function formatSignedPercent(raw: number | string | null | undefined, maxDecimals = 2): string {
  const n = parsePercentNumber(raw);
  if (n === null) return "—";
  const sign = n > 0 ? "+" : "";
  const body = n.toLocaleString(undefined, {
    maximumFractionDigits: maxDecimals,
    minimumFractionDigits: 0,
  });
  return `${sign}${body}%`;
}

export function percentToneClass(raw: number | string | null | undefined): string {
  const n = parsePercentNumber(raw);
  if (n === null) return "text-gray-500";
  if (n === 0) return "text-gray-400";
  return n > 0 ? "text-emerald-400" : "text-rose-400";
}

/** Large ERC-20 supply: compact when huge, else grouped integer. */
export function formatTokenSupply(input: number | string | null | undefined): string {
  const n = toNum(input);
  if (n === null) return "—";
  const abs = Math.abs(n);
  if (abs >= 1e15) return n.toExponential(3);
  if (abs >= 1e12)
    return (
      (n / 1e12).toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 0 }) + " T"
    );
  if (abs >= 1e9)
    return (
      (n / 1e9).toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 0 }) + " B"
    );
  if (abs >= 1e6)
    return (
      (n / 1e6).toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 0 }) + " M"
    );
  return n.toLocaleString(undefined, { maximumFractionDigits: 2, maximumSignificantDigits: 12 });
}
