import { component$ } from "@builder.io/qwik";
import { Link, routeLoader$, useLocation } from "@builder.io/qwik-city";
import { listMyWatchlist, removeWatchlistItem } from "~/server/watchlist-actions";
import { verifyAuth } from "~/utils/auth";

type WatchRow = {
  id: number;
  itemType: string;
  itemKey: string;
  label: string | null;
  metaJson: string | null;
  createdAt: number | null;
};

export const useFavoritesLoader = routeLoader$(async () => {
  const rows = await listMyWatchlist();
  return rows as WatchRow[];
});

export const useFavoritesAccessLoader = routeLoader$(async (ev) => {
  return { isAuthenticated: await verifyAuth(ev) };
});

function itemHref(locale: string, row: WatchRow): string | null {
  if (row.itemType === "token") return `/${locale}/token/${row.itemKey}/`;
  if (row.itemType === "wallet") return `/${locale}/wallet/${row.itemKey}/`;
  if (row.itemType === "nft_contract") return `/${locale}/nfts/${row.itemKey}/`;
  if (row.itemType === "nft_item") {
    const [contract, tokenId] = String(row.itemKey).split(":");
    if (contract && tokenId) return `/${locale}/nfts/${contract}/${encodeURIComponent(tokenId)}/`;
  }
  if (row.itemType === "tx") return `/${locale}/tx/${row.itemKey}/`;
  return null;
}

export default component$(() => {
  const loc = useLocation();
  const L = loc.params.locale || "en-us";
  const rows = useFavoritesLoader().value;
  const access = useFavoritesAccessLoader().value;
  const grouped = new Map<string, WatchRow[]>();
  for (const r of rows) {
    const k = r.itemType || "other";
    const arr = grouped.get(k) ?? [];
    arr.push(r);
    grouped.set(k, arr);
  }

  return (
    <div class="mx-auto w-full max-w-[1400px] px-2">
      <header class="mb-6 rounded-2xl border border-[#043234] bg-[#001318]/70 p-5">
        <h1 class="text-2xl font-semibold text-white">My favorites</h1>
        <p class="mt-1 text-sm text-slate-400">
          Tokens, wallets, NFTs and other entities you marked as favorites.
        </p>
      </header>

      {!access.isAuthenticated ? (
        <p class="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          Debes iniciar sesión para usar favoritos.
        </p>
      ) : rows.length === 0 ? (
        <p class="rounded-xl border border-[#043234] bg-[#001318]/50 p-6 text-sm text-slate-400">
          Aún no tienes favoritos. Desde `Bubbles` puedes usar el botón ☆ para comenzar.
        </p>
      ) : (
        <div class="space-y-5">
          {[...grouped.entries()].map(([type, items]) => (
            <section key={type} class="rounded-xl border border-[#043234] bg-[#001318]/50">
              <div class="border-b border-[#043234] px-4 py-3 text-sm font-semibold text-[#04E6E6]">
                {type} ({items.length})
              </div>
              <ul class="divide-y divide-[#043234]/70">
                {items.map((r) => {
                  const href = itemHref(L, r);
                  return (
                    <li key={r.id} class="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                      <div class="min-w-0">
                        {href ? (
                          <Link href={href} class="font-medium text-white hover:text-[#04E6E6]">
                            {r.label || r.itemKey}
                          </Link>
                        ) : (
                          <span class="font-medium text-white">{r.label || r.itemKey}</span>
                        )}
                        <p class="mt-0.5 text-xs text-slate-500">{r.itemKey}</p>
                      </div>
                      <button
                        type="button"
                        class="rounded border border-rose-500/35 px-2 py-1 text-xs text-rose-200 hover:bg-rose-950/30"
                        onClick$={async () => {
                          await removeWatchlistItem({ itemType: r.itemType as any, itemKey: r.itemKey });
                          window.location.reload();
                        }}
                      >
                        Remove
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
});
