import type { SyncUsagePayloadV1 } from "~/server/crypto-helper/sync-usage-context";

function parseUsagePayload(raw: string | null | undefined): SyncUsagePayloadV1 | null {
  if (!raw?.trim()) return null;
  try {
    const j = JSON.parse(raw) as SyncUsagePayloadV1;
    return j && j.v === 1 ? j : null;
  } catch {
    return null;
  }
}

/** One block per external API (dashboard historial). */
export type SyncUsageBreakdownLine = {
  provider: string;
  primary: string;
  secondary?: string;
};

function fmtInt(n: number): string {
  return Math.round(n).toLocaleString();
}

/**
 * Per-API usage for one sync row (CoinMarketCap, Moralis, Nansen, Icarus).
 * Only includes APIs with measurable usage in the payload.
 */
export function getSyncUsageBreakdown(
  raw: string | null | undefined,
  lang: "es" | "en",
): { lines: SyncUsageBreakdownLine[]; tooltip: string } {
  const u = parseUsagePayload(raw);
  if (!u) return { lines: [], tooltip: "" };

  const lines: SyncUsageBreakdownLine[] = [];
  const tip: string[] = [];

  if (u.cmcHttpCalls > 0) {
    const primary =
      lang === "es"
        ? `${fmtInt(u.cmcHttpCalls)} solicitudes HTTP`
        : `${fmtInt(u.cmcHttpCalls)} HTTP requests`;
    lines.push({
      provider: "CoinMarketCap",
      primary,
      secondary:
        lang === "es"
          ? "Uso contabilizado por solicitud al API de cotizaciones / listados."
          : "Counted per request to quotes / listings API.",
    });
    tip.push(`CoinMarketCap: ${primary}`);
  }

  const moralisCu = u.moralis?.totalCuFromHeaders ?? 0;
  const moralisNoHdr = u.moralis?.callsWithNoCuHeader ?? 0;
  const moralisCallsLen = u.moralis?.calls?.length ?? 0;
  const est = u.moralisCmcPhaseCuEstimate ?? null;
  const hasMoralis =
    moralisCu > 0 || (est != null && est > 0) || moralisNoHdr > 0 || moralisCallsLen > 0;
  if (hasMoralis) {
    const parts: string[] = [];
    if (moralisCu > 0) {
      parts.push(
        lang === "es"
          ? `${fmtInt(moralisCu)} CU (cabeceras API)`
          : `${fmtInt(moralisCu)} CU (API headers)`,
      );
    }
    if (est != null && est > 0) {
      parts.push(
        lang === "es"
          ? `~${fmtInt(est)} CU est. (fase tokens)`
          : `~${fmtInt(est)} CU est. (token phase)`,
      );
    }
    let primary =
      parts.length > 0
        ? parts.join(" · ")
        : moralisNoHdr > 0
          ? lang === "es"
            ? `0 CU en cabeceras · ${fmtInt(moralisNoHdr)} llamadas sin CU`
            : `0 CU in headers · ${fmtInt(moralisNoHdr)} calls without CU`
          : moralisCallsLen > 0
            ? lang === "es"
              ? `${fmtInt(moralisCallsLen)} llamadas (detalle interno)`
              : `${fmtInt(moralisCallsLen)} calls (internal detail)`
            : "—";
    const secBits: string[] = [];
    if (moralisNoHdr > 0 && moralisCu > 0) {
      secBits.push(
        lang === "es"
          ? `${fmtInt(moralisNoHdr)} sin cabecera CU`
          : `${fmtInt(moralisNoHdr)} without CU header`,
      );
    }
    if (moralisCallsLen > 0 && moralisCu > 0) {
      secBits.push(
        lang === "es"
          ? `${fmtInt(moralisCallsLen)} respuestas con CU`
          : `${fmtInt(moralisCallsLen)} responses with CU`,
      );
    }
    lines.push({
      provider: "Moralis",
      primary,
      secondary: secBits.length ? secBits.join(" · ") : undefined,
    });
    tip.push(`Moralis: ${primary}${secBits.length ? ` · ${secBits.join(" · ")}` : ""}`);
  }

  const nansenSum = u.nansen?.totalCreditsReported;
  const nansenCalls = u.nansen?.calls?.length ?? 0;
  if ((nansenSum != null && Number.isFinite(nansenSum) && nansenSum > 0) || nansenCalls > 0) {
    const primary =
      nansenSum != null && nansenSum > 0
        ? lang === "es"
          ? `${fmtInt(nansenSum)} créditos API`
          : `${fmtInt(nansenSum)} API credits`
        : lang === "es"
          ? `${fmtInt(nansenCalls)} llamadas`
          : `${fmtInt(nansenCalls)} calls`;
    const secondary =
      nansenCalls > 0 && nansenSum != null && nansenSum > 0
        ? lang === "es"
          ? `${fmtInt(nansenCalls)} llamadas`
          : `${fmtInt(nansenCalls)} calls`
        : undefined;
    lines.push({
      provider: "Nansen",
      primary,
      secondary,
    });
    tip.push(`Nansen: ${primary}${secondary ? ` · ${secondary}` : ""}`);
  }

  if (u.icarusHttpCalls > 0) {
    const primary =
      lang === "es"
        ? `${fmtInt(u.icarusHttpCalls)} solicitudes HTTP`
        : `${fmtInt(u.icarusHttpCalls)} HTTP requests`;
    lines.push({
      provider: "Icarus",
      primary,
      secondary:
        lang === "es"
          ? "Ranking / swaps agregados en esta corrida."
          : "Trader swap aggregation in this run.",
    });
    tip.push(`Icarus: ${primary}`);
  }

  if (u.notes?.length) {
    for (const note of u.notes) {
      tip.push(note);
    }
  }

  return { lines, tooltip: tip.join("\n") };
}

/** Compact single line (toolbars, exports). */
/** Llamadas HTTP agregadas durante la corrida (payload nuevo); filas viejas → — */
export function formatHttpEndpointsCell(
  raw: string | null | undefined,
  lang: "es" | "en",
): { text: string; title: string } {
  const u = parseUsagePayload(raw);
  const h = u?.httpEndpoints;
  if (!h) return { text: "—", title: "" };
  const total = h.ok + h.fail;
  if (total === 0) return { text: "—", title: "" };
  return {
    text: `${h.ok} / ${total}`,
    title:
      lang === "es"
        ? `${h.ok} respuestas OK · ${h.fail} con error o HTTP no exitoso (${total} llamadas)`
        : `${h.ok} OK responses · ${h.fail} errors or non-success HTTP (${total} calls)`,
  };
}

export function formatSyncUsageSummaryForRow(
  raw: string | null | undefined,
  lang: "es" | "en",
): { text: string; title: string } {
  const { lines, tooltip } = getSyncUsageBreakdown(raw, lang);
  if (lines.length === 0) return { text: "—", title: "" };
  const text = lines.map((l) => `${l.provider}: ${l.primary}`).join(" · ");
  return { text, title: tooltip || text };
}
