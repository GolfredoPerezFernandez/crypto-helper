type SmartMoneySection =
  | "netflow"
  | "holdings"
  | "historical-holdings"
  | "dex-trades"
  | "perp-trades"
  | "dcas";

export type NansenTgmPnlRow = {
  trader_address?: string;
  trader_address_label?: string;
  pnl_usd_realised?: number;
  pnl_usd_unrealised?: number;
  pnl_usd_total?: number;
  roi_percent_realised?: number;
  roi_percent_unrealised?: number;
  roi_percent_total?: number;
  holding_usd?: number;
  nof_trades?: number;
  [k: string]: unknown;
};

type NansenSmartMoneyResult =
  | {
      ok: true;
      status: number;
      data: unknown;
      creditsUsed?: string;
      creditsRemaining?: string;
    }
  | {
      ok: false;
      status: number;
      error: string;
      creditsUsed?: string;
      creditsRemaining?: string;
    };

const NANSEN_BASE_URL = "https://api.nansen.ai";

const SMART_MONEY_ENDPOINTS: Record<SmartMoneySection, string> = {
  netflow: "/api/v1/smart-money/netflow",
  holdings: "/api/v1/smart-money/holdings",
  "historical-holdings": "/api/v1/smart-money/historical-holdings",
  "dex-trades": "/api/v1/smart-money/dex-trades",
  "perp-trades": "/api/v1/smart-money/perp-trades",
  dcas: "/api/v1/smart-money/dcas",
};

function nansenNetErr(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function readHeaderCredits(res: Response): {
  creditsUsed?: string;
  creditsRemaining?: string;
} {
  const creditsUsed = res.headers.get("x-nansen-credits-used") ?? undefined;
  const creditsRemaining = res.headers.get("x-nansen-credits-remaining") ?? undefined;
  return { creditsUsed, creditsRemaining };
}

function parseSection(raw: string | null | undefined): SmartMoneySection | null {
  const v = String(raw ?? "").trim().toLowerCase();
  if (!v) return null;
  if (v in SMART_MONEY_ENDPOINTS) return v as SmartMoneySection;
  return null;
}

function defaultHistoricalDateRange() {
  const to = new Date();
  const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export function getDefaultSmartMoneyRequest(section: SmartMoneySection): Record<string, unknown> {
  switch (section) {
    case "netflow":
      return {
        chains: ["ethereum"],
        pagination: { page: 1, per_page: 25 },
        order_by: [{ field: "net_flow_7d_usd", direction: "DESC" }],
      };
    case "holdings":
      return {
        chains: ["ethereum"],
        pagination: { page: 1, per_page: 25 },
        order_by: [{ field: "value_usd", direction: "DESC" }],
      };
    case "historical-holdings":
      return {
        chains: ["ethereum"],
        date_range: defaultHistoricalDateRange(),
        pagination: { page: 1, per_page: 25 },
        order_by: [
          { field: "date", direction: "DESC" },
          { field: "value_usd", direction: "DESC" },
        ],
      };
    case "dex-trades":
      return {
        chains: ["ethereum"],
        pagination: { page: 1, per_page: 25 },
        order_by: [{ field: "block_timestamp", direction: "DESC" }],
      };
    case "perp-trades":
      return {
        pagination: { page: 1, per_page: 25 },
        order_by: [{ field: "block_timestamp", direction: "DESC" }],
      };
    case "dcas":
      return {
        pagination: { page: 1, per_page: 25 },
        order_by: [{ field: "dca_created_at", direction: "DESC" }],
      };
  }
}

function withRequiredDefaults(
  section: SmartMoneySection,
  payload: unknown,
): Record<string, unknown> {
  const defaults = getDefaultSmartMoneyRequest(section);
  if (!isRecord(payload)) return defaults;
  const merged: Record<string, unknown> = { ...defaults, ...payload };

  if (
    (section === "netflow" ||
      section === "holdings" ||
      section === "historical-holdings" ||
      section === "dex-trades") &&
    !Array.isArray(merged.chains)
  ) {
    merged.chains = defaults.chains;
  }
  if (section === "historical-holdings" && !isRecord(merged.date_range)) {
    merged.date_range = defaults.date_range;
  }
  return merged;
}

export async function fetchNansenSmartMoney(
  section: SmartMoneySection,
  payload?: unknown,
): Promise<NansenSmartMoneyResult> {
  try {
    const key = process.env.NANSEN_API_KEY?.trim();
    if (!key) return { ok: false, status: 500, error: "Missing NANSEN_API_KEY" };

    const endpoint = SMART_MONEY_ENDPOINTS[section];
    const url = `${NANSEN_BASE_URL}${endpoint}`;
    const body = withRequiredDefaults(section, payload);
    const res = await fetch(url, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        apiKey: key,
      },
      body: JSON.stringify(body),
    });
    const creditMeta = readHeaderCredits(res);

    if (!res.ok) {
      let error = `HTTP ${res.status}`;
      try {
        const txt = (await res.text()).trim();
        if (txt) error = txt.length > 280 ? `${txt.slice(0, 280)}...` : txt;
      } catch {
        // keep fallback status error
      }
      return { ok: false, status: res.status, error, ...creditMeta };
    }

    const json = await res.json();
    return { ok: true, status: res.status, data: json, ...creditMeta };
  } catch (e) {
    return { ok: false, status: 500, error: nansenNetErr(e) };
  }
}

export type { SmartMoneySection };
export { parseSection };

type NansenTgmResult =
  | {
      ok: true;
      status: number;
      rows: NansenTgmPnlRow[];
      creditsUsed?: string;
      creditsRemaining?: string;
    }
  | {
      ok: false;
      status: number;
      error: string;
      creditsUsed?: string;
      creditsRemaining?: string;
    };

function isoDateDaysAgo(days: number): string {
  const ms = Math.max(1, Math.floor(days)) * 24 * 60 * 60 * 1000;
  return new Date(Date.now() - ms).toISOString();
}

/**
 * Token God Mode: PnL leaderboard by token.
 * Endpoint: POST /api/v1/tgm/pnl-leaderboard
 */
export async function fetchNansenTgmPnlLeaderboard(opts: {
  chain: string;
  tokenAddress: string;
  days?: number;
  perPage?: number;
  page?: number;
  premiumLabels?: boolean;
}): Promise<NansenTgmResult> {
  try {
    const key = process.env.NANSEN_API_KEY?.trim();
    if (!key) return { ok: false, status: 500, error: "Missing NANSEN_API_KEY" };
    const chain = String(opts.chain || "ethereum").trim().toLowerCase();
    const tokenAddress = String(opts.tokenAddress || "").trim().toLowerCase();
    if (!/^0x[a-f0-9]{40}$/.test(tokenAddress)) {
      return { ok: false, status: 400, error: "Invalid token address for Nansen TGM" };
    }
    const days = Math.max(1, Math.min(365, Math.floor(Number(opts.days) || 30)));
    const perPage = Math.max(1, Math.min(100, Math.floor(Number(opts.perPage) || 100)));
    const page = Math.max(1, Math.floor(Number(opts.page) || 1));
    const to = new Date().toISOString();
    const from = isoDateDaysAgo(days);

    const body: Record<string, unknown> = {
      chain,
      token_address: tokenAddress,
      date: { from, to },
      pagination: { page, per_page: perPage },
      order_by: [{ field: "pnl_usd_realised", direction: "DESC" }],
    };
    if (typeof opts.premiumLabels === "boolean") {
      body.premium_labels = opts.premiumLabels;
    }

    const res = await fetch(`${NANSEN_BASE_URL}/api/v1/tgm/pnl-leaderboard`, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        apiKey: key,
      },
      body: JSON.stringify(body),
    });
    const creditMeta = readHeaderCredits(res);
    if (!res.ok) {
      let error = `HTTP ${res.status}`;
      try {
        const txt = (await res.text()).trim();
        if (txt) error = txt.length > 280 ? `${txt.slice(0, 280)}...` : txt;
      } catch {
        // keep fallback
      }
      return { ok: false, status: res.status, error, ...creditMeta };
    }
    const json = (await res.json()) as { data?: unknown };
    const rows = Array.isArray(json?.data) ? (json.data as NansenTgmPnlRow[]) : [];
    return { ok: true, status: res.status, rows, ...creditMeta };
  } catch (e) {
    return { ok: false, status: 500, error: nansenNetErr(e) };
  }
}

export type NansenTgmEndpoint =
  | "token-information"
  | "indicators"
  | "token-ohlcv"
  | "who-bought-sold"
  | "transfers"
  | "perp-pnl-leaderboard"
  | "token-screener";

const NANSEN_TGM_ENDPOINTS: Record<NansenTgmEndpoint, string> = {
  "token-information": "/api/v1/tgm/token-information",
  indicators: "/api/v1/tgm/indicators",
  "token-ohlcv": "/api/v1/tgm/token-ohlcv",
  "who-bought-sold": "/api/v1/tgm/who-bought-sold",
  transfers: "/api/v1/tgm/transfers",
  "perp-pnl-leaderboard": "/api/v1/tgm/perp-pnl-leaderboard",
  "token-screener": "/api/v1/token-screener",
};

export function parseTgmEndpoint(raw: string | null | undefined): NansenTgmEndpoint | null {
  const v = String(raw ?? "").trim().toLowerCase();
  if (!v) return null;
  if (v in NANSEN_TGM_ENDPOINTS) return v as NansenTgmEndpoint;
  return null;
}

type NansenTgmGenericResult =
  | {
      ok: true;
      status: number;
      data: unknown;
      creditsUsed?: string;
      creditsRemaining?: string;
    }
  | {
      ok: false;
      status: number;
      error: string;
      creditsUsed?: string;
      creditsRemaining?: string;
    };

function defaultDateRange(days: number = 30) {
  const to = new Date().toISOString();
  const from = isoDateDaysAgo(days);
  return { from, to };
}

export function getDefaultTgmRequest(
  endpoint: NansenTgmEndpoint,
  opts?: {
    chain?: string;
    tokenAddress?: string;
    timeframe?: string;
    tokenSymbol?: string;
  },
): Record<string, unknown> {
  const chain = String(opts?.chain || "ethereum").toLowerCase();
  const tokenAddress = String(opts?.tokenAddress || "").toLowerCase();
  const timeframe = String(opts?.timeframe || "24h");
  const tokenSymbol = String(opts?.tokenSymbol || "ETH").toUpperCase();

  switch (endpoint) {
    case "token-information":
      return { chain, token_address: tokenAddress, timeframe: timeframe === "24h" ? "1d" : timeframe };
    case "indicators":
      return { chain, token_address: tokenAddress };
    case "token-ohlcv":
      return { chain, token_address: tokenAddress, timeframe: "1h", date: defaultDateRange(7) };
    case "who-bought-sold":
      return {
        chain,
        token_address: tokenAddress,
        buy_or_sell: "BUY",
        date: defaultDateRange(7),
        pagination: { page: 1, per_page: 50 },
        order_by: [{ field: "bought_volume_usd", direction: "DESC" }],
      };
    case "transfers":
      return {
        chain,
        token_address: tokenAddress,
        date: defaultDateRange(7),
        pagination: { page: 1, per_page: 50 },
        filters: { only_smart_money: true, include_cex: true, include_dex: true },
        order_by: [{ field: "transfer_value_usd", direction: "DESC" }],
      };
    case "perp-pnl-leaderboard":
      return {
        token_symbol: tokenSymbol,
        date: defaultDateRange(7),
        pagination: { page: 1, per_page: 50 },
        premium_labels: true,
        order_by: [{ field: "pnl_usd_realised", direction: "DESC" }],
      };
    case "token-screener":
      return {
        chains: [chain],
        timeframe: "24h",
        pagination: { page: 1, per_page: 50 },
        order_by: [{ field: "netflow", direction: "DESC" }],
      };
  }
}

export async function fetchNansenTgm(
  endpoint: NansenTgmEndpoint,
  payload: unknown,
): Promise<NansenTgmGenericResult> {
  try {
    const key = process.env.NANSEN_API_KEY?.trim();
    if (!key) return { ok: false, status: 500, error: "Missing NANSEN_API_KEY" };
    const path = NANSEN_TGM_ENDPOINTS[endpoint];
    const res = await fetch(`${NANSEN_BASE_URL}${path}`, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        apiKey: key,
      },
      body: JSON.stringify(payload),
    });
    const creditMeta = readHeaderCredits(res);
    if (!res.ok) {
      let error = `HTTP ${res.status}`;
      try {
        const txt = (await res.text()).trim();
        if (txt) error = txt.length > 280 ? `${txt.slice(0, 280)}...` : txt;
      } catch {
        // noop
      }
      return { ok: false, status: res.status, error, ...creditMeta };
    }
    const json = await res.json();
    return { ok: true, status: res.status, data: json, ...creditMeta };
  } catch (e) {
    return { ok: false, status: 500, error: nansenNetErr(e) };
  }
}
