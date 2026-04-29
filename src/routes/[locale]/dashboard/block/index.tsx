import { component$ } from "@builder.io/qwik";
import { Link, routeLoader$, useLocation } from "@builder.io/qwik-city";
import { useDashboardAuth } from "../../layout";
import { fetchMoralisBlock, fetchMoralisDateToBlock } from "~/server/crypto-ghost/moralis-api";

const CHAIN_OPTIONS = [
  ["eth", "Ethereum"],
  ["base", "Base"],
  ["polygon", "Polygon"],
  ["arbitrum", "Arbitrum"],
  ["optimism", "Optimism"],
  ["bsc", "BSC"],
  ["avalanche", "Avalanche"],
  ["linea", "Linea"],
] as const;

function summarizeBlockJson(data: unknown, maxTxs: number): unknown {
  if (data == null || typeof data !== "object" || Array.isArray(data)) return data;
  const o = { ...(data as Record<string, unknown>) };
  const txs = o.transactions;
  if (Array.isArray(txs) && txs.length > maxTxs) {
    o.transactions = txs.slice(0, maxTxs);
    (o as Record<string, unknown>)._truncated_tx_count = txs.length - maxTxs;
  }
  return o;
}

export const useBlockToolsLoader = routeLoader$(async (ev) => {
  const chain = (ev.url.searchParams.get("chain")?.trim().toLowerCase() || "eth").toLowerCase();
  const block = ev.url.searchParams.get("block")?.trim() || "";
  const date = ev.url.searchParams.get("date")?.trim() || "";
  const includeInternal =
    ev.url.searchParams.get("include_internal") === "1" ||
    ev.url.searchParams.get("include") === "internal_transactions";

  const [blockRes, dateRes] = await Promise.all([
    block ? fetchMoralisBlock(block, chain, { includeInternalTransactions: includeInternal }) : null,
    date ? fetchMoralisDateToBlock(chain, date) : null,
  ]);

  return {
    chain,
    blockParam: block,
    dateParam: date,
    includeInternal,
    blockRes,
    dateRes,
  };
});

export default component$(() => {
  useDashboardAuth();
  const loc = useLocation();
  const base = `/${loc.params.locale || "en-us"}/dashboard/block/`;
  const v = useBlockToolsLoader().value;

  const blockData = v.blockRes?.ok ? v.blockRes.data : null;
  const dateData = v.dateRes?.ok ? v.dateRes.data : null;
  const blockSummary = blockData != null ? summarizeBlockJson(blockData, 35) : null;

  return (
    <div class="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 class="text-2xl font-bold text-white">Explorador de bloques</h1>
        <p class="mt-2 text-sm text-slate-400">
          Consulta un bloque por número o hash, o convierte una fecha en el bloque aproximado de esa cadena.
        </p>
      </div>

      <form method="get" action={base} class="rounded-xl border border-[#043234] bg-[#001a1c]/80 p-4 space-y-4">
        <div class="grid gap-4 md:grid-cols-2">
          <div>
            <label class="block text-xs font-medium uppercase tracking-wide text-slate-500">Cadena</label>
            <select
              name="chain"
              class="mt-1 w-full rounded-lg border border-[#043234] bg-[#000D0E] px-3 py-2 text-sm text-slate-100"
            >
              {CHAIN_OPTIONS.map(([val, label]) => (
                <option key={val} value={val} selected={v.chain === val}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div class="flex items-end gap-3">
            <label class="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                name="include_internal"
                value="1"
                defaultChecked={v.includeInternal}
                class="rounded border-[#043234] bg-[#000D0E] text-[#04E6E6] focus:ring-[#04E6E6]"
              />
              Incluir <span class="text-slate-500">internal_transactions</span> (más pesado)
            </label>
          </div>
        </div>

        <div>
          <label class="block text-xs font-medium uppercase tracking-wide text-slate-500">
            Número de bloque o hash (0x…)
          </label>
          <input
            type="text"
            name="block"
            value={v.blockParam}
            placeholder="Ej. 18500000 o 0x9b559aef7ea858608c2e554246fe4a24287e7aeeb976848df2b9a2531f4b9171"
            class="mt-1 w-full rounded-lg border border-[#043234] bg-[#000D0E] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600"
            autoComplete="off"
          />
        </div>

        <div>
          <label class="block text-xs font-medium uppercase tracking-wide text-slate-500">
            Fecha → bloque cercano (dateToBlock)
          </label>
          <input
            type="text"
            name="date"
            value={v.dateParam}
            placeholder="Unix ms, ISO o fecha legible (p. ej. 2020-01-01)"
            class="mt-1 w-full rounded-lg border border-[#043234] bg-[#000D0E] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600"
            autoComplete="off"
          />
        </div>

        <div class="flex flex-wrap gap-2">
          <button
            type="submit"
            class="rounded-lg bg-[#04E6E6] px-4 py-2 text-sm font-semibold text-[#001a1c] hover:bg-[#04E6E6]/90"
          >
            Consultar
          </button>
          <Link
            href={base}
            class="rounded-lg border border-[#043234] px-4 py-2 text-sm text-slate-300 hover:bg-[#043234]/40"
          >
            Limpiar
          </Link>
        </div>
      </form>

      {v.blockParam && v.blockRes && !v.blockRes.ok ? (
        <div class="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-200">
          <strong class="text-red-100">Bloque:</strong> {String(v.blockRes.error)}
        </div>
      ) : null}

      {v.dateParam && v.dateRes && !v.dateRes.ok ? (
        <div class="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-200">
          <strong class="text-red-100">dateToBlock:</strong> {String(v.dateRes.error)}
        </div>
      ) : null}

      {v.blockRes?.ok && blockData != null && typeof blockData === "object" && !Array.isArray(blockData) ? (
        <section class="rounded-xl border border-[#043234] bg-[#000D0E]/80 p-4">
          <h2 class="text-xs font-semibold uppercase tracking-wide text-slate-500">Bloque</h2>
          <dl class="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            {([
              ["hash", (blockData as Record<string, unknown>).hash],
              ["number", (blockData as Record<string, unknown>).number],
              ["timestamp", (blockData as Record<string, unknown>).timestamp],
              ["miner", (blockData as Record<string, unknown>).miner],
              ["transaction_count", (blockData as Record<string, unknown>).transaction_count],
              ["gas_used", (blockData as Record<string, unknown>).gas_used],
              ["gas_limit", (blockData as Record<string, unknown>).gas_limit],
            ] as Array<[string, unknown]>).map(([k, val]) => (
              <div key={k} class="min-w-0">
                <dt class="text-[10px] uppercase text-slate-600">{k}</dt>
                <dd class="truncate font-mono text-slate-200" title={val != null ? String(val) : ""}>
                  {val != null ? String(val) : "—"}
                </dd>
              </div>
            ))}
          </dl>
          <details class="mt-4">
            <summary class="cursor-pointer text-xs text-[#04E6E6]/90 hover:underline">
              JSON (transacciones truncadas a 35 filas si hay muchas)
            </summary>
            <pre class="mt-2 max-h-[min(480px,50vh)] overflow-auto rounded-lg bg-[#001a1c] p-3 text-[11px] text-slate-300">
              {JSON.stringify(blockSummary, null, 2)}
            </pre>
          </details>
        </section>
      ) : null}

      {v.dateRes?.ok && dateData != null && typeof dateData === "object" ? (
        <section class="rounded-xl border border-[#043234] bg-[#000D0E]/80 p-4">
          <h2 class="text-xs font-semibold uppercase tracking-wide text-slate-500">dateToBlock</h2>
          <dl class="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            {Object.entries(dateData as Record<string, unknown>).map(([k, val]) => (
              <div key={k} class="min-w-0">
                <dt class="text-[10px] uppercase text-slate-600">{k}</dt>
                <dd class="truncate font-mono text-slate-200" title={val != null ? String(val) : ""}>
                  {val != null ? String(val) : "—"}
                </dd>
              </div>
            ))}
          </dl>
          <pre class="mt-4 max-h-[min(320px,40vh)] overflow-auto rounded-lg bg-[#001a1c] p-3 text-[11px] text-slate-300">
            {JSON.stringify(dateData, null, 2)}
          </pre>
        </section>
      ) : null}

      {!v.blockParam && !v.dateParam ? (
        <p class="text-center text-sm text-slate-500">
          Indica un bloque o una fecha y pulsa Consultar.
        </p>
      ) : null}
    </div>
  );
});
