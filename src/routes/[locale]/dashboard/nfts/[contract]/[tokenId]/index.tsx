import { component$ } from "@builder.io/qwik";
import { Link, routeLoader$, useLocation } from "@builder.io/qwik-city";
import { useDashboardAuth } from "../../../layout";
import {
  fetchMoralisNftCollectionMetadata,
  fetchMoralisNftMetadata,
} from "~/server/crypto-ghost/moralis-api";
import { nftImage } from "~/server/crypto-ghost/wallet-snapshot";
import { formatTokenUsdPrice } from "~/utils/format-market";
import { EvmAddrLinks, TxHashLink } from "~/components/crypto-dashboard/evm-dash-links";

function collectionMetaRecord(data: unknown): Record<string, unknown> | null {
  if (data == null || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  if (o.token_address != null || o.name != null) return o;
  const inner = o.data;
  if (inner != null && typeof inner === "object" && !Array.isArray(inner)) {
    const n = inner as Record<string, unknown>;
    if (n.token_address != null || n.name != null) return n;
  }
  return o;
}

export const useNftTokenLoader = routeLoader$(async (ev) => {
  const raw = ev.params.contract?.trim() ?? "";
  if (!/^0x[a-fA-F0-9]{40}$/.test(raw)) {
    throw ev.error(404, { message: "Invalid NFT contract address" });
  }
  const contract = raw.toLowerCase();
  const tokenId = ev.params.tokenId?.trim() ?? "";
  if (!tokenId) {
    throw ev.error(404, { message: "Missing token id" });
  }
  const chain = (ev.url.searchParams.get("chain")?.trim() || "eth").toLowerCase();

  if (!process.env.MORALIS_API_KEY?.trim()) {
    return {
      contract,
      tokenId,
      chain,
      missingKey: true as const,
      nft: { ok: false as const, error: "MORALIS_API_KEY no configurada" },
      collMeta: { ok: false as const, error: "—" },
    };
  }

  const [nft, collMeta] = await Promise.all([
    fetchMoralisNftMetadata(contract, tokenId, chain, {
      include_prices: true,
      media_items: true,
    }),
    fetchMoralisNftCollectionMetadata(contract, chain, true),
  ]);

  return {
    contract,
    tokenId,
    chain,
    missingKey: false as const,
    nft,
    collMeta,
  };
});

export default component$(() => {
  useDashboardAuth();
  const loc = useLocation();
  const L = loc.params.locale || "en-us";
  const d = useNftTokenLoader();
  const v = d.value;
  const chainQs = `chain=${encodeURIComponent(v.chain)}`;

  const coll = v.collMeta.ok ? collectionMetaRecord(v.collMeta.data) : null;
  const nftData = v.nft.ok && v.nft.data && typeof v.nft.data === "object" ? (v.nft.data as Record<string, unknown>) : null;
  const norm = nftData?.normalized_metadata as Record<string, unknown> | undefined;
  const attrs = Array.isArray(norm?.attributes) ? (norm.attributes as Record<string, unknown>[]) : [];
  const lastSale = nftData?.last_sale as Record<string, unknown> | undefined;
  const listPrice = nftData?.list_price as Record<string, unknown> | undefined;
  const pay = lastSale?.payment_token as Record<string, unknown> | undefined;

  const img = nftData ? nftImage(nftData) : null;
  const title = String(norm?.name ?? nftData?.name ?? coll?.name ?? "NFT");

  return (
    <div class="max-w-4xl">
      <Link
        href={`/${L}/nfts/${v.contract}/?${chainQs}`}
        class="text-sm text-[#04E6E6] hover:underline mb-4 inline-block"
      >
        ← {String(coll?.name ?? "Colección")}
      </Link>

      <div class="rounded-2xl border border-[#043234]/90 bg-[#001a1c]/90 p-5 sm:p-6">
        <h1 class="text-2xl font-bold text-[#04E6E6] mb-1">{title}</h1>
        <p class="font-mono text-xs text-slate-500 break-all mb-6 flex flex-wrap items-center gap-x-2 gap-y-1">
          <EvmAddrLinks locale={L} moralisChain={v.chain} address={v.contract} variant="nft" />
          <span class="text-slate-600">·</span>
          <span>#{v.tokenId}</span>
        </p>

        {v.missingKey ? (
          <p class="text-sm text-amber-300">Los datos no están disponibles (revisa la configuración del servidor).</p>
        ) : !v.nft.ok ? (
          <p class="text-sm text-rose-400/90">{v.nft.error}</p>
        ) : (
          <div class="grid gap-6 sm:grid-cols-[minmax(0,280px)_1fr]">
            <div>
              {img ? (
                <img
                  src={img}
                  alt=""
                  class="w-full max-w-[280px] rounded-xl object-cover ring-1 ring-[#043234]/60"
                  width={280}
                  height={280}
                  loading="eager"
                />
              ) : (
                <div class="flex aspect-square max-w-[280px] items-center justify-center rounded-xl bg-[#043234]/40 text-slate-500">
                  Sin imagen
                </div>
              )}
            </div>
            <div class="min-w-0 space-y-4 text-sm">
              <dl class="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                {nftData?.owner_of ? (
                  <div class="sm:col-span-2">
                    <dt class="text-slate-500">Propietario</dt>
                    <dd>
                      <Link
                        href={`/${L}/wallet/${String(nftData.owner_of).toLowerCase()}/`}
                        class="font-mono text-[11px] text-[#04E6E6] hover:underline break-all"
                      >
                        {String(nftData.owner_of)}
                      </Link>
                    </dd>
                  </div>
                ) : null}
                {nftData?.contract_type ? (
                  <div>
                    <dt class="text-slate-500">Estándar</dt>
                    <dd class="text-slate-200">{String(nftData.contract_type)}</dd>
                  </div>
                ) : null}
                {nftData?.amount != null && String(nftData.amount) !== "1" ? (
                  <div>
                    <dt class="text-slate-500">Cantidad (ERC1155)</dt>
                    <dd class="text-slate-200 tabular-nums">{String(nftData.amount)}</dd>
                  </div>
                ) : null}
                {nftData?.rarity_rank != null ? (
                  <div>
                    <dt class="text-slate-500">Rarity rank</dt>
                    <dd class="text-slate-200 tabular-nums">{String(nftData.rarity_rank)}</dd>
                  </div>
                ) : null}
                {nftData?.rarity_label ? (
                  <div>
                    <dt class="text-slate-500">Rarity</dt>
                    <dd class="text-slate-200">{String(nftData.rarity_label)}</dd>
                  </div>
                ) : null}
                {nftData?.floor_price_usd != null ? (
                  <div>
                    <dt class="text-slate-500">Floor colección (USD)</dt>
                    <dd class="text-[#04E6E6] tabular-nums">${formatTokenUsdPrice(nftData.floor_price_usd)}</dd>
                  </div>
                ) : null}
                {nftData?.possible_spam === true ? (
                  <div class="sm:col-span-2">
                    <span class="text-[10px] font-semibold uppercase text-amber-300">Posible spam</span>
                  </div>
                ) : null}
              </dl>

              {norm?.description ? (
                <div>
                  <h2 class="text-xs font-semibold text-slate-400 mb-1">Descripción</h2>
                  <p class="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {String(norm.description).slice(0, 2000)}
                    {String(norm.description).length > 2000 ? "…" : ""}
                  </p>
                </div>
              ) : null}

              {lastSale && lastSale.transaction_hash ? (
                <div class="rounded-xl border border-[#043234]/60 bg-black/20 p-3 text-xs">
                  <h2 class="font-semibold text-[#04E6E6] mb-2">Última venta</h2>
                  <dl class="space-y-1">
                    <div class="flex flex-wrap gap-x-2">
                      <dt class="text-slate-500">Precio</dt>
                      <dd class="text-slate-200">
                        {lastSale.price_formatted != null
                          ? `${String(lastSale.price_formatted)} ${pay?.token_symbol ?? ""}`
                          : String(lastSale.price ?? "—")}
                      </dd>
                    </div>
                    {lastSale.usd_price_at_sale != null ? (
                      <div>
                        <dt class="text-slate-500 inline">USD en venta</dt>{" "}
                        <dd class="inline text-slate-200">${String(lastSale.usd_price_at_sale)}</dd>
                      </div>
                    ) : null}
                    <div class="font-mono text-[10px] text-slate-500 break-all">
                      {String(lastSale.block_timestamp ?? "")}
                    </div>
                    {lastSale.transaction_hash || lastSale.transactionHash ? (
                      <div class="mt-2">
                        <dt class="text-slate-500 inline mr-1">Tx</dt>
                        <dd class="inline">
                          <TxHashLink
                            locale={L}
                            moralisChain={v.chain}
                            hash={String(lastSale.transaction_hash ?? lastSale.transactionHash)}
                            mode="hash10"
                          />
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                </div>
              ) : null}

              {listPrice && listPrice.listed === true ? (
                <div class="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3 text-xs">
                  <h2 class="font-semibold text-emerald-300 mb-1">Listado</h2>
                  <p class="text-slate-300">
                    {listPrice.price_usd != null
                      ? `~ $${formatTokenUsdPrice(listPrice.price_usd)}`
                      : String(listPrice.price ?? "—")}{" "}
                    {listPrice.marketplace ? (
                      <span class="text-slate-500">· {String(listPrice.marketplace)}</span>
                    ) : null}
                  </p>
                </div>
              ) : null}

              {attrs.length > 0 ? (
                <div>
                  <h2 class="text-xs font-semibold text-slate-400 mb-2">Atributos</h2>
                  <ul class="flex flex-wrap gap-2">
                    {attrs.map((a, i) => (
                      <li
                        key={i}
                        class="rounded-lg border border-[#043234]/80 bg-black/25 px-2 py-1 text-[11px] text-slate-300"
                      >
                        <span class="text-slate-500">{String(a.trait_type ?? "—")}: </span>
                        <span>{String((a.value as string | number | undefined) ?? "—")}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
