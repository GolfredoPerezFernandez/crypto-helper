import { component$, useSignal, useComputed$, useVisibleTask$, $ } from "@builder.io/qwik";
import { LuSearch, LuX, LuRadio } from "@qwikest/icons/lucide";
import { TokenLogoImg } from "~/components/crypto-dashboard/token-logo";
import { EvmAddrLinks, TxHashLink } from "~/components/crypto-dashboard/evm-dash-links";

export const LiveDexSignalFeed = component$(
  (props: {
    title: string;
    subtitle?: string;
    locale: string;
    initialItems: Record<string, unknown>[];
    streamPath: string;
    eventName?: string;
  }) => {
    const L = props.locale;
    const items = useSignal<Record<string, unknown>[]>([]);
    const search = useSignal("");
    const chainFilter = useSignal("all");

    // eslint-disable-next-line qwik/no-use-visible-task
    useVisibleTask$(({ track }) => {
      track(() => props.initialItems);
      items.value = [...(props.initialItems || [])];
      const evName = props.eventName || "new-message";
      const es = new EventSource(`${window.location.origin}${props.streamPath}`);
      es.addEventListener(evName, (e: MessageEvent) => {
        try {
          const j = JSON.parse(e.data as string) as Record<string, unknown>;
          items.value = [j, ...items.value].slice(0, 100);
        } catch {
          /* ignore */
        }
      });
      return () => es.close();
    });

    const chains = useComputed$(() => {
      const s = new Set<string>();
      for (const m of items.value) {
        const c = String(m.chain ?? "").trim();
        if (c) s.add(c);
      }
      return Array.from(s).sort();
    });

    const filtered = useComputed$(() => {
      const q = search.value.trim().toLowerCase();
      const cf = chainFilter.value;
      let list = items.value.slice();
      if (cf !== "all") list = list.filter((m) => String(m.chain ?? "") === cf);
      if (q) {
        list = list.filter((m) => {
          const alert = String(m.alert ?? "").toLowerCase();
          const addr = String(m.address ?? "").toLowerCase();
          const from = String(m.fromTokenSymbol ?? "").toLowerCase();
          const to = String(m.toTokenSymbol ?? "").toLowerCase();
          const tx = String(m.transactionHash ?? "").toLowerCase();
          return (
            alert.includes(q) || addr.includes(q) || from.includes(q) || to.includes(q) || tx.includes(q)
          );
        });
      }
      return list;
    });

    const selectClass =
      "rounded-lg border border-[#043234] bg-[#000D0E]/90 px-3 py-2 text-sm text-slate-200 outline-none focus:border-[#04E6E6]/50";

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
          <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div class="relative min-w-0 flex-1">
              <LuSearch class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="search"
                placeholder="Search alert, address, symbols, tx hash…"
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
            <label class="flex flex-col gap-1 sm:min-w-[10rem]">
              <span class="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Chain</span>
              <select
                class={selectClass}
                value={chainFilter.value}
                onChange$={(e) => {
                  chainFilter.value = (e.target as HTMLSelectElement).value;
                }}
              >
                <option value="all">All chains</option>
                {chains.value.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p class="mt-3 text-xs text-slate-500">
            Showing <span class="font-semibold text-slate-300">{filtered.value.length}</span> /{" "}
            {items.value.length} loaded
          </p>
        </div>

        <ul class="mt-8 space-y-4">
          {filtered.value.map((m, i) => {
            const hash = String(m.transactionHash ?? "");
            const chain = String(m.chain ?? "").trim() || "base";
            const addr = String(m.address ?? "");
            return (
              <li key={`${hash}-${i}`}>
                <article class="rounded-2xl border border-[#043234]/90 bg-gradient-to-br from-[#001a1c] via-[#001318] to-[#000a0c] p-4 shadow-lg ring-1 ring-white/[0.04] transition hover:border-[#04E6E6]/30">
                  <div class="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h2 class="font-semibold text-[#04E6E6] leading-snug">{String(m.alert ?? "—")}</h2>
                      <p class="mt-1 text-xs text-slate-500">
                        <span class="rounded-md bg-[#043234]/50 px-1.5 py-px font-mono text-slate-400">
                          {chain || "—"}
                        </span>
                      </p>
                    </div>
                    {hash ? (
                      <div class="shrink-0 rounded-lg border border-[#043234] px-2.5 py-1 text-[11px] font-medium text-[#04E6E6]">
                        <TxHashLink
                          locale={L}
                          moralisChain={chain}
                          hash={hash}
                          mode="ver"
                          linkClass="text-[11px] font-medium text-[#04E6E6] hover:underline"
                        />
                      </div>
                    ) : null}
                  </div>
                  <p class="mt-3 text-sm text-slate-400">Swapped: {String(m.swapped ?? "—")}</p>
                  <div class="mt-3 flex flex-wrap items-center gap-2 text-slate-300">
                    <TokenLogoImg src={m.fromTokenLogo as string} symbol={String(m.fromTokenSymbol ?? "")} size={28} />
                    <span class="font-medium">{String(m.fromTokenSymbol ?? "—")}</span>
                    <span class="text-slate-600">→</span>
                    <TokenLogoImg src={m.toTokenLogo as string} symbol={String(m.toTokenSymbol ?? "")} size={28} />
                    <span class="font-medium">{String(m.toTokenSymbol ?? "—")}</span>
                  </div>
                  <div class="mt-3 flex flex-wrap items-center gap-3 border-t border-[#043234]/50 pt-3 text-xs">
                    {addr ? (
                      <EvmAddrLinks locale={L} moralisChain={chain} address={addr.toLowerCase()} variant="wallet" />
                    ) : (
                      <span class="text-slate-500">—</span>
                    )}
                    {(m.netWorth != null || m.netWorthUsd != null) && (
                      <span class="text-slate-500">
                        NW: {String(m.netWorth ?? `${m.netWorthUsd} USD`)}
                      </span>
                    )}
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
        {filtered.value.length === 0 ? (
          <p class="mt-8 text-center text-sm text-slate-500">No signals match your filters.</p>
        ) : null}
      </div>
    );
  },
);
