import { syncLogError, syncLogInfo } from "~/server/crypto-helper/sync-logger";
import { recordEndpointOutcome, recordIcarusHttpCall } from "~/server/crypto-helper/sync-usage-context";

export type IcarusTopUser = { account?: string; [key: string]: unknown };

/** Reference `api.traders-swap` — no API key in reference app. */
export async function fetchIcarusTopUsersBySwaps(
  limit: number = 40,
  offset: number = 0,
): Promise<IcarusTopUser[]> {
  const url = "https://omni.icarus.tools/ethereum/cush/topUsers";
  syncLogInfo("Icarus POST topUsers — request", { url, limit, offset });
  const t0 = Date.now();
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        params: [
          {
            limit,
            offset,
            sort_by: "tx_4h",
            sort_order: false,
            fee_tiers: [0],
          },
        ],
      }),
    });
    recordIcarusHttpCall();
    recordEndpointOutcome(res.ok);
    const ms = Date.now() - t0;
    const raw = await res.text();
    let j: { result?: unknown } = {};
    try {
      j = JSON.parse(raw) as { result?: unknown };
    } catch {
      syncLogInfo("API fail", {
        api: "Icarus POST topUsers",
        ms,
        status: res.status,
        parseError: true,
        bodyPreview: raw.slice(0, 120),
      });
      return [];
    }
    const rows = Array.isArray(j.result) ? j.result : [];
    syncLogInfo(res.ok ? "API ok" : "API fail", {
      api: "Icarus POST topUsers",
      ms,
      status: res.status,
      tradersReturned: rows.length,
    });
    return rows as IcarusTopUser[];
  } catch (e: unknown) {
    const ms = Date.now() - t0;
    recordEndpointOutcome(false);
    syncLogError("Icarus topUsers network/error", e instanceof Error ? e : { error: String(e), ms });
    return [];
  }
}
