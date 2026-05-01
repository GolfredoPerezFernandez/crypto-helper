import { component$, useSignal, useComputed$, $ } from "@builder.io/qwik";
import { Link } from "@builder.io/qwik-city";
import {
  LuSearch,
  LuX,
  LuChevronLeft,
  LuChevronRight,
  LuCopy,
  LuWallet,
  LuArrowDownUp,
} from "@qwikest/icons/lucide";
import { formatUsdWalletCard, parseWalletUsdField } from "~/utils/format-market";

export type WatchlistWalletRow = {
  address: string;
  pnl: { ok: boolean; data?: unknown; error?: string };
  nw: { ok: boolean; data?: unknown; error?: string };
};

function pnlData(r: WatchlistWalletRow): Record<string, unknown> | null {
  const d = r.pnl?.ok ? r.pnl.data : undefined;
  return d != null && typeof d === "object" ? (d as Record<string, unknown>) : null;
}

function nwData(r: WatchlistWalletRow): Record<string, unknown> | null {
  const d = r.nw?.ok ? r.nw.data : undefined;
  return d != null && typeof d === "object" ? (d as Record<string, unknown>) : null;
}

function pct(r: WatchlistWalletRow): number | null {
  const d = pnlData(r);
  if (!d || d.total_realized_profit_percentage == null) return null;
  const n = Number(d.total_realized_profit_percentage);
  return Number.isFinite(n) ? n : null;
}

function roiUsd(r: WatchlistWalletRow): number | null {
  const d = pnlData(r);
  if (!d) return null;
  return parseWalletUsdField(d.total_realized_profit_usd ?? d.totalRealizedProfitUsd);
}

function netWorthUsd(r: WatchlistWalletRow): number | null {
  const d = nwData(r);
  if (!d) return null;
  const top = parseWalletUsdField(d.total_networth_usd ?? d.totalNetworthUsd);
  if (top != null && top > 0) return top;
  const chains = d.chains;
  if (Array.isArray(chains)) {
    let sum = 0;
    for (const c of chains) {
      if (c && typeof c === "object") {
        const rec = c as Record<string, unknown>;
        const v = parseWalletUsdField(rec.networth_usd ?? rec.networthUsd);
        if (v != null) sum += v;
      }
    }
    if (sum > 0) return sum;
  }
  return top;
}

type SortKey = "networth" | "pnlpct" | "roi" | "address";

export const WatchlistWalletGrid = component$(
  (props: {
    locale: string;
    title: string;
    subtitle?: string;
    rows: WatchlistWalletRow[];
    page: number;
    pageSize: number;
    total: number;
    hasMore: boolean;
    /** e.g. `/en-us/top-traders/` */
    basePath: string;
  }) => {
    const L = props.locale;
    const search = useSignal("");
    const sortKey = useSignal<SortKey>("networth");
    const sortDesc = useSignal(true);

    const filtered = useComputed$(() => {
      const q = search.value.trim().toLowerCase();
      let list = props.rows.slice();
      if (q) {
        list = list.filter((r) => r.address.toLowerCase().includes(q));
      }
      const dir = sortDesc.value ? -1 : 1;
      const sk = sortKey.value;
      // Copy before sort — never mutate a cached array; tie-break by address so
      // direction toggle still reorders when metrics are missing or equal.
      return [...list].sort((a, b) => {
        let cmp = 0;
        if (sk === "networth") cmp = (netWorthUsd(a) ?? -1e18) - (netWorthUsd(b) ?? -1e18);
        else if (sk === "pnlpct") cmp = (pct(a) ?? -1e18) - (pct(b) ?? -1e18);
        else if (sk === "roi") cmp = (roiUsd(a) ?? -1e18) - (roiUsd(b) ?? -1e18);
        else cmp = a.address.localeCompare(b.address);
        if (cmp === 0) cmp = a.address.localeCompare(b.address);
        return cmp * dir;
      });
    });

    const totalPages = Math.max(1, Math.ceil(props.total / props.pageSize));
    const pnlErr = (r: WatchlistWalletRow) => (r.pnl?.ok === false ? r.pnl.error : null);
    const nwErr = (r: WatchlistWalletRow) => (r.nw?.ok === false ? r.nw.error : null);

    const selectClass =
      "rounded-lg border border-[#043234] bg-[#000D0E]/90 px-3 py-2 text-sm text-slate-200 outline-none focus:border-[#04E6E6]/50 focus:ring-1 focus:ring-[#04E6E6]/30";

    return (
      <div class="w-full max-w-[2200px] mx-auto">
        <h1 class="text-2xl font-bold tracking-tight text-[#04E6E6] sm:text-3xl">{props.title}</h1>
        {props.subtitle ? (
          <p class="mt-2 max-w-3xl text-sm leading-relaxed text-slate-500">{props.subtitle}</p>
        ) : null}

        <div class="mt-6 rounded-xl border border-[#043234]/80 bg-[#001318]/95 p-4 shadow-lg shadow-black/20 backdrop-blur-sm">
          <div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div class="relative min-w-0 flex-1 max-w-2xl">
              <LuSearch class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="search"
                placeholder="Filter by address on this page…"
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
            <div class="flex flex-wrap items-center gap-2">
              <select
                class={selectClass}
                value={sortKey.value}
                onChange$={(e) => {
                  sortKey.value = (e.target as HTMLSelectElement).value as SortKey;
                }}
              >
                <option value="networth">Sort: Net worth</option>
                <option value="pnlpct">Sort: PnL %</option>
                <option value="roi">Sort: Realized $</option>
                <option value="address">Sort: Address</option>
              </select>
              <button
                type="button"
                class="inline-flex items-center gap-1.5 rounded-lg border border-[#043234] bg-[#000D0E]/90 px-3 py-2 text-xs font-medium text-slate-300 hover:border-[#04E6E6]/40"
                aria-pressed={sortDesc.value ? "true" : "false"}
                title={sortDesc.value ? "Switch to ascending" : "Switch to descending"}
                onClick$={$(() => {
                  sortDesc.value = !sortDesc.value;
                })}
              >
                <LuArrowDownUp class="h-3.5 w-3.5 shrink-0 text-[#04E6E6]" aria-hidden="true" />
                {sortDesc.value ? "High → low" : "Low → high"}
              </button>
            </div>
          </div>
          {totalPages > 1 ? (
            <p class="mt-3 text-xs text-slate-500">
              Page <span class="font-mono text-slate-400">{props.page}</span> / {totalPages} ·{" "}
              <span class="tabular-nums">{props.total}</span> tracked wallets
            </p>
          ) : (
            <p class="mt-3 text-xs text-slate-500">
              <span class="tabular-nums">{props.total}</span> wallets
            </p>
          )}
        </div>

        {filtered.value.length === 0 ? (
          <div class="mt-8 rounded-2xl border border-[#043234] bg-[#001a1c]/40 p-10 text-center text-sm text-slate-500">
            No wallets match this filter on the current page.
          </div>
        ) : (
          <ul class="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 2xl:[grid-template-columns:repeat(auto-fit,minmax(320px,1fr))]">
            {filtered.value.map((r) => {
              const p = pct(r);
              const roi = roiUsd(r);
              const nw = netWorthUsd(r);
              const shortAddr = `${r.address.slice(0, 6)}…${r.address.slice(-4)}`;
              return (
                <li key={r.address}>
                  <article class="flex h-full flex-col rounded-2xl border border-[#043234]/90 bg-gradient-to-br from-[#001a1c] via-[#001318] to-[#000a0c] p-4 shadow-lg shadow-black/25 ring-1 ring-white/[0.04] transition hover:border-[#04E6E6]/35">
                    <div class="flex items-start justify-between gap-2">
                      <div class="flex min-w-0 items-center gap-2">
                        <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#043234]/80 text-[#04E6E6]">
                          <LuWallet class="h-5 w-5" />
                        </span>
                        <div class="min-w-0">
                          <Link
                            href={`/${L}/wallet/${r.address}/`}
                            class="block font-mono text-xs text-white hover:text-[#04E6E6] hover:underline"
                            title={r.address}
                          >
                            {shortAddr}
                          </Link>
                          <p class="text-[10px] text-slate-600">Holder</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        class="shrink-0 rounded-lg p-1.5 text-slate-500 hover:bg-[#04E6E6]/10 hover:text-[#04E6E6]"
                        title="Copy address"
                        aria-label="Copy address"
                        onClick$={$(() => {
                          void navigator.clipboard?.writeText(r.address);
                        })}
                      >
                        <LuCopy class="h-4 w-4" />
                      </button>
                    </div>
                    <dl class="mt-4 grid grid-cols-2 gap-2 text-xs">
                      <div class="min-w-0 rounded-lg bg-black/25 px-2.5 py-2 ring-1 ring-[#043234]/40">
                        <dt class="text-[10px] font-medium uppercase tracking-wide text-slate-500">PnL %</dt>
                        <dd class="mt-0.5 font-semibold tabular-nums text-slate-200">
                          {p != null ? `${p.toFixed(2)}%` : "—"}
                        </dd>
                      </div>
                      <div class="min-w-0 rounded-lg bg-black/25 px-2.5 py-2 ring-1 ring-[#043234]/40">
                        <dt class="text-[10px] font-medium uppercase tracking-wide text-slate-500">Realized</dt>
                        <dd
                          class="mt-0.5 min-w-0 max-w-full break-all font-semibold tabular-nums text-[#04E6E6] sm:break-normal"
                          title={roi != null ? String(roi) : undefined}
                        >
                          {roi != null ? formatUsdWalletCard(roi) : "—"}
                        </dd>
                      </div>
                      <div class="col-span-2 min-w-0 rounded-lg bg-black/25 px-2.5 py-2 ring-1 ring-[#043234]/40">
                        <dt class="text-[10px] font-medium uppercase tracking-wide text-slate-500">Net worth</dt>
                        <dd
                          class="mt-0.5 min-w-0 max-w-full break-all font-semibold tabular-nums text-slate-200 sm:break-normal"
                          title={nw != null ? String(nw) : undefined}
                        >
                          {nw != null ? formatUsdWalletCard(nw) : "—"}
                        </dd>
                      </div>
                    </dl>
                    {(pnlErr(r) || nwErr(r)) && (
                      <p class="mt-2 text-[10px] leading-snug text-amber-400/90">
                        {pnlErr(r) || nwErr(r)}
                      </p>
                    )}
                    <Link
                      href={`/${L}/wallet/${r.address}/`}
                      class="mt-4 block w-full rounded-lg bg-[#04E6E6]/10 py-2.5 text-center text-xs font-semibold text-[#04E6E6] ring-1 ring-[#04E6E6]/25 transition hover:bg-[#04E6E6]/20"
                    >
                      Open wallet →
                    </Link>
                  </article>
                </li>
              );
            })}
          </ul>
        )}

        {totalPages > 1 ? (
          <nav class="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-[#043234]/60 pt-6">
            <div class="text-xs text-slate-500">
              Showing {(props.page - 1) * props.pageSize + 1}–
              {Math.min(props.page * props.pageSize, props.total)} of {props.total}
            </div>
            <div class="flex gap-2">
              {props.page > 1 ? (
                <Link
                  href={`${props.basePath}?page=${props.page - 1}`}
                  class="inline-flex items-center gap-1 rounded-lg border border-[#043234] bg-[#001a1c] px-4 py-2 text-sm font-medium text-[#04E6E6] transition hover:border-[#04E6E6]/50"
                >
                  <LuChevronLeft class="h-4 w-4" />
                  Previous
                </Link>
              ) : (
                <span class="inline-flex cursor-not-allowed items-center gap-1 rounded-lg border border-[#043234]/40 px-4 py-2 text-sm text-slate-600">
                  <LuChevronLeft class="h-4 w-4" />
                  Previous
                </span>
              )}
              {props.hasMore ? (
                <Link
                  href={`${props.basePath}?page=${props.page + 1}`}
                  class="inline-flex items-center gap-1 rounded-lg border border-[#043234] bg-[#001a1c] px-4 py-2 text-sm font-medium text-[#04E6E6] transition hover:border-[#04E6E6]/50"
                >
                  Next
                  <LuChevronRight class="h-4 w-4" />
                </Link>
              ) : (
                <span class="inline-flex cursor-not-allowed items-center gap-1 rounded-lg border border-[#043234]/40 px-4 py-2 text-sm text-slate-600">
                  Next
                  <LuChevronRight class="h-4 w-4" />
                </span>
              )}
            </div>
          </nav>
        ) : (
          <p class="mt-6 text-center text-xs text-slate-600">
            {props.total} wallet{props.total !== 1 ? "s" : ""} · all on one page
          </p>
        )}
      </div>
    );
  },
);
