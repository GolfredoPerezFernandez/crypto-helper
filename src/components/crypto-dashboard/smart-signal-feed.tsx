import { component$, useSignal, useComputed$, useVisibleTask$, $, type JSXChildren } from "@builder.io/qwik";
import { LuSearch, LuX, LuRadio } from "@qwikest/icons/lucide";

type AnalyzedAddr = { id?: number; address?: string; balance?: string };

export const SmartSignalFeed = component$(
  (props: {
    title: string;
    subtitle?: JSXChildren;
    initialItems: Record<string, unknown>[];
    streamPath?: string;
    maxItems?: number;
  }) => {
    const items = useSignal<Record<string, unknown>[]>([]);
    const search = useSignal("");
    const max = props.maxItems ?? 30;
    const path = props.streamPath ?? "/api/stream/smart";

    // eslint-disable-next-line qwik/no-use-visible-task
    useVisibleTask$(({ track }) => {
      track(() => props.initialItems);
      items.value = [...(props.initialItems || [])];
      const es = new EventSource(`${window.location.origin}${path}`);
      es.addEventListener("alert", (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data as string) as { message?: Record<string, unknown> };
          const msg = payload?.message;
          if (msg && typeof msg === "object") {
            items.value = [msg, ...items.value].slice(0, max);
          }
        } catch {
          /* ignore */
        }
      });
      return () => es.close();
    });

    const filtered = useComputed$(() => {
      const q = search.value.trim().toLowerCase();
      let list = items.value.slice();
      if (q) {
        list = list.filter((row) => {
          const summary = String(row.summaryMessage ?? "").toLowerCase();
          if (summary.includes(q)) return true;
          const addrs = (row.analyzedAddresses as AnalyzedAddr[] | undefined) ?? [];
          return addrs.some((a) => String(a.address ?? "").toLowerCase().includes(q));
        });
      }
      return list;
    });

    return (
      <div class="max-w-[1600px]">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold tracking-tight text-[#04E6E6] sm:text-3xl">{props.title}</h1>
            {props.subtitle ? (
              <p class="mt-2 max-w-3xl text-sm leading-relaxed text-slate-500">{props.subtitle}</p>
            ) : null}
          </div>
          <span class="inline-flex items-center gap-2 rounded-full border border-emerald-500/35 bg-emerald-950/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-300">
            <LuRadio class="h-3.5 w-3.5 animate-pulse" />
            En vivo
          </span>
        </div>

        <div class="mt-6 rounded-xl border border-[#043234]/80 bg-[#001318]/95 p-4 shadow-lg backdrop-blur-sm">
          <div class="relative min-w-0 max-w-md">
            <LuSearch class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="search"
              placeholder="Search summary or address…"
              class="w-full rounded-lg border border-[#043234] bg-[#000D0E]/90 py-2.5 pl-10 pr-10 text-sm text-white placeholder:text-slate-600 outline-none focus:border-[#04E6E6]/50"
              value={search.value}
              onInput$={(e) => {
                search.value = (e.target as HTMLInputElement).value;
              }}
            />
            {search.value ? (
              <button
                type="button"
                class="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:bg-[#043234]/60"
                aria-label="Clear"
                onClick$={$(() => {
                  search.value = "";
                })}
              >
                <LuX class="h-4 w-4" />
              </button>
            ) : null}
          </div>
          <p class="mt-3 text-xs text-slate-500">
            Showing <span class="font-semibold text-slate-300">{filtered.value.length}</span> /{" "}
            {items.value.length} loaded
          </p>
        </div>

        <ul class="mt-8 space-y-4">
          {filtered.value.map((row, i) => {
            const id = row.id ?? i;
            const created = row.createdAt != null ? Number(row.createdAt) : 0;
            const addrs = (row.analyzedAddresses as AnalyzedAddr[] | undefined) ?? [];
            return (
              <li key={String(id)}>
                <article class="rounded-2xl border border-[#043234]/90 bg-gradient-to-br from-[#001a1c] via-[#001318] to-[#000a0c] p-4 shadow-lg ring-1 ring-white/[0.04] transition hover:border-[#04E6E6]/30">
                  <div class="font-medium leading-snug text-white">{String(row.summaryMessage ?? "—")}</div>
                  <p class="mt-2 text-xs text-slate-500">
                    {created ? new Date(created * 1000).toISOString() : "—"}
                  </p>
                  {addrs.length > 0 ? (
                    <ul class="mt-3 space-y-1 border-t border-[#043234]/50 pt-3 text-xs text-slate-400">
                      {addrs.slice(0, 8).map((a) => (
                        <li key={a.id ?? a.address} class="font-mono">
                          {a.address} — {a.balance} ETH
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </article>
              </li>
            );
          })}
        </ul>
        {filtered.value.length === 0 ? (
          <p class="mt-8 text-center text-sm text-slate-500">No alerts match your filters.</p>
        ) : null}
      </div>
    );
  },
);
