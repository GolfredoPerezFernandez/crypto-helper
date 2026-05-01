import { component$ } from "@builder.io/qwik";
import { Link, routeLoader$, useLocation } from "@builder.io/qwik-city";
import { useDashboardAuth } from "../../layout";
import {
  fetchMoralisMultipleNftMetadata,
  fetchMoralisNftCollectionMetadata,
  fetchMoralisNftCollectionSalePrices,
  fetchMoralisNftCollectionStats,
  fetchMoralisNftTraitsPaginate,
  fetchMoralisNftsByContract,
} from "~/server/crypto-helper/moralis-api";
import { nftImage } from "~/server/crypto-helper/wallet-snapshot";
import { formatTokenUsdPrice } from "~/utils/format-market";

function moralisNftRows(data: unknown): Record<string, unknown>[] {
  if (data == null) return [];
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  if (typeof data === "object") {
    const o = data as Record<string, unknown>;
    if (Array.isArray(o.result)) return o.result as Record<string, unknown>[];
  }
  return [];
}

function cursorFromResponse(data: unknown): string | null {
  if (data && typeof data === "object") {
    const c = (data as Record<string, unknown>).cursor;
    if (typeof c === "string" && c.length > 0) return c;
  }
  return null;
}

function batchNftRows(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  if (data != null && typeof data === "object") {
    const o = data as Record<string, unknown>;
    if (Array.isArray(o.result)) return o.result as Record<string, unknown>[];
  }
  return [];
}

type TraitRow = {
  trait_type: string;
  trait_value: string;
  count: number;
  percentage: number;
  rarity_label: string;
};

function moralisTraitRows(data: unknown): TraitRow[] {
  return moralisNftRows(data)
    .map((r) => ({
      trait_type: String(r.trait_type ?? ""),
      trait_value: String(r.trait_value ?? ""),
      count: typeof r.count === "number" ? r.count : Number(r.count) || 0,
      percentage: typeof r.percentage === "number" ? r.percentage : Number(r.percentage) || 0,
      rarity_label: String(r.rarity_label ?? ""),
    }))
    .filter((t) => t.trait_type.length > 0 || t.trait_value.length > 0);
}

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

function soldPricePayload(data: unknown): Record<string, unknown> | null {
  if (data == null || typeof data !== "object" || Array.isArray(data)) return null;
  return data as Record<string, unknown>;
}

function fmtNftSaleLine(rec: unknown): string {
  if (rec == null || typeof rec !== "object") return "—";
  const o = rec as Record<string, unknown>;
  const pay = o.payment_token as Record<string, unknown> | undefined;
  const sym = pay?.token_symbol != null ? String(pay.token_symbol) : "";
  const pf = o.price_formatted != null ? String(o.price_formatted) : "";
  const usd = o.usd_price_at_sale != null ? String(o.usd_price_at_sale) : null;
  const tid = o.token_id != null ? `#${String(o.token_id)} · ` : "";
  const native = pf && sym ? `${tid}${pf} ${sym}` : pf ? `${tid}${pf}` : tid ? `${tid}—` : "—";
  if (usd != null && usd !== "" && native !== "—") return `${native} · ~$${formatTokenUsdPrice(usd)}`;
  return native;
}

function fmtNftAverageSale(rec: unknown): string {
  if (rec == null || typeof rec !== "object") return "—";
  const o = rec as Record<string, unknown>;
  const pf = o.price_formatted != null ? String(o.price_formatted) : "";
  const usd = o.current_usd_value != null ? String(o.current_usd_value) : null;
  const parts: string[] = [];
  if (pf) parts.push(pf);
  if (usd != null && usd !== "") parts.push(`~$${formatTokenUsdPrice(usd)}`);
  return parts.length ? parts.join(" · ") : "—";
}

function nftCollectionListUrl(
  locale: string,
  contract: string,
  o: {
    chain: string;
    cursor?: string | null;
    traitsCursor?: string | null;
    saleDays: number;
  },
  overrides?: { cursor?: string | null; traits_cursor?: string | null; sale_days?: number },
): string {
  const p = new URLSearchParams();
  p.set("chain", o.chain);
  const cur = overrides?.cursor !== undefined ? overrides.cursor : o.cursor;
  const tc = overrides?.traits_cursor !== undefined ? overrides.traits_cursor : o.traitsCursor;
  const sd = overrides?.sale_days !== undefined ? overrides.sale_days : o.saleDays;
  if (cur) p.set("cursor", cur);
  if (tc) p.set("traits_cursor", tc);
  if (sd != null && sd !== 7) p.set("sale_days", String(sd));
  return `/${locale}/nfts/${contract}/?${p.toString()}`;
}

export const useNftCollectionLoader = routeLoader$(async (ev) => {
  const raw = ev.params.contract?.trim() ?? "";
  if (!/^0x[a-fA-F0-9]{40}$/.test(raw)) {
    throw ev.error(404, { message: "Invalid NFT contract address" });
  }
  const contract = raw.toLowerCase();
  const chain = (ev.url.searchParams.get("chain")?.trim() || "eth").toLowerCase();
  const cursor = ev.url.searchParams.get("cursor")?.trim() || undefined;
  const traitsCursor = ev.url.searchParams.get("traits_cursor")?.trim() || undefined;
  const saleDaysRaw = ev.url.searchParams.get("sale_days")?.trim();
  let saleDays = 7;
  if (saleDaysRaw != null) {
    const n = parseInt(saleDaysRaw, 10);
    if (Number.isFinite(n)) saleDays = Math.min(365, Math.max(0, n));
  }

  if (!process.env.MORALIS_API_KEY?.trim()) {
    return {
      contract,
      chain,
      cursor: cursor ?? null,
      traitsCursor: traitsCursor ?? null,
      saleDays,
      nextCursor: null as string | null,
      traitsNextCursor: null as string | null,
      missingKey: true as const,
      meta: { ok: false as const, error: "MORALIS_API_KEY no configurada" },
      stats: { ok: false as const, error: "—" },
      traits: { ok: false as const, error: "—" },
      salePrices: { ok: false as const, error: "—" },
      list: { ok: false as const, error: "—" },
    };
  }

  const [meta, stats, traits, salePrices, list] = await Promise.all([
    fetchMoralisNftCollectionMetadata(contract, chain, true),
    fetchMoralisNftCollectionStats(contract, chain),
    fetchMoralisNftTraitsPaginate(contract, chain, {
      limit: 50,
      cursor: traitsCursor,
      order: "DESC",
    }),
    fetchMoralisNftCollectionSalePrices(contract, chain, saleDays),
    fetchMoralisNftsByContract(contract, chain, {
      limit: 40,
      cursor,
      include_prices: true,
      media_items: true,
    }),
  ]);

  const nextCursor = list.ok ? cursorFromResponse(list.data) : null;
  const traitsNextCursor = traits.ok ? cursorFromResponse(traits.data) : null;

  let listOut = list;
  if (list.ok && !cursor) {
    const firstRows = moralisNftRows(list.data);
    const needsBatch =
      firstRows.length > 0 &&
      firstRows.length <= 25 &&
      firstRows.some((r) => r.normalized_metadata == null && r.normalizedMetadata == null);
    if (needsBatch) {
      const tokens = firstRows
        .map((r) => ({
          token_address: contract,
          token_id: String(r.token_id ?? r.tokenId ?? ""),
        }))
        .filter((t) => t.token_id);
      const batch = await fetchMoralisMultipleNftMetadata(chain, tokens, { media_items: true });
      if (batch.ok) {
        const enriched = batchNftRows(batch.data);
        const byId = new Map(enriched.map((e) => [String(e.token_id ?? e.tokenId ?? ""), e]));
        const merged = firstRows.map((r) => {
          const id = String(r.token_id ?? r.tokenId ?? "");
          const b = byId.get(id);
          return b ? { ...r, ...b } : r;
        });
        listOut =
          Array.isArray(list.data) || list.data == null
            ? { ok: true as const, data: { result: merged } }
            : { ok: true as const, data: { ...(list.data as Record<string, unknown>), result: merged } };
      }
    }
  }

  return {
    contract,
    chain,
    cursor: cursor ?? null,
    traitsCursor: traitsCursor ?? null,
    saleDays,
    nextCursor,
    traitsNextCursor,
    missingKey: false as const,
    meta,
    stats,
    traits,
    salePrices,
    list: listOut,
  };
});

export default component$(() => {
  useDashboardAuth();
  const loc = useLocation();
  const L = loc.params.locale || "en-us";
  const d = useNftCollectionLoader();
  const v = d.value;

  const metaRec = v.meta.ok ? collectionMetaRecord(v.meta.data) : null;
  const statsData = v.stats.ok && v.stats.data && typeof v.stats.data === "object" ? (v.stats.data as Record<string, unknown>) : null;
  const ownersBlock = statsData?.owners as Record<string, unknown> | undefined;
  const transfersBlock = statsData?.transfers as Record<string, unknown> | undefined;
  const rows = v.list.ok ? moralisNftRows(v.list.data) : [];
  const traitRows = v.traits.ok ? moralisTraitRows(v.traits.data) : [];
  const saleRec = v.salePrices.ok ? (soldPricePayload(v.salePrices.data) ?? {}) : null;

  const chainQs = `chain=${encodeURIComponent(v.chain)}`;
  const urlCtx = {
    chain: v.chain,
    cursor: v.cursor,
    traitsCursor: v.traitsCursor,
    saleDays: v.saleDays,
  };

  const nextHref =
    v.nextCursor && v.nextCursor !== (v.cursor ?? "")
      ? nftCollectionListUrl(L, v.contract, urlCtx, { cursor: v.nextCursor })
      : null;

  const traitsNextHref =
    v.traitsNextCursor && v.traitsNextCursor !== (v.traitsCursor ?? "")
      ? nftCollectionListUrl(L, v.contract, urlCtx, { traits_cursor: v.traitsNextCursor })
      : null;

  return (
    <div class="mx-auto w-full max-w-[1700px] 2xl:max-w-[1900px] px-1 2xl:px-3">
      <Link href={`/${L}/nfts/`} class="text-sm text-[#04E6E6] hover:underline mb-4 inline-block">
        ← NFT collections
      </Link>

      <div class="rounded-2xl border border-[#043234]/90 bg-gradient-to-br from-[#001a1c] via-[#001318] to-[#000a0c] p-5 sm:p-6 2xl:p-7 mb-8">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-start">
          {metaRec?.collection_logo || metaRec?.collection_banner_image ? (
            <img
              src={String(metaRec.collection_logo || metaRec.collection_banner_image)}
              alt=""
              class="h-20 w-20 sm:h-24 sm:w-24 rounded-xl object-cover ring-1 ring-[#043234]/60 shrink-0"
              width={96}
              height={96}
              loading="eager"
            />
          ) : (
            <div class="flex h-20 w-20 items-center justify-center rounded-xl bg-[#043234]/50 text-sm text-slate-500 shrink-0">
              NFT
            </div>
          )}
          <div class="min-w-0 flex-1">
            <h1 class="text-2xl font-bold tracking-tight text-[#04E6E6] sm:text-3xl">
              {String(metaRec?.name ?? "Colección")}
            </h1>
            <p class="mt-1 font-mono text-xs text-slate-500 break-all">{v.contract}</p>
            <p class="mt-2 text-xs text-slate-500">
              Red: <span class="font-mono text-slate-400">{v.chain}</span>
            </p>
          </div>
        </div>

        {v.missingKey ? (
          <p class="mt-4 text-sm text-amber-300">Los datos de esta colección no están disponibles (revisa la configuración del servidor).</p>
        ) : null}
        {!v.meta.ok && !v.missingKey ? (
          <p class="mt-4 text-sm text-rose-400/90">Metadata: {v.meta.error}</p>
        ) : null}
        {!v.stats.ok && !v.missingKey ? (
          <p class="mt-2 text-sm text-amber-400/80">Stats: {v.stats.error}</p>
        ) : null}
        {!v.traits.ok && !v.missingKey ? (
          <p class="mt-2 text-sm text-amber-400/80">Rasgos: {v.traits.error}</p>
        ) : null}
        {!v.salePrices.ok && !v.missingKey ? (
          <p class="mt-2 text-sm text-amber-400/80">Ventas: {v.salePrices.error}</p>
        ) : null}

        {metaRec ? (
          <dl class="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            {metaRec.symbol ? (
              <div>
                <dt class="text-slate-500">Símbolo</dt>
                <dd class="text-slate-200 font-medium">{String(metaRec.symbol)}</dd>
              </div>
            ) : null}
            {metaRec.contract_type ? (
              <div>
                <dt class="text-slate-500">Tipo</dt>
                <dd class="text-slate-200">{String(metaRec.contract_type)}</dd>
              </div>
            ) : null}
            {metaRec.floor_price_usd != null ? (
              <div>
                <dt class="text-slate-500">Floor USD</dt>
                <dd class="text-[#04E6E6] tabular-nums">${formatTokenUsdPrice(metaRec.floor_price_usd as string | number | null | undefined)}</dd>
              </div>
            ) : metaRec.floor_price != null ? (
              <div>
                <dt class="text-slate-500">Floor</dt>
                <dd class="text-slate-200 tabular-nums">
                  {String(metaRec.floor_price)} {String(metaRec.floor_price_currency ?? "")}
                </dd>
              </div>
            ) : null}
            {metaRec.verified_collection === true ? (
              <div>
                <dt class="text-slate-500">Verificación</dt>
                <dd class="text-emerald-400">Colección verificada</dd>
              </div>
            ) : null}
            {metaRec.possible_spam === true ? (
              <div class="col-span-2">
                <span class="text-[10px] font-semibold uppercase text-amber-300">Posible spam</span>
              </div>
            ) : null}
          </dl>
        ) : null}

        {statsData ? (
          <dl class="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs border-t border-[#043234]/50 pt-4">
            <div>
              <dt class="text-slate-500">Tokens (total)</dt>
              <dd class="text-slate-200 tabular-nums">{String(statsData.total_tokens ?? "—")}</dd>
            </div>
            <div>
              <dt class="text-slate-500">Propietarios</dt>
              <dd class="text-slate-200 tabular-nums">{String(ownersBlock?.current ?? "—")}</dd>
            </div>
            <div>
              <dt class="text-slate-500">Transferencias</dt>
              <dd class="text-slate-200 tabular-nums">{String(transfersBlock?.total ?? "—")}</dd>
            </div>
          </dl>
        ) : null}

        {v.salePrices.ok && saleRec ? (
          <div class="mt-4 border-t border-[#043234]/50 pt-4">
            <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h2 class="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Ventas de la colección
              </h2>
              <div class="flex flex-wrap items-center gap-1 text-[10px]">
                <span class="text-slate-600">Ventana (días):</span>
                {([7, 30, 90, 365] as const).map((d) => (
                  <Link
                    key={d}
                    href={nftCollectionListUrl(L, v.contract, urlCtx, { sale_days: d })}
                    class={
                      v.saleDays === d
                        ? "rounded-md bg-[#04E6E6]/20 px-2 py-0.5 font-medium text-[#04E6E6]"
                        : "rounded-md px-2 py-0.5 text-slate-500 hover:bg-[#043234]/60 hover:text-slate-300"
                    }
                  >
                    {d === 365 ? "1a" : `${d}d`}
                  </Link>
                ))}
              </div>
            </div>
            {saleRec.message != null && String(saleRec.message).trim() !== "" ? (
              <p class="mb-2 text-[11px] text-amber-400/90">{String(saleRec.message)}</p>
            ) : null}
            <dl class="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
              <div>
                <dt class="text-slate-500">Última venta</dt>
                <dd class="mt-0.5 text-slate-200">{fmtNftSaleLine(saleRec.last_sale)}</dd>
              </div>
              <div>
                <dt class="text-slate-500">Venta más baja</dt>
                <dd class="mt-0.5 text-slate-200">{fmtNftSaleLine(saleRec.lowest_sale)}</dd>
              </div>
              <div>
                <dt class="text-slate-500">Venta más alta</dt>
                <dd class="mt-0.5 text-slate-200">{fmtNftSaleLine(saleRec.highest_sale)}</dd>
              </div>
              <div>
                <dt class="text-slate-500">Promedio</dt>
                <dd class="mt-0.5 text-slate-200">{fmtNftAverageSale(saleRec.average_sale)}</dd>
              </div>
              {saleRec.total_trades != null ? (
                <div class="sm:col-span-2">
                  <dt class="text-slate-500">Operaciones en el periodo</dt>
                  <dd class="mt-0.5 tabular-nums text-[#04E6E6]">{String(saleRec.total_trades)}</dd>
                </div>
              ) : null}
            </dl>
          </div>
        ) : null}

        {metaRec?.project_url ? (
          <a
            href={String(metaRec.project_url)}
            target="_blank"
            rel="noreferrer"
            class="mt-4 inline-block text-sm text-[#04E6E6] hover:underline"
          >
            Sitio del proyecto
          </a>
        ) : null}
      </div>

      {v.traits.ok && traitRows.length > 0 ? (
        <div class="mb-10 rounded-2xl border border-[#043234]/90 bg-[#001318]/60 p-4 sm:p-5">
          <div class="mb-3 flex flex-wrap items-end justify-between gap-2">
            <h2 class="text-lg font-semibold text-[#04E6E6]">Rasgos de la colección</h2>
          </div>
          <div class="overflow-x-auto rounded-xl border border-[#043234]/60">
            <table class="w-full min-w-[520px] text-left text-xs text-slate-200">
              <thead class="border-b border-[#043234]/80 bg-[#001a1c]/90 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th class="px-3 py-2">Atributo</th>
                  <th class="px-3 py-2">Valor</th>
                  <th class="px-3 py-2 text-right tabular-nums">Cantidad</th>
                  <th class="px-3 py-2 text-right tabular-nums">%</th>
                  <th class="px-3 py-2">Rareza</th>
                </tr>
              </thead>
              <tbody>
                {traitRows.map((tr, i) => (
                  <tr key={`${tr.trait_type}-${tr.trait_value}-${i}`} class="border-b border-[#043234]/40 last:border-0">
                    <td class="max-w-[140px] px-3 py-2 font-medium text-slate-300">{tr.trait_type}</td>
                    <td class="max-w-[180px] px-3 py-2 text-slate-400">{tr.trait_value}</td>
                    <td class="px-3 py-2 text-right tabular-nums text-slate-300">{tr.count}</td>
                    <td class="px-3 py-2 text-right tabular-nums text-[#04E6E6]/90">
                      {Number.isFinite(tr.percentage) ? tr.percentage.toFixed(1) : "—"}%
                    </td>
                    <td class="px-3 py-2 text-[11px] text-slate-500">{tr.rarity_label}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {traitsNextHref ? (
            <div class="mt-4 flex justify-center">
              <Link
                href={traitsNextHref}
                class="rounded-xl border border-[#04E6E6]/35 bg-[#04E6E6]/10 px-4 py-2 text-sm font-medium text-[#04E6E6] hover:bg-[#04E6E6]/20"
              >
                Más combinaciones de rasgos →
              </Link>
            </div>
          ) : null}
        </div>
      ) : v.traits.ok && traitRows.length === 0 && !v.missingKey ? (
        <p class="mb-8 text-sm text-slate-500">
          Sin filas de rasgos para esta colección en esta página (puede no estar indexada o no tener metadata de traits).
        </p>
      ) : null}

      <h2 class="text-lg font-semibold text-white mb-2">NFTs en esta colección</h2>
      {!v.list.ok && !v.missingKey ? (
        <p class="text-sm text-rose-400/90 mb-4">{v.list.error}</p>
      ) : null}

      {rows.length === 0 && v.list.ok ? (
        <p class="text-sm text-slate-500 rounded-xl border border-[#043234]/80 bg-[#001318]/40 p-8 text-center">
          Sin ítems en esta página (la colección puede estar vacía o sin indexar aún).
        </p>
      ) : (
        <ul class="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {rows.map((n, i) => {
            const tid = String(n.token_id ?? n.tokenId ?? i);
            const img = nftImage(n);
            const nm = n.normalized_metadata as { name?: string } | undefined;
            const title = String(nm?.name ?? n.name ?? n.symbol ?? `Token #${tid}`);
            const floorUsd = n.floor_price_usd ?? n.floorPriceUsd;
            const itemHref = `/${L}/nfts/${v.contract}/${encodeURIComponent(tid)}/?${chainQs}`;
            return (
              <li key={`${v.contract}-${tid}-${i}`}>
                <Link
                  href={itemHref}
                  class="flex h-full flex-col rounded-2xl border border-[#043234]/90 bg-[#001a1c]/80 p-3 shadow-lg ring-1 ring-white/[0.04] transition hover:border-[#04E6E6]/35"
                >
                  {img ? (
                    <img
                      src={img}
                      alt=""
                      class="mb-2 aspect-square w-full rounded-xl object-cover ring-1 ring-[#043234]/60"
                      width={280}
                      height={280}
                      loading="lazy"
                    />
                  ) : (
                    <div class="mb-2 flex aspect-square w-full items-center justify-center rounded-xl bg-[#043234]/40 text-xs text-slate-500">
                      Sin imagen
                    </div>
                  )}
                  <h3 class="text-sm font-medium leading-snug text-white line-clamp-2">{title}</h3>
                  <p class="mt-1 font-mono text-[10px] text-slate-500">#{tid}</p>
                  {floorUsd != null ? (
                    <p class="mt-2 text-xs tabular-nums text-[#04E6E6]">Floor ~ ${formatTokenUsdPrice(floorUsd as string | number | null | undefined)}</p>
                  ) : null}
                  {n.rarity_rank != null ? (
                    <p class="mt-1 text-[10px] text-slate-500">Rarity rank {String(n.rarity_rank)}</p>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {nextHref ? (
        <div class="mt-8 flex justify-center">
          <Link
            href={nextHref}
            class="rounded-xl border border-[#04E6E6]/40 bg-[#04E6E6]/10 px-4 py-2 text-sm font-medium text-[#04E6E6] hover:bg-[#04E6E6]/20"
          >
            Siguiente página →
          </Link>
        </div>
      ) : null}
    </div>
  );
});
