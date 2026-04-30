import { component$ } from "@builder.io/qwik";
import { Link, routeLoader$, useLocation } from "@builder.io/qwik-city";
import {
  fetchNansenSmartMoney,
  getDefaultSmartMoneyRequest,
  parseSection,
  type SmartMoneySection,
} from "~/server/crypto-ghost/nansen-smart-money";
import {
  getGlobalSnapshotJson,
  GLOBAL_NANSEN_SMART_MONEY_DCAS,
  GLOBAL_NANSEN_SMART_MONEY_DEX_TRADES,
  GLOBAL_NANSEN_SMART_MONEY_HIST_HOLDINGS,
  GLOBAL_NANSEN_SMART_MONEY_HOLDINGS,
  GLOBAL_NANSEN_SMART_MONEY_NETFLOW,
  GLOBAL_NANSEN_SMART_MONEY_PERP_TRADES,
} from "~/server/crypto-ghost/api-snapshot-sync";
import { useRequirePro } from "../use-require-pro";
export { useRequirePro };

type SmartMoneyLoaderRow = Record<string, unknown>;

const SMART_MONEY_SECTIONS: { id: SmartMoneySection; label: string; subtitle: string }[] = [
  {
    id: "netflow",
    label: "Netflows",
    subtitle: "Flujos netos por token y cadena (1h/24h/7d/30d).",
  },
  {
    id: "holdings",
    label: "Holdings",
    subtitle: "Tenencias agregadas actuales de smart money.",
  },
  {
    id: "historical-holdings",
    label: "Historical Holdings",
    subtitle: "Serie historica diaria de holdings agregados.",
  },
  {
    id: "dex-trades",
    label: "DEX Trades",
    subtitle: "Trades recientes en DEX ejecutados por smart money.",
  },
  {
    id: "perp-trades",
    label: "Perp Trades",
    subtitle: "Actividad de perps de smart money (Hyperliquid).",
  },
  {
    id: "dcas",
    label: "Jupiter DCAs",
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

function stringifyCell(v: unknown): string {
  if (v == null) return "-";
  if (typeof v === "number") return Number.isFinite(v) ? v.toLocaleString() : String(v);
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return v.map((x) => stringifyCell(x)).join(", ");
  return JSON.stringify(v);
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
  const cols = rows.length > 0 ? Object.keys(rows[0]).slice(0, 8) : [];

  return (
    <section class="space-y-4">
      <header class="rounded-xl border border-[#043234] bg-[#001316] p-4">
        <p class="text-xs uppercase tracking-wide text-[#04E6E6]/80">Smart Money</p>
        <h1 class="text-2xl font-semibold text-white mt-1">{activeMeta.label}</h1>
        <p class="text-sm text-gray-300 mt-1">{activeMeta.subtitle}</p>
        <div class="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-400">
          {loaded.value.creditsUsed ? <span>Credits used: {loaded.value.creditsUsed}</span> : null}
          {loaded.value.creditsRemaining ? <span>Credits remaining: {loaded.value.creditsRemaining}</span> : null}
        </div>
      </header>

      <div class="grid gap-4 md:grid-cols-[240px_1fr]">
        <aside class="rounded-xl border border-[#043234] bg-[#001316] p-3">
          <nav class="flex flex-col gap-1">
            {SMART_MONEY_SECTIONS.map((s) => (
              <Link
                key={s.id}
                href={`/${L}/smart-money/?tab=${encodeURIComponent(s.id)}`}
                class={[
                  "rounded-lg px-3 py-2 text-sm transition",
                  s.id === active
                    ? "bg-[#043234] text-[#04E6E6]"
                    : "text-gray-300 hover:bg-[#043234]/60 hover:text-[#04E6E6]",
                ].join(" ")}
              >
                {s.label}
              </Link>
            ))}
          </nav>
        </aside>

        <article class="rounded-xl border border-[#043234] bg-[#001316] p-3 overflow-hidden">
          {loaded.value.error ? (
            <div class="rounded-lg border border-rose-700/40 bg-rose-950/40 p-3 text-sm text-rose-200">
              {loaded.value.error}
            </div>
          ) : null}

          {!loaded.value.error && rows.length > 0 ? (
            <div class="overflow-auto">
              <table class="min-w-full text-xs text-left">
                <thead>
                  <tr class="border-b border-[#043234] text-[#04E6E6]/90">
                    {cols.map((c) => (
                      <th key={c} class="px-2 py-2 font-medium whitespace-nowrap">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 50).map((r, i) => (
                    <tr key={`r-${i}`} class="border-b border-[#043234]/50">
                      {cols.map((c) => (
                        <td key={`${i}-${c}`} class="px-2 py-2 text-gray-200 whitespace-nowrap">
                          {stringifyCell(r[c])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {!loaded.value.error && rows.length === 0 ? (
            <div class="text-sm text-gray-400">No rows returned for this section with current defaults.</div>
          ) : null}

          <details class="mt-3">
            <summary class="cursor-pointer text-xs text-[#04E6E6]">Raw response</summary>
            <pre class="mt-2 rounded-lg border border-[#043234] bg-[#000D0E] p-3 text-[11px] text-gray-300 overflow-auto max-h-[420px]">
              {JSON.stringify(loaded.value.raw ?? {}, null, 2)}
            </pre>
          </details>
        </article>
      </div>
    </section>
  );
});
