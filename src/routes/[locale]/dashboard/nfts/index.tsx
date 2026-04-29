import { component$, useSignal, useComputed$, $ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";
import { Link, routeLoader$, useLocation } from "@builder.io/qwik-city";
import { LuSearch, LuX } from "@qwikest/icons/lucide";
import { useDashboardAuth } from "../../layout";
import {
  getGlobalSnapshotJson,
  GLOBAL_NFT_HOTTEST,
  GLOBAL_NFT_TOP,
} from "~/server/crypto-ghost/api-snapshot-sync";
import type { MoralisWalletTokensResult } from "~/server/crypto-ghost/moralis-api";
import { formatTokenUsdPrice, formatUsdLiquidity } from "~/utils/format-market";

export const head: DocumentHead = {
  title: "NFT Collections Dashboard | Crypto Helper",
  meta: [
    {
      name: "description",
      content:
        "Browse hottest NFT collections, contract-level details, and token views across supported chains.",
    },
  ],
};

export const useNftsLoader = routeLoader$(async () => {
  const hot = await getGlobalSnapshotJson<MoralisWalletTokensResult | null>(GLOBAL_NFT_HOTTEST);
  const top = await getGlobalSnapshotJson<MoralisWalletTokensResult | null>(GLOBAL_NFT_TOP);
  return {
    hot: hot?.ok ? hot.data : null,
    hotErr:
      hot == null
        ? "Sin datos en caché — ejecuta el sync diario."
        : hot.ok
          ? null
          : hot.error,
    top: top?.ok ? top.data : null,
    topErr:
      top == null
        ? "Sin datos en caché — ejecuta el sync diario."
        : top.ok
          ? null
          : top.error,
  };
});

function normalizeList(raw: unknown): any[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object" && Array.isArray((raw as { result?: unknown }).result)) {
    return (raw as { result: any[] }).result;
  }
  return [];
}

function moralisChainSlug(c: Record<string, unknown>): string {
  const raw = c.chain ?? c.chain_id ?? c.chainId ?? c.network ?? "eth";
  const s = String(raw ?? "eth").toLowerCase().trim();
  if (s === "0x1" || s === "1" || s === "ethereum") return "eth";
  if (s === "0x89") return "polygon";
  if (s === "0x38") return "bsc";
  if (s === "0x2105") return "base";
  if (s === "0xa4b1") return "arbitrum";
  if (s === "0xa") return "optimism";
  return s || "eth";
}

/** Algunas APIs devuelven `collection_image`; otras usan `collection_logo`, `image`, etc. */
function nftCollectionImageUrl(c: Record<string, unknown>): string | null {
  const meta = c.metadata as Record<string, unknown> | undefined;
  const candidates: unknown[] = [
    c.collection_image,
    c.collection_logo,
    c.collection_image_url,
    c.image,
    c.logo,
    c.logo_url,
    c.thumbnail,
    c.thumbnail_url,
    c.icon,
    c.profile_image_url,
    meta?.image,
    meta?.image_url,
  ];
  for (const x of candidates) {
    if (typeof x !== "string") continue;
    const s = x.trim();
    if (!s) continue;
    if (s.startsWith("http://") || s.startsWith("https://")) return s;
    if (s.startsWith("ipfs://")) return `https://ipfs.io/ipfs/${s.slice(7)}`;
    if (s.startsWith("ipfs/")) return `https://ipfs.io/${s}`;
  }
  return null;
}

function firstFiniteNumber(obj: Record<string, unknown>, keys: string[]): number | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() !== "") {
      const n = Number(v);
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

/** Payloads suelen usar snake_case; a veces camelCase. */
function nftCollectionVolumeUsd(c: Record<string, unknown>): number | null {
  return firstFiniteNumber(c, [
    "volume_usd",
    "volumeUsd",
    "total_volume_usd",
    "totalVolumeUsd",
    "one_day_volume_usd",
    "oneDayVolumeUsd",
  ]);
}

function nftCollectionMarketCapUsd(c: Record<string, unknown>): number | null {
  return firstFiniteNumber(c, [
    "market_cap_usd",
    "marketCapUsd",
    "marketcap_usd",
    "marketCap",
  ]);
}

export default component$(() => {
  const dash = useDashboardAuth();
  const showSync = dash.value.showSyncDebug;
  const loc = useLocation();
  const L = loc.params.locale || "en-us";
  const data = useNftsLoader();
  const hotSearch = useSignal("");
  const topSearch = useSignal("");

  const lists = useComputed$(() => {
    const hotList = normalizeList(data.value.hot);
    const topList = normalizeList(data.value.top);
    return { hotList, topList };
  });

  const hotFiltered = useComputed$(() => {
    const q = hotSearch.value.trim().toLowerCase();
    let list = lists.value.hotList.slice(0, 18);
    if (q) {
      list = list.filter((c: any) => {
        const name = String(c.name ?? c.collection_title ?? "").toLowerCase();
        const addr = String(c.collection_address ?? c.token_address ?? c.address ?? "").toLowerCase();
        return name.includes(q) || addr.includes(q);
      });
    }
    return list;
  });

  const topFiltered = useComputed$(() => {
    const q = topSearch.value.trim().toLowerCase();
    let list = lists.value.topList.slice(0, 18);
    if (q) {
      list = list.filter((c: any) => {
        const name = String(c.name ?? c.collection_title ?? "").toLowerCase();
        const addr = String(c.collection_address ?? "").toLowerCase();
        return name.includes(q) || addr.includes(q);
      });
    }
    return list;
  });

  const inputClass =
    "w-full rounded-lg border border-[#043234] bg-[#000D0E]/90 py-2.5 pl-10 pr-10 text-sm text-white placeholder:text-slate-600 outline-none focus:border-[#04E6E6]/50";

  return (
    <div class="max-w-[1600px]">
      <h1 class="text-2xl font-bold tracking-tight text-[#04E6E6] sm:text-3xl">NFT collections</h1>
      <p class="mt-2 max-w-3xl text-sm leading-relaxed text-slate-500">
        {showSync
          ? "Datos desde la base (último sync programado). Sin llamadas extra al abrir la página."
          : "Datos en caché (actualizados periódicamente)."}
      </p>

      {showSync && (data.value.hotErr || data.value.topErr) ? (
        <div class="mt-6 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200">
          {data.value.hotErr ? <p>Hottest: {data.value.hotErr.slice(0, 200)}</p> : null}
          {data.value.topErr ? <p>Top: {data.value.topErr.slice(0, 200)}</p> : null}
        </div>
      ) : null}

      <section class="mt-10">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <h2 class="text-lg font-semibold text-white">Hottest</h2>
          <div class="relative min-w-0 max-w-md sm:w-72">
            <LuSearch class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="search"
              placeholder="Search name or address…"
              class={inputClass}
              value={hotSearch.value}
              onInput$={(e) => {
                hotSearch.value = (e.target as HTMLInputElement).value;
              }}
            />
            {hotSearch.value ? (
              <button
                type="button"
                class="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:bg-[#043234]/60"
                aria-label="Clear"
                onClick$={$(() => {
                  hotSearch.value = "";
                })}
              >
                <LuX class="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>
        <p class="mt-2 text-xs text-slate-500">
          Showing <span class="font-semibold text-slate-300">{hotFiltered.value.length}</span> collections
        </p>
        <ul class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {hotFiltered.value.length === 0 ? (
            <li class="col-span-full rounded-2xl border border-[#043234]/80 bg-[#001318]/40 p-10 text-center text-sm text-slate-500">
              Sin datos o sin coincidencias.
            </li>
          ) : (
            hotFiltered.value.map((c: any, i: number) => {
              const row = c as Record<string, unknown>;
              const logoUrl = nftCollectionImageUrl(row);
              const addr = String(c.collection_address || c.token_address || c.address || "").toLowerCase();
              const ch = moralisChainSlug(c);
              const href = addr.startsWith("0x") ? `/${L}/nfts/${addr}/?chain=${encodeURIComponent(ch)}` : null;
              const inner = (
                <>
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                      class="mb-3 h-12 w-12 rounded-xl object-cover ring-1 ring-[#043234]/60 bg-[#043234]/30"
                    />
                  ) : (
                    <div class="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#043234]/50 text-xs font-medium text-slate-500">
                      NFT
                    </div>
                  )}
                  <h3 class="font-medium leading-snug text-white">{c.name || c.collection_title || "Collection"}</h3>
                  <p class="mt-1 truncate font-mono text-[11px] text-slate-500" title={c.collection_address || c.token_address}>
                    {c.collection_address || c.token_address || "—"}
                  </p>
                  {c.floor_price_usd != null ? (
                    <p class="mt-3 text-sm font-semibold tabular-nums text-[#04E6E6]">
                      Floor ~ ${formatTokenUsdPrice(c.floor_price_usd)}
                    </p>
                  ) : null}
                </>
              );
              return (
                <li key={c.collection_address || c.address || i}>
                  {href ? (
                    <Link
                      href={href}
                      class="flex h-full flex-col rounded-2xl border border-[#043234]/90 bg-gradient-to-br from-[#001a1c] via-[#001318] to-[#000a0c] p-4 shadow-lg ring-1 ring-white/[0.04] transition hover:border-[#04E6E6]/30"
                    >
                      {inner}
                    </Link>
                  ) : (
                    <article class="flex h-full flex-col rounded-2xl border border-[#043234]/90 bg-gradient-to-br from-[#001a1c] via-[#001318] to-[#000a0c] p-4 shadow-lg ring-1 ring-white/[0.04]">
                      {inner}
                    </article>
                  )}
                </li>
              );
            })
          )}
        </ul>
      </section>

      <section class="mt-14">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <h2 class="text-lg font-semibold text-white">Top collections</h2>
          <div class="relative min-w-0 max-w-md sm:w-72">
            <LuSearch class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="search"
              placeholder="Search name or address…"
              class={inputClass}
              value={topSearch.value}
              onInput$={(e) => {
                topSearch.value = (e.target as HTMLInputElement).value;
              }}
            />
            {topSearch.value ? (
              <button
                type="button"
                class="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:bg-[#043234]/60"
                aria-label="Clear"
                onClick$={$(() => {
                  topSearch.value = "";
                })}
              >
                <LuX class="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>
        <p class="mt-2 text-xs text-slate-500">
          Showing <span class="font-semibold text-slate-300">{topFiltered.value.length}</span> collections
        </p>
        <p class="mt-2 max-w-2xl text-[11px] leading-relaxed text-slate-600">
          A veces el volumen USD aparece como <span class="text-slate-500">Vol $0</span> en caché aunque la colección
          siga en el ranking por <span class="text-slate-500">capitalización</span>. En ese caso mostramos el cap si
          viene en la caché.
        </p>
        <ul class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {topFiltered.value.length === 0 ? (
            <li class="col-span-full rounded-2xl border border-[#043234]/80 bg-[#001318]/40 p-10 text-center text-sm text-slate-500">
              No rows or no matches.
            </li>
          ) : (
            topFiltered.value.map((c: any, i: number) => {
              const row = c as Record<string, unknown>;
              const logoUrl = nftCollectionImageUrl(row);
              const topVol = nftCollectionVolumeUsd(row);
              const topCap = nftCollectionMarketCapUsd(row);
              const addr = String(c.collection_address || "").toLowerCase();
              const ch = moralisChainSlug(c);
              const href = addr.startsWith("0x") ? `/${L}/nfts/${addr}/?chain=${encodeURIComponent(ch)}` : null;
              const inner = (
                <>
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                      class="mb-3 h-12 w-12 rounded-xl object-cover ring-1 ring-[#043234]/60 bg-[#043234]/30"
                    />
                  ) : (
                    <div class="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#043234]/50 text-xs font-medium text-slate-500">
                      NFT
                    </div>
                  )}
                  <h3 class="font-medium leading-snug text-white">{c.name || c.collection_title || "Collection"}</h3>
                  <p class="mt-1 truncate font-mono text-[11px] text-slate-500" title={c.collection_address}>
                    {c.collection_address || "—"}
                  </p>
                  {topVol != null && topVol > 0 ? (
                    <p class="mt-3 text-sm tabular-nums text-slate-300">
                      Vol <span class="font-semibold text-[#04E6E6]">{formatUsdLiquidity(topVol)}</span>
                    </p>
                  ) : topCap != null && topCap > 0 ? (
                    <div class="mt-3 space-y-0.5">
                      <p class="text-sm tabular-nums text-slate-300">
                        Cap <span class="font-semibold text-[#04E6E6]">{formatUsdLiquidity(topCap)}</span>
                      </p>
                      {topVol != null && topVol <= 0 ? (
                        <p class="text-[10px] leading-snug text-slate-500">
                          Volumen USD en 0 o no incluido en los datos para esta colección.
                        </p>
                      ) : null}
                    </div>
                  ) : topVol != null ? (
                    <p class="mt-3 text-sm tabular-nums text-slate-400">
                      Vol <span class="font-medium">{formatUsdLiquidity(topVol)}</span>
                    </p>
                  ) : null}
                </>
              );
              return (
                <li key={`top-${c.collection_address || i}`}>
                  {href ? (
                    <Link
                      href={href}
                      class="flex h-full flex-col rounded-2xl border border-[#043234]/90 bg-gradient-to-br from-[#001a1c] via-[#001318] to-[#000a0c] p-4 shadow-lg ring-1 ring-white/[0.04] transition hover:border-[#04E6E6]/30"
                    >
                      {inner}
                    </Link>
                  ) : (
                    <article class="flex h-full flex-col rounded-2xl border border-[#043234]/90 bg-gradient-to-br from-[#001a1c] via-[#001318] to-[#000a0c] p-4 shadow-lg ring-1 ring-white/[0.04]">
                      {inner}
                    </article>
                  )}
                </li>
              );
            })
          )}
        </ul>
      </section>
    </div>
  );
});
