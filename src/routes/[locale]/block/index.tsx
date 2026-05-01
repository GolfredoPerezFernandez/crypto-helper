import { component$ } from "@builder.io/qwik";
import { Link, routeLoader$, useLocation } from "@builder.io/qwik-city";
import { useDashboardAuth } from "../layout";
import {
  fetchMoralisBlockResolved,
  fetchMoralisDateToBlock,
  type MoralisBlockResolvedMode,
} from "~/server/crypto-helper/moralis-api";

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

function formatMoralisError(err: unknown): string {
  if (err == null) return "";
  if (typeof err === "object") {
    try {
      const o = err as Record<string, unknown>;
      if (typeof o.message === "string") return o.message;
      return JSON.stringify(err);
    } catch {
      return String(err);
    }
  }
  const s = String(err);
  try {
    const j = JSON.parse(s) as { message?: unknown };
    if (j && typeof j === "object" && typeof j.message === "string") return j.message;
  } catch {
    /* ignore */
  }
  return s;
}

function resolutionHint(mode: MoralisBlockResolvedMode, resolvedChain: string, preferred: string): string | null {
  if (mode === "direct_block") return null;
  if (mode === "tx_then_block") {
    return "Este identificador es un hash de transacción; se cargó el bloque que la incluye.";
  }
  if (mode === "direct_block_cross_chain") {
    return `En la cadena seleccionada (${preferred}) no existe ese bloque; Moralis lo encontró en ${resolvedChain}.`;
  }
  if (mode === "tx_then_block_cross_chain") {
    return `No es un bloque en ${preferred}; es una transacción en ${resolvedChain} (bloque cargado desde esa red).`;
  }
  return null;
}

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

/** Orden de lectura para la respuesta Moralis `dateToBlock`. */
const DATE_TO_BLOCK_ORDER = [
  "block",
  "date",
  "block_timestamp",
  "timestamp",
  "hash",
  "parent_hash",
] as const;

function labelDateToBlockField(key: string): string {
  const labels: Record<string, string> = {
    block: "Bloque cercano",
    date: "Fecha (API)",
    timestamp: "Unix timestamp",
    block_timestamp: "Instante del bloque",
    hash: "Hash del bloque",
    parent_hash: "Bloque padre",
  };
  return labels[key] ?? key;
}

function formatUtcHuman(isoOrUnknown: unknown): string | null {
  if (isoOrUnknown == null) return null;
  const s = String(isoOrUnknown).trim();
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return (
    d.toLocaleString("es-ES", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZone: "UTC",
      timeZoneName: "short",
    }) ?? null
  );
}

/** Unix en segundos o ms → texto UTC legible. */
function formatUnixHuman(val: unknown): string | null {
  if (typeof val !== "number" || !Number.isFinite(val)) return null;
  const ms = val < 1e12 ? val * 1000 : val;
  return formatUtcHuman(new Date(ms).toISOString());
}

function sortedDateToBlockEntries(data: Record<string, unknown>): [string, unknown][] {
  const keys = new Set(Object.keys(data));
  const ordered: [string, unknown][] = [];
  for (const k of DATE_TO_BLOCK_ORDER) {
    if (keys.has(k)) {
      ordered.push([k, data[k]]);
      keys.delete(k);
    }
  }
  for (const k of [...keys].sort()) {
    ordered.push([k, data[k]]);
  }
  return ordered;
}

function isHexHash(val: unknown): boolean {
  return typeof val === "string" && /^0x[a-fA-F0-9]{64}$/.test(val);
}

export const useBlockToolsLoader = routeLoader$(async (ev) => {
  const chain = (ev.url.searchParams.get("chain")?.trim().toLowerCase() || "eth").toLowerCase();
  const block = ev.url.searchParams.get("block")?.trim() || "";
  const date = ev.url.searchParams.get("date")?.trim() || "";
  const includeInternal =
    ev.url.searchParams.get("include_internal") === "1" ||
    ev.url.searchParams.get("include") === "internal_transactions";

  const [blockResolved, dateRes] = await Promise.all([
    block
      ? fetchMoralisBlockResolved(block, chain, { includeInternalTransactions: includeInternal })
      : null,
    date ? fetchMoralisDateToBlock(chain, date) : null,
  ]);

  return {
    chain,
    blockParam: block,
    dateParam: date,
    includeInternal,
    blockRes: blockResolved?.blockRes ?? null,
    blockResolvedChain: blockResolved?.resolvedChain ?? null,
    blockResolvedMode: blockResolved?.mode ?? null,
    dateRes,
  };
});

export default component$(() => {
  useDashboardAuth();
  const loc = useLocation();
  const base = `/${loc.params.locale || "en-us"}/block/`;
  const v = useBlockToolsLoader().value;

  const blockData = v.blockRes?.ok ? v.blockRes.data : null;
  const resolvedChain = v.blockResolvedChain ?? v.chain;
  const resHint =
    v.blockResolvedMode && v.blockParam
      ? resolutionHint(v.blockResolvedMode, resolvedChain, v.chain)
      : null;
  const qs = new URLSearchParams();
  if (v.blockParam) qs.set("block", v.blockParam);
  if (v.dateParam) qs.set("date", v.dateParam);
  if (v.includeInternal) qs.set("include_internal", "1");
  const suggestedChainHref = `${base}?${(() => {
    const p = new URLSearchParams(qs);
    p.set("chain", resolvedChain);
    return p.toString();
  })()}`;
  const dateData = v.dateRes?.ok ? v.dateRes.data : null;
  const blockSummary = blockData != null ? summarizeBlockJson(blockData, 35) : null;
  const chainDisplayName = CHAIN_OPTIONS.find(([c]) => c === v.chain)?.[1] ?? v.chain;

  const dateRecord =
    dateData != null && typeof dateData === "object" && !Array.isArray(dateData)
      ? (dateData as Record<string, unknown>)
      : null;

  return (
    <div class="mx-auto max-w-4xl space-y-10 pb-8">
      <header class="space-y-2 border-b border-[#043234]/60 pb-8">
        <h1 class="text-3xl font-bold tracking-tight text-white sm:text-4xl">Explorador de bloques</h1>
        <p class="max-w-2xl text-sm leading-relaxed text-slate-400">
          Consultá un bloque por número o hash (incluye hash de transacción en otras redes), o convertí una fecha en el
          bloque más cercano para la cadena elegida.
        </p>
      </header>

      <form
        method="get"
        action={base}
        class="space-y-5 rounded-2xl border border-[#043234]/90 bg-gradient-to-b from-[#001a1c]/95 to-[#000d0e]/95 p-5 shadow-xl shadow-black/25 sm:p-6"
      >
        <div class="grid gap-5 md:grid-cols-2">
          <div class="space-y-1.5">
            <label class="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Red</label>
            <select
              name="chain"
              class="w-full rounded-xl border border-[#043234] bg-[#000D0E] px-4 py-2.5 text-sm text-slate-100 outline-none ring-[#04E6E6]/0 transition focus:border-[#04E6E6]/50 focus:ring-2 focus:ring-[#04E6E6]/20"
            >
              {CHAIN_OPTIONS.map(([val, label]) => (
                <option key={val} value={val} selected={v.chain === val}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div class="flex items-end">
            <label class="flex cursor-pointer items-start gap-3 rounded-xl border border-[#043234]/80 bg-[#000D0E]/50 px-4 py-3 text-sm text-slate-300 transition hover:border-[#043234]">
              <input
                type="checkbox"
                name="include_internal"
                value="1"
                defaultChecked={v.includeInternal}
                class="mt-0.5 rounded border-[#043234] bg-[#000D0E] text-[#04E6E6] focus:ring-[#04E6E6]"
              />
              <span>
                Incluir <span class="font-mono text-[11px] text-[#04E6E6]/90">internal_transactions</span>
                <span class="mt-0.5 block text-xs font-normal text-slate-500">Respuesta más pesada; solo si lo necesitás.</span>
              </span>
            </label>
          </div>
        </div>

        <div class="space-y-1.5">
          <label class="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Bloque · hash de bloque · hash de tx
          </label>
          <input
            type="text"
            name="block"
            value={v.blockParam}
            placeholder="Ej. 18500000 o 0x + 64 caracteres hex"
            class="w-full rounded-xl border border-[#043234] bg-[#000D0E] px-4 py-3 font-mono text-sm text-slate-100 placeholder:text-slate-600 outline-none transition focus:border-[#04E6E6]/45 focus:ring-2 focus:ring-[#04E6E6]/15"
            autoComplete="off"
          />
        </div>

        <div class="space-y-1.5">
          <label class="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Fecha → bloque cercano <span class="font-normal normal-case text-slate-600">(dateToBlock)</span>
          </label>
          <input
            type="text"
            name="date"
            value={v.dateParam}
            placeholder="Unix segundos / ms, ISO-8601 o texto interpretable"
            class="w-full rounded-xl border border-[#043234] bg-[#000D0E] px-4 py-3 font-mono text-sm text-slate-100 placeholder:text-slate-600 outline-none transition focus:border-[#04E6E6]/45 focus:ring-2 focus:ring-[#04E6E6]/15"
            autoComplete="off"
          />
        </div>

        <div class="flex flex-wrap gap-3 pt-1">
          <button
            type="submit"
            class="rounded-xl bg-[#04E6E6] px-6 py-2.5 text-sm font-semibold text-[#001a1c] shadow-md shadow-[#04E6E6]/10 transition hover:bg-[#04f5f5] active:scale-[0.98]"
          >
            Consultar
          </button>
          <Link
            href={base}
            class="rounded-xl border border-[#043234] px-6 py-2.5 text-sm font-medium text-slate-300 transition hover:border-slate-600 hover:bg-[#043234]/30"
          >
            Limpiar
          </Link>
        </div>
      </form>

      {v.blockParam && v.blockRes && !v.blockRes.ok ? (
        <div
          role="alert"
          class="rounded-2xl border border-rose-500/35 bg-rose-950/25 px-5 py-4 text-sm text-rose-100 shadow-lg shadow-rose-950/20"
        >
          <p class="font-semibold text-rose-50">No se pudo cargar el bloque</p>
          <p class="mt-2 leading-relaxed text-rose-200/95">{formatMoralisError(v.blockRes.error)}</p>
          <p class="mt-3 text-xs leading-relaxed text-rose-300/85">
            Un mismo <span class="font-mono text-rose-200">0x…</span> puede ser bloque en una L2 y no existir en la red
            seleccionada, o ser hash de transacción. Probá otra cadena o dejá que la herramienta resuelva automáticamente.
          </p>
        </div>
      ) : null}

      {v.dateParam && v.dateRes && !v.dateRes.ok ? (
        <div
          role="alert"
          class="rounded-2xl border border-rose-500/35 bg-rose-950/25 px-5 py-4 text-sm text-rose-100 shadow-lg shadow-rose-950/20"
        >
          <p class="font-semibold text-rose-50">dateToBlock no disponible</p>
          <p class="mt-2 leading-relaxed text-rose-200/95">{formatMoralisError(v.dateRes.error)}</p>
        </div>
      ) : null}

      {v.blockRes?.ok && resHint ? (
        <div class="rounded-2xl border border-amber-500/35 bg-gradient-to-r from-amber-950/35 to-[#001a1c]/80 px-5 py-4 text-sm text-amber-50 shadow-md shadow-black/20">
          <p class="leading-relaxed">{resHint}</p>
          {resolvedChain !== v.chain ? (
            <p class="mt-3">
              <Link
                href={suggestedChainHref}
                class="inline-flex items-center rounded-lg bg-[#04E6E6]/15 px-4 py-2 text-sm font-semibold text-[#04E6E6] ring-1 ring-[#04E6E6]/35 transition hover:bg-[#04E6E6]/25"
              >
                Abrir resultado con cadena {resolvedChain}
              </Link>
            </p>
          ) : null}
        </div>
      ) : null}

      {v.blockRes?.ok && blockData != null && typeof blockData === "object" && !Array.isArray(blockData) ? (
        <section class="overflow-hidden rounded-2xl border border-[#043234]/90 bg-gradient-to-b from-[#031a1c] to-[#000d0e] shadow-xl shadow-black/30">
          <div class="flex flex-wrap items-center justify-between gap-3 border-b border-[#043234]/80 bg-[#001a1c]/50 px-5 py-4 sm:px-6">
            <div>
              <p class="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#04E6E6]/75">Bloque</p>
              <p class="mt-1 text-lg font-semibold text-white">
                #{String((blockData as Record<string, unknown>).number ?? "—")}
                {resolvedChain !== v.chain ? (
                  <span class="ml-2 text-sm font-normal text-slate-400">· {resolvedChain}</span>
                ) : (
                  <span class="ml-2 text-sm font-normal text-slate-500">· {chainDisplayName}</span>
                )}
              </p>
            </div>
            <span class="rounded-full border border-slate-600/80 bg-slate-900/60 px-3 py-1 text-[11px] text-slate-400">
              {(blockData as Record<string, unknown>).transaction_count != null
                ? `${String((blockData as Record<string, unknown>).transaction_count)} txs`
                : "—"}
            </span>
          </div>
          <div class="space-y-6 p-5 sm:p-6">
            <div class="grid gap-3 sm:grid-cols-3">
              <div class="rounded-xl border border-[#043234]/70 bg-[#000D0E]/80 px-4 py-3">
                <p class="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Tiempo (bloque)</p>
                <p class="mt-1 text-sm font-medium text-slate-100">
                  {formatUtcHuman((blockData as Record<string, unknown>).timestamp) ??
                    String((blockData as Record<string, unknown>).timestamp ?? "—")}
                </p>
              </div>
              <div class="rounded-xl border border-[#043234]/70 bg-[#000D0E]/80 px-4 py-3">
                <p class="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Gas usado</p>
                <p class="mt-1 font-mono text-sm tabular-nums text-[#04E6E6]/95">
                  {String((blockData as Record<string, unknown>).gas_used ?? "—")}
                </p>
              </div>
              <div class="rounded-xl border border-[#043234]/70 bg-[#000D0E]/80 px-4 py-3">
                <p class="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Gas límite</p>
                <p class="mt-1 font-mono text-sm tabular-nums text-slate-200">
                  {String((blockData as Record<string, unknown>).gas_limit ?? "—")}
                </p>
              </div>
            </div>

            <div class="space-y-2">
              <p class="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Hash del bloque</p>
              <div class="break-all rounded-xl border border-[#043234]/80 bg-[#000505]/90 px-4 py-3 font-mono text-[12px] leading-relaxed text-slate-200">
                {String((blockData as Record<string, unknown>).hash ?? "—")}
              </div>
            </div>

            <div class="space-y-2">
              <p class="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Miner / fee recipient</p>
              <div class="break-all rounded-xl border border-[#043234]/80 bg-[#000505]/90 px-4 py-3 font-mono text-[12px] leading-relaxed text-slate-300">
                {String((blockData as Record<string, unknown>).miner ?? "—")}
              </div>
            </div>

            <details class="group rounded-xl border border-[#043234]/60 bg-[#001a1c]/40">
              <summary class="cursor-pointer list-none px-4 py-3 text-sm font-medium text-[#04E6E6] transition hover:text-[#04f5f5] [&::-webkit-details-marker]:hidden">
                <span class="mr-2 inline-block transition group-open:rotate-90">▸</span>
                JSON completo (transacciones truncadas a 35 si hay muchas)
              </summary>
              <pre class="max-h-[min(480px,50vh)] overflow-auto border-t border-[#043234]/50 p-4 text-[11px] leading-relaxed text-slate-400">
                {JSON.stringify(blockSummary, null, 2)}
              </pre>
            </details>
          </div>
        </section>
      ) : null}

      {v.dateRes?.ok && dateRecord ? (
        <section class="overflow-hidden rounded-2xl border border-[#043234]/90 bg-gradient-to-b from-[#061f24] to-[#000d0e] shadow-xl shadow-black/30">
          <div class="flex flex-wrap items-start justify-between gap-4 border-b border-[#043234]/80 bg-[#001a1c]/55 px-5 py-4 sm:px-6">
            <div class="space-y-1">
              <p class="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#04E6E6]/80">dateToBlock</p>
              <p class="text-sm text-slate-400">
                Bloque más cercano a tu fecha en <span class="font-medium text-slate-200">{chainDisplayName}</span>
              </p>
            </div>
            <span class="shrink-0 rounded-full border border-[#04E6E6]/25 bg-[#04E6E6]/10 px-3 py-1 text-[11px] font-medium text-[#04E6E6]">
              Respuesta API
            </span>
          </div>

          <div class="space-y-8 p-5 sm:p-6">
            <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p class="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Número de bloque</p>
                <p class="mt-1 text-4xl font-bold tabular-nums tracking-tight text-white sm:text-5xl">
                  {dateRecord.block != null ? String(dateRecord.block) : "—"}
                </p>
              </div>
              <div class="max-w-xl rounded-xl border border-[#043234]/70 bg-[#000D0E]/90 px-4 py-3 text-right sm:text-left">
                <p class="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Lectura humana (UTC)</p>
                <p class="mt-1 text-sm font-medium leading-snug text-slate-100">
                  {formatUtcHuman(dateRecord.block_timestamp) ??
                    formatUtcHuman(dateRecord.date) ??
                    "Usá los campos de abajo para el instante exacto."}
                </p>
              </div>
            </div>

            <div>
              <p class="mb-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Tiempos y referencias</p>
              <div class="grid gap-3 sm:grid-cols-3">
                {sortedDateToBlockEntries(dateRecord)
                  .filter(([k]) => k !== "hash" && k !== "parent_hash" && k !== "block")
                  .map(([k, val]) => (
                    <div
                      key={k}
                      class="rounded-xl border border-[#043234]/70 bg-[#000D0E]/85 px-4 py-3 transition hover:border-[#04E6E6]/25"
                    >
                      <p class="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        {labelDateToBlockField(k)}
                      </p>
                      <p
                        class={`mt-2 text-sm leading-snug ${typeof val === "number" ? "font-mono tabular-nums text-[#04E6E6]" : "text-slate-100"}`}
                      >
                        {val != null ? String(val) : "—"}
                      </p>
                      {(k === "block_timestamp" || k === "date") && formatUtcHuman(val) ? (
                        <p class="mt-2 border-t border-[#043234]/50 pt-2 text-[11px] text-slate-500">
                          {formatUtcHuman(val)}
                        </p>
                      ) : null}
                      {k === "timestamp" && formatUnixHuman(val) ? (
                        <p class="mt-2 border-t border-[#043234]/50 pt-2 text-[11px] text-slate-500">
                          {formatUnixHuman(val)}
                        </p>
                      ) : null}
                    </div>
                  ))}
              </div>
            </div>

            <div class="space-y-4">
              <p class="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Hashes</p>
              {sortedDateToBlockEntries(dateRecord)
                .filter(([k, val]) => (k === "hash" || k === "parent_hash") && isHexHash(val))
                .map(([k, val]) => (
                  <div key={k} class="space-y-2">
                    <p class="text-xs font-medium text-slate-400">{labelDateToBlockField(k)}</p>
                    <div class="break-all rounded-xl border border-[#043234]/80 bg-[#000505]/95 px-4 py-3 font-mono text-[11px] leading-relaxed text-slate-200">
                      {String(val)}
                    </div>
                  </div>
                ))}
            </div>

            <details class="group rounded-xl border border-[#043234]/60 bg-[#001a1c]/45">
              <summary class="cursor-pointer list-none px-4 py-3 text-sm font-medium text-[#04E6E6] transition hover:text-[#04f5f5] [&::-webkit-details-marker]:hidden">
                <span class="mr-2 inline-block transition group-open:rotate-90">▸</span>
                Ver JSON crudo (misma información)
              </summary>
              <pre class="max-h-[min(340px,45vh)] overflow-auto border-t border-[#043234]/50 p-4 text-[11px] leading-relaxed text-slate-400">
                {JSON.stringify(dateData, null, 2)}
              </pre>
            </details>
          </div>
        </section>
      ) : null}

      {!v.blockParam && !v.dateParam ? (
        <p class="rounded-xl border border-dashed border-[#043234]/70 bg-[#001a1c]/40 px-6 py-8 text-center text-sm leading-relaxed text-slate-500">
          Indicá un identificador de bloque o una fecha arriba y pulsá <span class="font-medium text-slate-400">Consultar</span>
          para ver el resultado formateado aquí.
        </p>
      ) : null}
    </div>
  );
});
