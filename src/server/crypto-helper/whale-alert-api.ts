/**
 * Whale Alert — Enterprise (leviathan) + deprecated v1 helpers.
 * API key: WHALE_ALERT_API_KEY (server-only). Never log full URLs with api_key.
 */
import { syncLogApi } from "~/server/crypto-helper/sync-logger";

export const WHALE_ALERT_LEVIATHAN_BASE = "https://leviathan.whale-alert.io";
export const WHALE_ALERT_DEPRECATED_V1 = "https://api.whale-alert.io/v1";

export type WhaleAlertFetchRow = {
  id: string;
  method: "GET";
  /** Path + query without api_key (safe to display). */
  pathLabel: string;
  ok: boolean;
  status: number;
  /** Parsed JSON or short text snippet on failure. */
  body?: unknown;
  error?: string;
};

function getApiKey(): string | undefined {
  return process.env.WHALE_ALERT_API_KEY?.trim();
}

async function fetchJson(
  id: string,
  url: string,
  pathLabel: string,
): Promise<WhaleAlertFetchRow> {
  const t0 = Date.now();
  try {
    const msRaw = Number(process.env.WHALE_ALERT_FETCH_TIMEOUT_MS ?? 45_000);
    const timeoutMs = Math.min(120_000, Number.isFinite(msRaw) ? msRaw : 45_000);
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: ctrl.signal,
    }).finally(() => clearTimeout(to));
    const ms = Date.now() - t0;
    syncLogApi(`WhaleAlert:${id}`, res.ok ? "ok" : "fail", ms, {
      status: res.status,
      path: pathLabel,
    });
    const text = await res.text();
    let body: unknown = text;
    try {
      body = JSON.parse(text) as unknown;
    } catch {
      body = { _raw: text.slice(0, 800) };
    }
    if (!res.ok) {
      const errMsg =
        body && typeof body === "object" && body !== null && "error" in body
          ? String((body as { error?: unknown }).error)
          : text.slice(0, 200);
      return {
        id,
        method: "GET",
        pathLabel,
        ok: false,
        status: res.status,
        body,
        error: errMsg,
      };
    }
    return { id, method: "GET", pathLabel, ok: true, status: res.status, body };
  } catch (e: unknown) {
    const ms = Date.now() - t0;
    syncLogApi(`WhaleAlert:${id}`, "fail", ms, {
      path: pathLabel,
      error: e instanceof Error ? e.message : String(e),
    });
    return {
      id,
      method: "GET",
      pathLabel,
      ok: false,
      status: 0,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

function leviathanUrl(pathWithQuery: string): { url: string; label: string } {
  const key = getApiKey();
  if (!key) throw new Error("missing WHALE_ALERT_API_KEY");
  const path = pathWithQuery.startsWith("/") ? pathWithQuery : `/${pathWithQuery}`;
  const u = new URL(`${WHALE_ALERT_LEVIATHAN_BASE}${path}`);
  u.searchParams.set("api_key", key);
  const label = `${u.pathname}${u.search.replace(/api_key=[^&]+/i, "api_key=(redacted)")}`;
  return { url: u.toString(), label };
}

function deprecatedUrl(pathWithQuery: string): { url: string; label: string } {
  const key = getApiKey();
  if (!key) throw new Error("missing WHALE_ALERT_API_KEY");
  const path = pathWithQuery.startsWith("/") ? pathWithQuery : `/${pathWithQuery}`;
  const u = new URL(`${WHALE_ALERT_DEPRECATED_V1}${path}`);
  u.searchParams.set("api_key", key);
  const label = `${u.pathname}${u.search.replace(/api_key=[^&]+/i, "api_key=(redacted)")}`;
  return { url: u.toString(), label };
}

/** Best-effort block height for pagination endpoints. */
function guessStartHeight(chainStatusBody: unknown): number | null {
  const visit = (v: unknown, depth: number): number | null => {
    if (depth > 12) return null;
    if (typeof v === "number" && Number.isFinite(v) && v > 1_000) return Math.floor(v);
    if (v && typeof v === "object") {
      for (const k of ["newest", "latest", "height", "block_height", "newest_height"]) {
        const n = (v as Record<string, unknown>)[k];
        const x = visit(n, depth + 1);
        if (x != null) return x;
      }
      for (const x of Object.values(v as Record<string, unknown>)) {
        const h = visit(x, depth + 1);
        if (h != null) return h;
      }
    }
    if (Array.isArray(v)) {
      for (const x of v) {
        const h = visit(x, depth + 1);
        if (h != null) return h;
      }
    }
    return null;
  };
  const h = visit(chainStatusBody, 0);
  if (h == null) return null;
  return Math.max(1, h - 50);
}

/**
 * Fetches a representative set of Enterprise + deprecated endpoints for caching (daily sync).
 * Optional env:
 * - WHALE_ALERT_SYNC_CHAINS — comma list (default "ethereum,bitcoin")
 * - WHALE_ALERT_SAMPLE_TX — "{chain}/{hash}" e.g. ethereum/0x...
 * - WHALE_ALERT_SAMPLE_ADDRESS — address for /{chain}/address/{hash}/transactions
 * - WHALE_ALERT_SAMPLE_CHAIN_FOR_ADDRESS — default "bitcoin"
 */
export async function fetchWhaleAlertBundleForSync(): Promise<{
  syncedAt: number;
  configured: boolean;
  results: WhaleAlertFetchRow[];
  websocket: {
    urlPublic: string;
    subscribeAlertsExample: Record<string, unknown>;
    subscribeSocialsExample: Record<string, unknown>;
  };
  notes: string[];
}> {
  const syncedAt = Math.floor(Date.now() / 1000);
  const notes: string[] = [
    "Datos obtenidos en el sync diario; esta página no llama a Whale Alert al cargar.",
    "WebSocket (alertas en vivo): wss://leviathan.whale-alert.io/ws?api_key=TU_KEY — usar solo en servidor o app segura.",
    "Endpoints Compliance (owner_attributions) pueden responder 403 sin plan Compliance.",
  ];
  const key = getApiKey();
  if (!key) {
    return {
      syncedAt,
      configured: false,
      results: [],
      websocket: {
        urlPublic: "wss://leviathan.whale-alert.io/ws?api_key=(configure WHALE_ALERT_API_KEY)",
        subscribeAlertsExample: {
          type: "subscribe_alerts",
          blockchains: ["ethereum"],
          symbols: ["eth"],
          tx_types: ["transfer"],
          min_value_usd: 1_000_000,
        },
        subscribeSocialsExample: { type: "subscribe_socials" },
      },
      notes,
    };
  }

  const results: WhaleAlertFetchRow[] = [];

  const run = async (id: string, build: () => { url: string; label: string }) => {
    const { url, label } = build();
    const row = await fetchJson(id, url, label);
    results.push(row);
    return row;
  };

  await run("enterprise_status", () => leviathanUrl("/status"));

  const chainsRaw = String(process.env.WHALE_ALERT_SYNC_CHAINS ?? "ethereum,bitcoin")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const chains = chainsRaw.length ? chainsRaw : ["ethereum", "bitcoin"];

  for (const chain of chains.slice(0, 6)) {
    const st = await run(`${chain}_chain_status`, () => leviathanUrl(`/${chain}/status`));
    const start = st.ok && st.body ? guessStartHeight(st.body) : null;
    if (start != null) {
      await run(`${chain}_transactions`, () =>
        leviathanUrl(`/${chain}/transactions?start_height=${start}&limit=12&format=1`),
      );
      const pickHeight =
        st.body && typeof st.body === "object"
          ? guessStartHeight((st.body as { newest?: unknown }).newest ?? st.body)
          : start;
      if (pickHeight != null) {
        await run(`${chain}_block_sample`, () => leviathanUrl(`/${chain}/block/${pickHeight}`));
      }
    }

    const sampleAddr = process.env.WHALE_ALERT_SAMPLE_ADDRESS?.trim();
    const addrChain = String(process.env.WHALE_ALERT_SAMPLE_CHAIN_FOR_ADDRESS ?? chain)
      .trim()
      .toLowerCase();
    if (sampleAddr && addrChain === chain && start != null) {
      await run(`${chain}_address_transactions`, () =>
        leviathanUrl(
          `/${chain}/address/${encodeURIComponent(sampleAddr)}/transactions?start_height=${start}&limit=8&format=1`,
        ),
      );
    }
  }

  const sampleTx = process.env.WHALE_ALERT_SAMPLE_TX?.trim();
  if (sampleTx?.includes("/")) {
    const [c, ...rest] = sampleTx.split("/");
    const hash = rest.join("/");
    const ch = c.trim().toLowerCase();
    if (ch && hash) {
      await run("sample_transaction", () => leviathanUrl(`/${ch}/transaction/${encodeURIComponent(hash)}`));
    }
  }

  await run("deprecated_v1_status", () => deprecatedUrl("/status"));

  const complianceAddr = process.env.WHALE_ALERT_OWNER_ATTRIBUTION_ADDRESS?.trim();
  if (complianceAddr) {
    await run("owner_attributions", () =>
      leviathanUrl(`/address/${encodeURIComponent(complianceAddr)}/owner_attributions`),
    );
  }

  return {
    syncedAt,
    configured: true,
    results,
    websocket: {
      urlPublic: "wss://leviathan.whale-alert.io/ws?api_key=(use server env WHALE_ALERT_API_KEY)",
      subscribeAlertsExample: {
        type: "subscribe_alerts",
        id: "crypto-helper-sub-1",
        blockchains: ["ethereum"],
        symbols: ["eth", "weth"],
        tx_types: ["transfer"],
        min_value_usd: 1_000_000,
      },
      subscribeSocialsExample: { type: "subscribe_socials", id: "crypto-helper-social-1" },
    },
    notes,
  };
}
