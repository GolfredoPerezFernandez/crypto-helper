import { component$ } from "@builder.io/qwik";
import { routeLoader$, useLocation } from "@builder.io/qwik-city";
import {
  fetchNansenSmartMoney,
  getDefaultSmartMoneyRequest,
  parseSection,
  type SmartMoneySection,
} from "~/server/crypto-helper/nansen-smart-money";
import {
  getGlobalSnapshotJson,
  GLOBAL_NANSEN_SMART_MONEY_DCAS,
  GLOBAL_NANSEN_SMART_MONEY_DEX_TRADES,
  GLOBAL_NANSEN_SMART_MONEY_HIST_HOLDINGS,
  GLOBAL_NANSEN_SMART_MONEY_HOLDINGS,
  GLOBAL_NANSEN_SMART_MONEY_NETFLOW,
  GLOBAL_NANSEN_SMART_MONEY_PERP_TRADES,
} from "~/server/crypto-helper/api-snapshot-sync";
import { useRequirePro } from "../use-require-pro";
export { useRequirePro };

type SmartMoneyLoaderRow = Record<string, unknown>;

const SMART_MONEY_SECTIONS: { id: SmartMoneySection; label: string; subtitle: string }[] = [
  {
    id: "netflow",
    label: "Flujos netos",
    subtitle: "Flujos netos por token y cadena (1h / 24h / 7d / 30d).",
  },
  {
    id: "holdings",
    label: "Tenencias",
    subtitle: "Tenencias agregadas actuales de smart money.",
  },
  {
    id: "historical-holdings",
    label: "Histórico de tenencias",
    subtitle: "Serie diaria de holdings agregados (última lectura disponible).",
  },
  {
    id: "dex-trades",
    label: "Trades en DEX",
    subtitle: "Operaciones recientes en DEX por smart money.",
  },
  {
    id: "perp-trades",
    label: "Trades perp",
    subtitle: "Actividad de perpetuos (p. ej. Hyperliquid).",
  },
  {
    id: "dcas",
    label: "DCAs en Jupiter",
    subtitle: "Estrategias DCA detectadas en Jupiter.",
  },
];

const SMART_MONEY_CACHE_KEYS: Record<SmartMoneySection, string> = {
  netflow: GLOBAL_NANSEN_SMART_MONEY_NETFLOW,
  holdings: GLOBAL_NANSEN_SMART_MONEY_HOLDINGS,
  "historical-holdings": GLOBAL_NANSEN_SMART_MONEY_HIST_HOLDINGS,
  "dex-trades": GLOBAL_NANSEN_SMART_MONEY_DEX_TRADES,
  "perp-trades": GLOBAL_NANSEN_SMART_MONEY_PERP_TRADES,
  dcas: GLOBAL_NANSEN_SMART_MONEY_DCAS,
};

function fallbackSection(raw: string | null): SmartMoneySection {
  return parseSection(raw) ?? "netflow";
}

function toRows(payload: unknown): SmartMoneyLoaderRow[] {
  if (!payload || typeof payload !== "object") return [];
  const root = payload as Record<string, unknown>;
  const data = root.data;
  if (!Array.isArray(data)) return [];
  return data.filter((x) => !!x && typeof x === "object") as SmartMoneyLoaderRow[];
}

/** Etiquetas de columnas en español (API suele devolver snake_case). */
const COLUMN_LABEL_ES: Record<string, string> = {
  date: "Fecha",
  chain: "Red",
  token_address: "Contrato",
  token_symbol: "Token",
  token_sectors: "Sectores",
  smart_money_labels: "Etiquetas smart money",
  balance: "Saldo",
  value_usd: "Valor (USD)",
  netflow_1h: "Flujo neto 1h",
  netflow_24h: "Flujo neto 24h",
  netflow_7d: "Flujo neto 7d",
  netflow_30d: "Flujo neto 30d",
};

function columnHeading(key: string): string {
  return COLUMN_LABEL_ES[key] ?? key.replace(/_/g, " ");
}

function shortenTokenAddress(raw: string): { short: string; full: string } {
  const s = raw.trim();
  if (/^0x[a-fA-F0-9]{40}$/.test(s)) {
    return { short: `${s.slice(0, 6)}…${s.slice(-4)}`, full: s };
  }
  return { short: s, full: s };
}

function isNumericColumn(key: string): boolean {
  return (
    key === "balance" ||
    key.includes("usd") ||
    key.includes("value") ||
    key.includes("volume") ||
    key.includes("netflow") ||
    key.includes("amount") ||
    key.includes("price")
  );
}

function formatNumericCell(n: number): string {
  if (!Number.isFinite(n)) return "—";
  const opts: Intl.NumberFormatOptions =
    Math.abs(n) >= 1e9
      ? { notation: "compact", maximumFractionDigits: 2 }
      : Math.abs(n) >= 1
        ? { maximumFractionDigits: 2 }
        : { maximumFractionDigits: 6 };
  return new Intl.NumberFormat("es-ES", opts).format(n);
}

function orderedColumnKeys(keys: string[], section: SmartMoneySection): string[] {
  const preferred: Partial<Record<SmartMoneySection, string[]>> = {
    "historical-holdings": [
      "date",
      "chain",
      "token_symbol",
      "token_address",
      "token_sectors",
      "smart_money_labels",
      "balance",
      "value_usd",
    ],
  };
  const order = preferred[section];
  if (!order) return keys;
  const rest = keys.filter((k) => !order.includes(k));
  return [...order.filter((k) => keys.includes(k)), ...rest];
}

function stringifyCell(key: string, v: unknown): string {
  if (v == null || v === "") return "—";
  if (typeof v === "boolean") return v ? "Sí" : "No";
  if (typeof v === "number" && Number.isFinite(v)) {
    return isNumericColumn(key) ? formatNumericCell(v) : String(v);
  }
  if (typeof v === "string") {
    const asNum = Number(v.replace(/\s/g, "").replace(",", "."));
    if (isNumericColumn(key) && Number.isFinite(asNum) && v.match(/^[\d.,\s-]+$/)) {
      return formatNumericCell(asNum);
    }
    return v;
  }
  if (Array.isArray(v)) return v.map((x) => stringifyCell(key, x)).join(", ");
  return JSON.stringify(v);
}

function cellWrapClass(key: string): string {
  if (key === "token_sectors" || key === "smart_money_labels" || key.includes("label")) {
    return "max-w-[14rem] whitespace-normal break-words align-top";
  }
  if (key === "token_address" || key.includes("address")) {
    return "font-mono text-[11px]";
  }
  return "whitespace-nowrap tabular-nums";
}

export const useSmartMoneyLoader = routeLoader$(async (ev) => {
  const section = fallbackSection(ev.query.get("tab"));
  const cacheKey = SMART_MONEY_CACHE_KEYS[section];
  const cached = await getGlobalSnapshotJson<Record<string, unknown> | null>(cacheKey);
  if (cached && typeof cached === "object") {
    const payload = cached.data;
    if (payload && typeof payload === "object") {
      return {
        section,
        rows: toRows(payload),
        raw: payload,
        error: null as string | null,
        creditsUsed: (cached.creditsUsed as string | null) ?? null,
        creditsRemaining: (cached.creditsRemaining as string | null) ?? null,
      };
    }
  }
  const out = await fetchNansenSmartMoney(section, getDefaultSmartMoneyRequest(section));
  if (!out.ok) {
    return {
      section,
      rows: [] as SmartMoneyLoaderRow[],
      raw: null as unknown,
      error: out.error,
      creditsUsed: out.creditsUsed ?? null,
      creditsRemaining: out.creditsRemaining ?? null,
    };
  }
  return {
    section,
    rows: toRows(out.data),
    raw: out.data,
    error: null as string | null,
    creditsUsed: out.creditsUsed ?? null,
    creditsRemaining: out.creditsRemaining ?? null,
  };
});

export default component$(() => {
  useRequirePro();
  const loc = useLocation();
  const L = loc.params.locale || "en-us";
  const loaded = useSmartMoneyLoader();
  const active = loaded.value.section;
  const activeMeta = SMART_MONEY_SECTIONS.find((s) => s.id === active) ?? SMART_MONEY_SECTIONS[0];
  const rows = loaded.value.rows ?? [];
  const cols =
    rows.length > 0 ? orderedColumnKeys(Object.keys(rows[0] as Record<string, unknown>), active) : [];

  const creditsUsed = loaded.value.creditsUsed;
  const creditsRemaining = loaded.value.creditsRemaining;
  const showCreditsUsed = creditsUsed != null && String(creditsUsed).length > 0;
  const showCreditsRemaining = creditsRemaining != null && String(creditsRemaining).length > 0;

  return (
    <section class="space-y-4">
      <header class="rounded-xl border border-[#043234] bg-[#001316] p-4">
        <p class="text-xs uppercase tracking-wide text-[#04E6E6]/80">Smart money</p>
        <h1 class="text-2xl font-semibold text-white mt-1">{activeMeta.label}</h1>
        <p class="text-sm text-gray-300 mt-1 max-w-3xl leading-relaxed">{activeMeta.subtitle}</p>
        {(showCreditsUsed || showCreditsRemaining) && (
          <div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
            {showCreditsUsed ? <span>Créditos utilizados: {String(creditsUsed)}</span> : null}
            {showCreditsRemaining ? <span>Créditos restantes: {String(creditsRemaining)}</span> : null}
          </div>
        )}
      </header>

      <article class="rounded-xl border border-[#043234] bg-[#001316] p-3 sm:p-4 overflow-hidden">
        {loaded.value.error ? (
          <div class="rounded-lg border border-rose-700/40 bg-rose-950/40 p-3 text-sm text-rose-200">
            {loaded.value.error}
          </div>
        ) : null}

        {!loaded.value.error && rows.length > 0 ? (
          <div class="overflow-auto -mx-1 max-h-[min(70vh,920px)] rounded-lg border border-[#043234]/60">
            <table class="min-w-full text-left text-xs">
              <thead class="sticky top-0 z-[1] border-b border-[#043234] bg-[#001a1d] text-[#04E6E6]/95">
                <tr>
                  {cols.map((c) => (
                    <th key={c} class="px-3 py-2.5 font-semibold whitespace-nowrap">
                      {columnHeading(c)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody class="text-slate-200">
                {rows.slice(0, 100).map((r, i) => (
                  <tr key={`r-${i}`} class="border-b border-[#043234]/40 hover:bg-[#043234]/20">
                    {cols.map((c) => {
                      const rawVal = r[c];
                      if (c === "token_address" && typeof rawVal === "string") {
                        const { short, full } = shortenTokenAddress(rawVal);
                        return (
                          <td key={`${i}-${c}`} class={`px-3 py-2 ${cellWrapClass(c)}`} title={full}>
                            {short}
                          </td>
                        );
                      }
                      return (
                        <td key={`${i}-${c}`} class={`px-3 py-2 ${cellWrapClass(c)}`}>
                          {stringifyCell(c, rawVal)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {!loaded.value.error && rows.length === 0 ? (
          <div class="text-sm text-gray-400">
            No hay filas para esta vista con la configuración actual. Probá más tarde o revisá que el último sync
            principal haya guardado datos.
          </div>
        ) : null}

        {!loaded.value.error && rows.length > 100 ? (
          <p class="mt-2 text-[11px] text-slate-500">Mostrando las primeras 100 filas.</p>
        ) : null}
      </article>
    </section>
  );
});
