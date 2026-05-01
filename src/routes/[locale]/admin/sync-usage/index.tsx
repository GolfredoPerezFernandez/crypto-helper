import { component$ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";
import { Link, routeLoader$ } from "@builder.io/qwik-city";
import { desc, eq } from "drizzle-orm";
import { syncRuns, users } from "../../../../../drizzle/schema";
import { db } from "~/lib/turso";
import { emailMayViewSyncUsageReport } from "~/server/crypto-helper/user-access";
import type { SyncUsagePayloadV1 } from "~/server/crypto-helper/sync-usage-context";
import { getUserId } from "~/utils/auth";

export const head: DocumentHead = {
  title: "Sync usage (admin) | Crypto Helper",
  meta: [{ name: "robots", content: "noindex, nofollow" }],
};

function parseUsage(raw: string | null | undefined): SyncUsagePayloadV1 | null {
  if (!raw?.trim()) return null;
  try {
    const j = JSON.parse(raw) as SyncUsagePayloadV1;
    if (j && j.v === 1) return j;
    return null;
  } catch {
    return null;
  }
}

export const useSyncUsageAdminLoader = routeLoader$(async (ev) => {
  const L = ev.params.locale || "en-us";
  const uid = getUserId(ev);
  if (!uid) {
    throw ev.redirect(302, `/${L}/login/?next=${encodeURIComponent(ev.url.pathname)}&session=required`);
  }
  const row = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, Number(uid)))
    .get();
  if (!emailMayViewSyncUsageReport(row?.email ?? null)) {
    throw ev.redirect(302, `/${L}/home/`);
  }

  const runs = await db.select().from(syncRuns).orderBy(desc(syncRuns.id)).limit(150).all();
  const now = Math.floor(Date.now() / 1000);
  const sec7d = 7 * 86_400;
  const sec30d = 30 * 86_400;

  type RunRow = (typeof runs)[number];
  const enriched: {
    run: RunRow;
    usage: SyncUsagePayloadV1 | null;
    nansen: number | null;
    moralisHeaders: number;
    moralisCmcEst: number | null;
  }[] = [];

  let sum7 = { nansen: 0, moralisH: 0, moralisEst: 0, runs: 0 };
  let sum30 = { nansen: 0, moralisH: 0, moralisEst: 0, runs: 0 };

  for (const run of runs) {
    const fin = run.finishedAt ?? 0;
    const usage = parseUsage(run.usagePayload ?? null);
    const nansen = usage?.nansen?.totalCreditsReported ?? null;
    const moralisHeaders = usage?.moralis?.totalCuFromHeaders ?? 0;
    const moralisCmcEst = usage?.moralisCmcPhaseCuEstimate ?? null;

    enriched.push({ run, usage, nansen, moralisHeaders, moralisCmcEst });

    if (!fin || run.status !== "success") continue;
    if (now - fin <= sec7d) {
      sum7.runs++;
      if (nansen != null) sum7.nansen += nansen;
      sum7.moralisH += moralisHeaders;
      if (moralisCmcEst != null) sum7.moralisEst += moralisCmcEst;
    }
    if (now - fin <= sec30d) {
      sum30.runs++;
      if (nansen != null) sum30.nansen += nansen;
      sum30.moralisH += moralisHeaders;
      if (moralisCmcEst != null) sum30.moralisEst += moralisCmcEst;
    }
  }

  return {
    locale: L,
    enriched,
    sums: { sum7, sum30, now },
    note:
      "Nansen: suma de créditos reportados por cabecera/respuesta cuando existen. Moralis (headers): suma de CUs si la API envía el header reconocido. Moralis (est. CMC): aproximación según docs Data API solo para la fase de tokens CMC; wallets/NFT se reflejan mejor en la columna de headers.",
  };
});

export default component$(() => {
  const data = useSyncUsageAdminLoader();
  const base = `/${data.value.locale}`;

  return (
    <div class="mx-auto max-w-6xl px-3 py-8 text-slate-200">
      <div class="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p class="text-xs uppercase tracking-wider text-[#04E6E6]/80">Admin</p>
          <h1 class="text-2xl font-semibold text-white">Consumo por sync</h1>
          <p class="mt-2 max-w-3xl text-sm text-slate-400 leading-relaxed">{data.value.note}</p>
        </div>
        <Link href={`${base}/home/`} class="text-sm text-[#04E6E6] hover:underline">
          ← Home
        </Link>
      </div>

      <section class="mb-8 grid gap-3 sm:grid-cols-2">
        <article class="rounded-xl border border-[#043234] bg-[#001a1c]/80 p-4">
          <h2 class="text-sm font-medium text-white">Últimos 7 días (runs exitosos)</h2>
          <p class="mt-2 text-xs text-slate-500">Runs contados: {data.value.sums.sum7.runs}</p>
          <dl class="mt-3 grid grid-cols-1 gap-2 text-sm">
            <div class="flex justify-between gap-2">
              <dt class="text-slate-400">Nansen (créditos reportados)</dt>
              <dd class="tabular-nums text-cyan-200">{data.value.sums.sum7.nansen.toLocaleString()}</dd>
            </div>
            <div class="flex justify-between gap-2">
              <dt class="text-slate-400">Moralis CU (headers)</dt>
              <dd class="tabular-nums text-cyan-200">{data.value.sums.sum7.moralisH.toLocaleString()}</dd>
            </div>
            <div class="flex justify-between gap-2">
              <dt class="text-slate-400">Moralis est. fase CMC</dt>
              <dd class="tabular-nums text-amber-200/90">{data.value.sums.sum7.moralisEst.toLocaleString()}</dd>
            </div>
          </dl>
        </article>
        <article class="rounded-xl border border-[#043234] bg-[#001a1c]/80 p-4">
          <h2 class="text-sm font-medium text-white">Últimos 30 días (runs exitosos)</h2>
          <p class="mt-2 text-xs text-slate-500">Runs contados: {data.value.sums.sum30.runs}</p>
          <dl class="mt-3 grid grid-cols-1 gap-2 text-sm">
            <div class="flex justify-between gap-2">
              <dt class="text-slate-400">Nansen (créditos reportados)</dt>
              <dd class="tabular-nums text-cyan-200">{data.value.sums.sum30.nansen.toLocaleString()}</dd>
            </div>
            <div class="flex justify-between gap-2">
              <dt class="text-slate-400">Moralis CU (headers)</dt>
              <dd class="tabular-nums text-cyan-200">{data.value.sums.sum30.moralisH.toLocaleString()}</dd>
            </div>
            <div class="flex justify-between gap-2">
              <dt class="text-slate-400">Moralis est. fase CMC</dt>
              <dd class="tabular-nums text-amber-200/90">{data.value.sums.sum30.moralisEst.toLocaleString()}</dd>
            </div>
          </dl>
        </article>
      </section>

      <section class="overflow-x-auto rounded-xl border border-[#043234] bg-[#000d0e]/80">
        <table class="w-full min-w-[900px] text-left text-xs">
          <thead class="border-b border-[#043234] text-[10px] uppercase tracking-wide text-slate-500">
            <tr>
              <th class="px-3 py-2">ID</th>
              <th class="px-3 py-2">Estado</th>
              <th class="px-3 py-2">Fin (UTC)</th>
              <th class="px-3 py-2">Duración</th>
              <th class="px-3 py-2">CMC HTTP</th>
              <th class="px-3 py-2">Icarus</th>
              <th class="px-3 py-2">Nansen Σ</th>
              <th class="px-3 py-2">Moralis CU Σ</th>
              <th class="px-3 py-2">Est. CMC Moralis</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[#043234]/60">
            {data.value.enriched.map(({ run, usage, nansen, moralisHeaders, moralisCmcEst }) => {
              const fin =
                run.finishedAt != null
                  ? new Date(run.finishedAt * 1000).toISOString().replace("T", " ").slice(0, 19)
                  : "—";
              return (
                <tr key={run.id} class="hover:bg-[#001a1c]/50">
                  <td class="px-3 py-2 font-mono text-slate-300">{run.id}</td>
                  <td class="px-3 py-2">{run.status}</td>
                  <td class="px-3 py-2 tabular-nums text-slate-400">{fin}</td>
                  <td class="px-3 py-2 tabular-nums">{run.durationMs != null ? `${run.durationMs} ms` : "—"}</td>
                  <td class="px-3 py-2 tabular-nums">{usage?.cmcHttpCalls ?? "—"}</td>
                  <td class="px-3 py-2 tabular-nums">{usage?.icarusHttpCalls ?? "—"}</td>
                  <td class="px-3 py-2 tabular-nums text-cyan-200/90">{nansen != null ? nansen : "—"}</td>
                  <td class="px-3 py-2 tabular-nums text-cyan-200/90">{usage ? moralisHeaders : "—"}</td>
                  <td class="px-3 py-2 tabular-nums text-amber-200/90">
                    {moralisCmcEst != null ? moralisCmcEst : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {(() => {
        const latest = data.value.enriched.find((e) => e.usage);
        if (!latest?.usage) return null;
        const u = latest.usage;
        return (
          <section class="mt-8 grid gap-4 lg:grid-cols-2">
            <div class="rounded-xl border border-[#043234] bg-[#001a1c]/60 p-4">
              <h3 class="text-sm font-semibold text-white mb-2">Nansen — por llamada (run #{latest.run.id})</h3>
              <div class="max-h-56 overflow-y-auto text-xs font-mono space-y-1">
                {u.nansen.calls.map((c) => (
                  <div key={c.key} class="flex justify-between gap-2 text-slate-300">
                    <span class="truncate text-slate-400">{c.key}</span>
                    <span class="shrink-0 text-cyan-200">{c.creditsUsed ?? "—"}</span>
                  </div>
                ))}
              </div>
            </div>
            <div class="rounded-xl border border-[#043234] bg-[#001a1c]/60 p-4">
              <h3 class="text-sm font-semibold text-white mb-2">Moralis — CUs por header (mismo run)</h3>
              <p class="text-[10px] text-slate-500 mb-2">
                Primeras 40 entradas; sin header reconocido no aparece aquí (ver notas arriba).
              </p>
              <div class="max-h-56 overflow-y-auto text-xs font-mono space-y-1">
                {u.moralis.calls.slice(0, 40).map((c, i) => (
                  <div key={`${c.label}-${i}`} class="flex justify-between gap-2 text-slate-300">
                    <span class="truncate text-slate-400" title={c.label}>
                      {c.label}
                    </span>
                    <span class="shrink-0 text-cyan-200">{c.cu}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        );
      })()}

      {data.value.enriched[0]?.usage?.notes?.length ? (
        <section class="mt-6 rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 text-sm text-amber-100/90">
          <p class="font-medium text-amber-200">Notas del último run con payload</p>
          <ul class="mt-2 list-disc space-y-1 pl-5">
            {data.value.enriched[0].usage!.notes!.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
});
