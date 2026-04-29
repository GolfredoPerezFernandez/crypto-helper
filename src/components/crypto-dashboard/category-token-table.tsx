import { component$, useSignal, useComputed$, $ } from "@builder.io/qwik";
import { Link } from "@builder.io/qwik-city";
import { LuSearch, LuArrowUpDown, LuX } from "@qwikest/icons/lucide";
import { TokenLogoImg } from "~/components/crypto-dashboard/token-logo";
import {
  formatSignedPercent,
  formatTokenUsdPrice,
  formatUsdLiquidity,
  parsePercentNumber,
  percentToneClass,
} from "~/utils/format-market";
import { MARKET_CATEGORY_LABEL } from "~/server/crypto-ghost/market-category-constants";
import { moralisChainFromNetworkLabel } from "~/server/crypto-ghost/moralis-chain";
import { EvmAddrLinks } from "~/components/crypto-dashboard/evm-dash-links";

type Row = Record<string, unknown>;

type SortKey = "updated" | "price" | "volume" | "fdv" | "chg24" | "chg7" | "name";

function numField(t: Row, key: string): number | null {
  const v = t[key];
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

function compareRows(a: Row, b: Row, sortKey: SortKey, dir: 1 | -1): number {
  let cmp = 0;
  switch (sortKey) {
    case "updated":
      cmp = (numField(a, "updatedAt") ?? 0) - (numField(b, "updatedAt") ?? 0);
      break;
    case "price":
      cmp = (numField(a, "price") ?? 0) - (numField(b, "price") ?? 0);
      break;
    case "volume":
      cmp = (numField(a, "volume") ?? 0) - (numField(b, "volume") ?? 0);
      break;
    case "fdv":
      cmp =
        (numField(a, "fullyDilutedValuation") ?? 0) -
        (numField(b, "fullyDilutedValuation") ?? 0);
      break;
    case "chg24":
      cmp =
        (parsePercentNumber(a.percentChange24h) ?? 0) -
        (parsePercentNumber(b.percentChange24h) ?? 0);
      break;
    case "chg7":
      cmp =
        (parsePercentNumber(a.percentChange7d) ?? 0) -
        (parsePercentNumber(b.percentChange7d) ?? 0);
      break;
    case "name":
      cmp = String(a.name ?? "")
        .toLowerCase()
        .localeCompare(String(b.name ?? "").toLowerCase());
      break;
    default:
      cmp = 0;
  }
  return cmp * dir;
}

function categoryLabel(cat: string): string {
  return MARKET_CATEGORY_LABEL[cat] ?? cat;
}

export const CategoryTokenTable = component$(
  (props: {
    locale: string;
    title: string;
    subtitle?: string;
    rows: Row[];
    emptyHint?: string;
    /** Multi-board “All tokens” page: show board filter and chip on cards. */
    showCategoryFilter?: boolean;
  }) => {
    const L = props.locale;
    const source = props.rows;
    const showCat = props.showCategoryFilter === true;

    const search = useSignal("");
    const categoryFilter = useSignal<string>("all");
    const networkFilter = useSignal<string>("all");
    const sortKey = useSignal<SortKey>("updated");
    const sortDirDesc = useSignal(true);

    const networkOptions = useComputed$(() => {
      const set = new Set<string>();
      for (const t of source) {
        const n = String(t.network ?? "").trim();
        if (n) set.add(n);
      }
      return Array.from(set).sort((a, b) => a.localeCompare(b));
    });

    const categoryOptions = useComputed$(() => {
      const set = new Set<string>();
      for (const t of source) {
        const c = String(t.category ?? "").trim();
        if (c) set.add(c);
      }
      return Array.from(set).sort();
    });

    const filtered = useComputed$(() => {
      const q = search.value.trim().toLowerCase();
      const cat = categoryFilter.value;
      const net = networkFilter.value;
      const sk = sortKey.value;
      const dir: 1 | -1 = sortDirDesc.value ? -1 : 1;

      let list = source.slice();
      if (q) {
        list = list.filter((t) => {
          const name = String(t.name ?? "").toLowerCase();
          const sym = String(t.symbol ?? "").toLowerCase();
          const addr = String(t.address ?? "").toLowerCase();
          const slug = String(t.slug ?? "").toLowerCase();
          return (
            name.includes(q) || sym.includes(q) || addr.includes(q) || slug.includes(q)
          );
        });
      }
      if (showCat && cat !== "all") {
        list = list.filter((t) => String(t.category ?? "") === cat);
      }
      if (net !== "all") {
        list = list.filter((t) => String(t.network ?? "").trim() === net);
      }

      list.sort((a, b) => compareRows(a, b, sk, dir));
      return list;
    });

    const resetFilters = $(() => {
      search.value = "";
      categoryFilter.value = "all";
      networkFilter.value = "all";
      sortKey.value = "updated";
      sortDirDesc.value = true;
    });

    const toggleSortDir = $(() => {
      sortDirDesc.value = !sortDirDesc.value;
    });

    const filterBarClass =
      "rounded-xl border border-[#043234]/80 bg-[#001318]/95 p-4 shadow-lg shadow-black/20 backdrop-blur-sm";

    const selectClass =
      "w-full min-w-0 rounded-lg border border-[#043234] bg-[#000D0E]/90 px-3 py-2 text-sm text-slate-200 outline-none transition focus:border-[#04E6E6]/50 focus:ring-1 focus:ring-[#04E6E6]/30 sm:w-auto sm:min-w-[10.5rem]";

    return (
      <div class="w-full max-w-[2200px] mx-auto">
        <h1 class="text-2xl font-bold tracking-tight text-[#04E6E6] sm:text-3xl">{props.title}</h1>
        {props.subtitle ? (
          <p class="mt-2 max-w-3xl text-sm leading-relaxed text-slate-500">{props.subtitle}</p>
        ) : null}

        <div class={`${filterBarClass} mt-6 space-y-4`}>
          <div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div class="relative min-w-0 flex-1 max-w-2xl">
              <LuSearch class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="search"
                placeholder="Search name, symbol, contract, slug…"
                class="w-full rounded-lg border border-[#043234] bg-[#000D0E]/90 py-2.5 pl-10 pr-10 text-sm text-white placeholder:text-slate-600 outline-none transition focus:border-[#04E6E6]/50 focus:ring-1 focus:ring-[#04E6E6]/30"
                value={search.value}
                onInput$={(e) => {
                  search.value = (e.target as HTMLInputElement).value;
                }}
              />
              {search.value ? (
                <button
                  type="button"
                  class="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:bg-[#043234]/60 hover:text-slate-300"
                  aria-label="Clear search"
                  onClick$={$(() => {
                    search.value = "";
                  })}
                >
                  <LuX class="h-4 w-4" />
                </button>
              ) : null}
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick$={toggleSortDir}
                class="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#043234] bg-[#000D0E]/90 px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-[#04E6E6]/40 hover:text-[#04E6E6]"
                title={sortDirDesc.value ? "Descending" : "Ascending"}
              >
                <LuArrowUpDown class="h-4 w-4 text-[#04E6E6]" />
                {sortDirDesc.value ? "High → low" : "Low → high"}
              </button>
              <button
                type="button"
                onClick$={resetFilters}
                class="rounded-lg border border-[#043234]/60 px-3 py-2 text-xs font-medium text-slate-400 transition hover:border-[#04E6E6]/35 hover:text-slate-200"
              >
                Reset filters
              </button>
            </div>
          </div>

          <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <label class="flex flex-col gap-1.5">
              <span class="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Sort by
              </span>
              <select
                class={selectClass}
                value={sortKey.value}
                onChange$={(e) => {
                  sortKey.value = (e.target as HTMLSelectElement).value as SortKey;
                }}
              >
                <option value="updated">Last updated</option>
                <option value="price">Price</option>
                <option value="volume">24h volume</option>
                <option value="fdv">FDV</option>
                <option value="chg24">24h % change</option>
                <option value="chg7">7d % change</option>
                <option value="name">Name (A–Z)</option>
              </select>
            </label>
            {showCat ? (
              <label class="flex flex-col gap-1.5">
                <span class="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Board
                </span>
                <select
                  class={selectClass}
                  value={categoryFilter.value}
                  onChange$={(e) => {
                    categoryFilter.value = (e.target as HTMLSelectElement).value;
                  }}
                >
                  <option value="all">All boards</option>
                  {categoryOptions.value.map((c) => (
                    <option key={c} value={c}>
                      {categoryLabel(c)}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <label class="flex flex-col gap-1.5">
              <span class="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Network
              </span>
              <select
                class={selectClass}
                value={networkFilter.value}
                onChange$={(e) => {
                  networkFilter.value = (e.target as HTMLSelectElement).value;
                }}
              >
                <option value="all">All networks</option>
                {networkOptions.value.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <div class="flex flex-col justify-end">
              <p class="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Results
              </p>
              <p class="mt-1.5 text-sm tabular-nums text-slate-300">
                <span class="font-semibold text-white">{filtered.value.length}</span>
                <span class="text-slate-500"> / {source.length}</span>
              </p>
            </div>
          </div>
        </div>

        {source.length === 0 ? (
          <div class="mt-8 rounded-2xl border border-[#043234] bg-[#001a1c]/50 p-12 text-center text-sm text-slate-500">
            {props.emptyHint ||
              "No hay filas todavía — ejecuta la sincronización diaria o revisa la configuración del servidor."}
          </div>
        ) : filtered.value.length === 0 ? (
          <div class="mt-8 rounded-2xl border border-amber-500/25 bg-amber-950/15 p-10 text-center">
            <p class="text-sm text-amber-100/90">No tokens match your filters.</p>
            <button
              type="button"
              onClick$={resetFilters}
              class="mt-4 text-sm font-medium text-[#04E6E6] hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <ul class="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 2xl:[grid-template-columns:repeat(auto-fit,minmax(320px,1fr))]">
            {filtered.value.map((t) => {
              const id = String(t.id);
              const cat = String(t.category ?? "");
              const ch24 = t.percentChange24h as string | number | undefined;
              const ch7 = t.percentChange7d as string | number | undefined;
              return (
                <li key={id}>
                  <article class="group flex h-full flex-col rounded-2xl border border-[#043234]/90 bg-gradient-to-br from-[#001a1c] via-[#001318] to-[#000a0c] p-4 shadow-lg shadow-black/25 ring-1 ring-white/[0.04] transition duration-200 hover:border-[#04E6E6]/35 hover:ring-[#04E6E6]/12">
                    <div class="flex items-start justify-between gap-2">
                      <div class="flex min-w-0 flex-1 gap-3">
                        <TokenLogoImg
                          src={String(t.logo ?? "")}
                          symbol={String(t.symbol)}
                          size={48}
                          class="shrink-0 rounded-xl ring-1 ring-[#043234]/60"
                        />
                        <div class="min-w-0">
                          <h2 class="truncate font-semibold text-white leading-snug">
                            {String(t.name)}
                          </h2>
                          <p class="mt-0.5 text-xs text-slate-500">
                            <span class="font-mono text-slate-400">{String(t.symbol)}</span>
                            <span class="text-[#043234]"> · </span>
                            <span>{String(t.network ?? "—")}</span>
                          </p>
                        </div>
                      </div>
                      {showCat && cat ? (
                        <span class="shrink-0 rounded-md border border-[#043234] bg-[#000D0E]/80 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">
                          {categoryLabel(cat)}
                        </span>
                      ) : null}
                    </div>

                    <dl class="mt-4 grid grid-cols-2 gap-3 text-xs">
                      <div class="rounded-lg bg-black/25 px-2.5 py-2 ring-1 ring-[#043234]/40">
                        <dt class="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                          Price
                        </dt>
                        <dd class="mt-0.5 font-semibold tabular-nums text-[#04E6E6]">
                          ${formatTokenUsdPrice(t.price as string | number)}
                        </dd>
                      </div>
                      <div class="rounded-lg bg-black/25 px-2.5 py-2 ring-1 ring-[#043234]/40">
                        <dt class="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                          24h vol
                        </dt>
                        <dd class="mt-0.5 tabular-nums text-slate-200">
                          {formatUsdLiquidity(t.volume as string | number)}
                        </dd>
                      </div>
                      <div class="rounded-lg bg-black/25 px-2.5 py-2 ring-1 ring-[#043234]/40">
                        <dt class="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                          24h
                        </dt>
                        <dd class={`mt-0.5 font-semibold tabular-nums ${percentToneClass(ch24)}`}>
                          {formatSignedPercent(ch24)}
                        </dd>
                      </div>
                      <div class="rounded-lg bg-black/25 px-2.5 py-2 ring-1 ring-[#043234]/40">
                        <dt class="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                          7d
                        </dt>
                        <dd class={`mt-0.5 font-semibold tabular-nums ${percentToneClass(ch7)}`}>
                          {formatSignedPercent(ch7)}
                        </dd>
                      </div>
                    </dl>

                    <div class="mt-3 flex items-center justify-between gap-2 border-t border-[#043234]/50 pt-3 text-[11px] text-slate-500">
                      {/^0x[a-fA-F0-9]{40}$/.test(String(t.address ?? "")) ? (
                        <EvmAddrLinks
                          locale={L}
                          moralisChain={moralisChainFromNetworkLabel(String(t.network))}
                          address={String(t.address).toLowerCase()}
                          variant="token"
                        />
                      ) : (
                        <span class="truncate font-mono text-[10px] text-slate-600" title={String(t.address)}>
                          {String(t.address || "—")}
                        </span>
                      )}
                      <Link
                        href={`/${L}/dashboard/token/${id}/`}
                        class="shrink-0 rounded-lg bg-[#04E6E6]/10 px-3 py-1.5 text-xs font-semibold text-[#04E6E6] ring-1 ring-[#04E6E6]/25 transition hover:bg-[#04E6E6]/20"
                      >
                        View →
                      </Link>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  },
);
