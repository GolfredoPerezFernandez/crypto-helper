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
import { HelpTooltip } from "~/components/ui/help-tooltip";

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

function fmtInt(value: unknown): string {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return "—";
  return Math.trunc(n).toLocaleString(undefined);
}

function fmtNativeAmount(raw: unknown): string {
  if (raw == null) return "";
  const asNum = typeof raw === "number" ? raw : Number(raw);
  if (Number.isFinite(asNum)) {
    return asNum.toLocaleString(undefined, { maximumFractionDigits: 4 });
  }
  const s = String(raw).trim();
  if (!s) return "";
  const n = Number(s);
  if (Number.isFinite(n)) {
    return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
  }
  return s;
}

function fmtDateFromRec(rec: Record<string, unknown>): string | null {
  const raw =
    rec.block_timestamp ??
    rec.blockTime ??
    rec.timestamp ??
    rec.date ??
    rec.sale_time ??
    rec.sold_at;
  if (raw == null) return null;
  const d = new Date(String(raw));
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function fmtNftSaleLine(rec: unknown): string {
  if (rec == null || typeof rec !== "object") return "—";
  const o = rec as Record<string, unknown>;
  const pay = o.payment_token as Record<string, unknown> | undefined;
  const sym = pay?.token_symbol != null ? String(pay.token_symbol) : "";
  const pf = fmtNativeAmount(o.price_formatted);
  const usd = o.usd_price_at_sale != null ? String(o.usd_price_at_sale) : null;
  const tid = o.token_id != null ? `#${String(o.token_id)} · ` : "";
  const native = pf && sym ? `${tid}${pf} ${sym}` : pf ? `${tid}${pf}` : tid ? `${tid}—` : "—";
  const date = fmtDateFromRec(o);
  const withUsd = usd != null && usd !== "" && native !== "—" ? `${native} · ~$${formatTokenUsdPrice(usd)}` : native;
  return date ? `${withUsd} · ${date}` : withUsd;
}

function fmtNftAverageSale(rec: unknown): string {
  if (rec == null || typeof rec !== "object") return "—";
  const o = rec as Record<string, unknown>;
  const pf = fmtNativeAmount(o.price_formatted);
  const usd = o.current_usd_value != null ? String(o.current_usd_value) : null;
  const parts: string[] = [];
  if (pf) parts.push(pf);
  if (usd != null && usd !== "") parts.push(`~$${formatTokenUsdPrice(usd)}`);
  return parts.length ? parts.join(" · ") : "—";
}

function fmtCompact(value: unknown): string {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

function parseSortableTokenId(value: unknown): bigint | null {
  const s = String(value ?? "").trim();
  if (!s || !/^\d+$/.test(s)) return null;
  try {
    return BigInt(s);
  } catch {
    return null;
  }
}

function rarityToneFromRank(raw: unknown): { label: string; className: string } | null {
  const rank = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(rank) || rank <= 0) return null;
  if (rank <= 100) {
    return {
      label: `Top ${Math.trunc(rank)}`,
      className: "border-fuchsia-400/35 bg-fuchsia-500/15 text-fuchsia-200",
    };
  }
  if (rank <= 1000) {
    return {
      label: `Top ${Math.trunc(rank)}`,
      className: "border-[#04E6E6]/35 bg-[#04E6E6]/15 text-[#8df6f6]",
    };
  }
  return {
    label: `Rank ${fmtInt(rank)}`,
    className: "border-slate-500/35 bg-slate-500/10 text-slate-300",
  };
}

function nftTraitsPreview(n: Record<string, unknown>): string[] {
  const md = n.normalized_metadata as Record<string, unknown> | undefined;
  const attrs = md?.attributes;
  if (!Array.isArray(attrs)) return [];
  return attrs
    .map((a) => {
      if (a == null || typeof a !== "object") return "";
      const row = a as Record<string, unknown>;
      const t = String(row.trait_type ?? row.type ?? "").trim();
      const v = String(row.value ?? "").trim();
      if (!t || !v) return "";
      return `${t}: ${v}`;
    })
    .filter(Boolean)
    .slice(0, 2);
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
  const rowsSorted = rows
    .map((n, idx) => ({ n, idx }))
    .sort((a, b) => {
      const aId = parseSortableTokenId(a.n.token_id ?? a.n.tokenId);
      const bId = parseSortableTokenId(b.n.token_id ?? b.n.tokenId);
      if (aId != null && bId != null) {
        if (aId < bId) return -1;
        if (aId > bId) return 1;
      } else if (aId != null) {
        return -1;
      } else if (bId != null) {
        return 1;
      }
      const aName = String((a.n.normalized_metadata as { name?: string } | undefined)?.name ?? a.n.name ?? "");
      const bName = String((b.n.normalized_metadata as { name?: string } | undefined)?.name ?? b.n.name ?? "");
      const byName = aName.localeCompare(bName, undefined, { sensitivity: "base", numeric: true });
      if (byName !== 0) return byName;
      return a.idx - b.idx;
    })
    .map((x) => x.n);
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
    <div class="mx-auto w-full max-w-[1700px] px-1 2xl:max-w-[1900px] 2xl:px-3">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/${L}/nfts/`}
          class="inline-flex items-center gap-1 rounded-lg border border-[#043234]/80 bg-[#001318]/70 px-3 py-1.5 text-sm text-[#04E6E6] transition hover:border-[#04E6E6]/30 hover:bg-[#001a1c]"
        >
          ← NFT collections
        </Link>
        <p class="text-[11px] text-slate-500">
          Contrato <span class="font-mono text-slate-400">{v.contract.slice(0, 8)}...{v.contract.slice(-6)}</span>
        </p>
      </div>

      <div class="relative mb-8 overflow-hidden rounded-2xl border border-[#0a4d50]/90 bg-gradient-to-br from-[#001a1c] via-[#001318] to-[#000a0c] p-5 sm:p-6 2xl:p-7 shadow-[0_20px_80px_rgba(0,0,0,0.45)]">
        {metaRec?.collection_banner_image ? (
          <img
            src={String(metaRec.collection_banner_image)}
            alt=""
            class="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-22"
            loading="eager"
          />
        ) : null}
        <div class="absolute inset-0 bg-gradient-to-br from-[#001318]/55 via-[#001318]/70 to-[#000a0c]/85" />
        <div class="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-start">
          {metaRec?.collection_logo || metaRec?.collection_banner_image ? (
            <img
              src={String(metaRec.collection_logo || metaRec.collection_banner_image)}
              alt=""
              class="h-20 w-20 shrink-0 rounded-xl object-cover ring-1 ring-[#043234]/60 sm:h-24 sm:w-24"
              width={96}
              height={96}
              loading="eager"
            />
          ) : (
            <div class="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-[#043234]/50 text-sm text-slate-500">
              NFT
            </div>
          )}
          <div class="min-w-0 flex-1">
            <h1 class="text-2xl font-bold tracking-tight text-[#04E6E6] sm:text-3xl">
              {String(metaRec?.name ?? "Colección")}
            </h1>
            <p class="mt-1 break-all font-mono text-xs text-slate-300/80">{v.contract}</p>
            <div class="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
              <span class="rounded-full border border-[#0b595d]/80 bg-[#001a1c]/85 px-2.5 py-1 text-slate-100">
                Red: <span class="font-mono">{v.chain}</span>
              </span>
              {metaRec?.verified_collection === true ? (
                <span class="rounded-full border border-emerald-500/30 bg-emerald-950/40 px-2.5 py-1 text-emerald-300">
                  Verificada
                </span>
              ) : null}
              {metaRec?.possible_spam === true ? (
                <span class="rounded-full border border-amber-500/30 bg-amber-950/40 px-2.5 py-1 text-amber-300">
                  Revisar posible spam
                </span>
              ) : null}
            </div>
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

        <div class="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div class="relative rounded-xl border border-[#0b5558]/70 bg-[#001318]/82 px-3 py-2.5 backdrop-blur-sm">
            <HelpTooltip text="Total de NFTs emitidos por esta colección (según el índice actual)." placement="top-right" />
            <p class="text-[10px] uppercase tracking-wide text-slate-500">Tokens</p>
            <p class="mt-1 text-lg font-semibold tabular-nums text-white">{fmtCompact(statsData?.total_tokens)}</p>
            <p class="text-[11px] text-slate-400">{fmtInt(statsData?.total_tokens)} total</p>
          </div>
          <div class="relative rounded-xl border border-[#0b5558]/70 bg-[#001318]/82 px-3 py-2.5 backdrop-blur-sm">
            <HelpTooltip text="Cantidad estimada de wallets únicas que tienen al menos un NFT de la colección." placement="top-right" />
            <p class="text-[10px] uppercase tracking-wide text-slate-500">Propietarios</p>
            <p class="mt-1 text-lg font-semibold tabular-nums text-white">{fmtCompact(ownersBlock?.current)}</p>
            <p class="text-[11px] text-slate-400">{fmtInt(ownersBlock?.current)} wallets</p>
          </div>
          <div class="relative rounded-xl border border-[#0b5558]/70 bg-[#001318]/82 px-3 py-2.5 backdrop-blur-sm">
            <HelpTooltip text="Suma de transferencias históricas detectadas por el proveedor de datos." placement="top-right" />
            <p class="text-[10px] uppercase tracking-wide text-slate-500">Transferencias</p>
            <p class="mt-1 text-lg font-semibold tabular-nums text-white">{fmtCompact(transfersBlock?.total)}</p>
            <p class="text-[11px] text-slate-400">{fmtInt(transfersBlock?.total)} movimientos</p>
          </div>
          <div class="relative rounded-xl border border-[#0b5558]/70 bg-[#001318]/82 px-3 py-2.5 backdrop-blur-sm">
            <HelpTooltip text="Precio mínimo observado recientemente en ventas de la colección." placement="top-right" />
            <p class="text-[10px] uppercase tracking-wide text-slate-500">Floor</p>
            <p class="mt-1 text-lg font-semibold tabular-nums text-[#04E6E6]">
              {metaRec?.floor_price_usd != null
                ? `$${formatTokenUsdPrice(metaRec.floor_price_usd as string | number | null | undefined)}`
                : metaRec?.floor_price != null
                  ? `${String(metaRec.floor_price)} ${String(metaRec.floor_price_currency ?? "")}`.trim()
                  : "—"}
            </p>
          </div>
        </div>

        {Boolean(metaRec?.symbol || metaRec?.contract_type) && (
          <div class="mt-3 flex flex-wrap gap-2 text-xs">
            {metaRec?.symbol ? (
              <span class="rounded-lg border border-[#043234]/80 bg-[#001318]/70 px-2.5 py-1 text-slate-300">
                Símbolo: <span class="font-medium text-white">{String(metaRec.symbol)}</span>
              </span>
            ) : null}
            {metaRec?.contract_type ? (
              <span class="rounded-lg border border-[#043234]/80 bg-[#001318]/70 px-2.5 py-1 text-slate-300">
                Tipo: <span class="font-medium text-white">{String(metaRec.contract_type)}</span>
              </span>
            ) : null}
          </div>
        )}

        {v.salePrices.ok && saleRec ? (
          <div class="mt-5 rounded-2xl border border-[#1d6d73]/85 bg-[#000d12]/92 p-4 backdrop-blur-md shadow-[0_12px_30px_rgba(0,0,0,0.45)]">
            <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 class="inline-flex items-center text-xs font-semibold uppercase tracking-[0.12em] text-[#d8ffff]">
                Ventas de la colección
                <HelpTooltip text="Resumen de ventas recientes para la ventana de tiempo seleccionada." />
              </h2>
              <div class="flex flex-wrap items-center gap-1 text-[11px]">
                <span class="text-slate-200">Ventana (días):</span>
                {([7, 30, 90, 365] as const).map((d) => (
                  <Link
                    key={d}
                    href={nftCollectionListUrl(L, v.contract, urlCtx, { sale_days: d })}
                    class={
                      v.saleDays === d
                        ? "rounded-md border border-[#04E6E6]/60 bg-[#04E6E6]/24 px-2 py-0.5 font-semibold text-white"
                        : "rounded-md border border-[#1d6d73]/55 bg-[#00161c]/75 px-2 py-0.5 text-slate-200 hover:border-[#3d9aa1]/80 hover:bg-[#043234]/70 hover:text-white"
                    }
                  >
                    {d === 365 ? "1a" : `${d}d`}
                  </Link>
                ))}
              </div>
            </div>
            {saleRec.message != null && String(saleRec.message).trim() !== "" ? (
              <p class="mb-3 rounded-lg border border-amber-500/25 bg-amber-500/10 px-2.5 py-1.5 text-[11px] text-amber-300">
                {String(saleRec.message)}
              </p>
            ) : null}
            <dl class="grid grid-cols-1 gap-2.5 text-xs sm:grid-cols-2">
              <div class="rounded-xl border border-[#2d838a]/55 bg-[#00161b]/92 px-3 py-2.5">
                <dt class="text-[10px] uppercase tracking-wide text-slate-200">Última venta</dt>
                <dd class="mt-1 text-[13px] leading-relaxed text-white">{fmtNftSaleLine(saleRec.last_sale)}</dd>
              </div>
              <div class="rounded-xl border border-[#2d838a]/55 bg-[#00161b]/92 px-3 py-2.5">
                <dt class="text-[10px] uppercase tracking-wide text-slate-200">Venta más baja</dt>
                <dd class="mt-1 text-[13px] leading-relaxed text-white">{fmtNftSaleLine(saleRec.lowest_sale)}</dd>
              </div>
              <div class="rounded-xl border border-[#2d838a]/55 bg-[#00161b]/92 px-3 py-2.5">
                <dt class="text-[10px] uppercase tracking-wide text-slate-200">Venta más alta</dt>
                <dd class="mt-1 text-[13px] leading-relaxed text-white">{fmtNftSaleLine(saleRec.highest_sale)}</dd>
              </div>
              <div class="rounded-xl border border-[#2d838a]/55 bg-[#00161b]/92 px-3 py-2.5">
                <dt class="text-[10px] uppercase tracking-wide text-slate-200">Promedio</dt>
                <dd class="mt-1 text-[13px] leading-relaxed text-white">{fmtNftAverageSale(saleRec.average_sale)}</dd>
              </div>
              {saleRec.total_trades != null ? (
                <div class="sm:col-span-2 rounded-xl border border-[#1f6d3c]/45 bg-[#0a1b13]/65 px-3 py-2.5">
                  <dt class="text-[10px] uppercase tracking-wide text-emerald-300/80">Operaciones en el periodo</dt>
                  <dd class="mt-1 text-lg font-semibold tabular-nums text-emerald-200">{fmtInt(saleRec.total_trades)}</dd>
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
        <details
          class="group mb-10 rounded-2xl border border-[#043234]/90 bg-[#001318]/60 p-4 sm:p-5"
          open={traitRows.length <= 12}
        >
          <summary class="mb-3 flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 rounded-lg py-1 text-lg font-semibold text-[#04E6E6] outline-none marker:content-none [&::-webkit-details-marker]:hidden focus-visible:ring-2 focus-visible:ring-[#04E6E6]/40">
            <span class="flex min-w-0 flex-wrap items-center gap-2">
            <span class="inline-flex items-center">
              Rasgos de la colección
              <HelpTooltip text="Combinaciones de atributos y frecuencia de aparición en la colección." />
            </span>
              <span class="rounded-full border border-[#043234]/80 bg-[#001a1c]/90 px-2.5 py-0.5 text-[11px] font-medium tabular-nums text-slate-400">
                {traitRows.length}
              </span>
            </span>
            <span class="shrink-0 text-xs font-normal text-slate-500 transition-transform duration-200 group-open:-rotate-180">
              ▼
            </span>
          </summary>
          <div class="max-h-[min(70vh,560px)] overflow-x-auto overflow-y-auto rounded-xl border border-[#043234]/60">
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
        </details>
      ) : v.traits.ok && traitRows.length === 0 && !v.missingKey ? (
        <p class="mb-8 text-sm text-slate-500">
          Sin filas de rasgos para esta colección en esta página (puede no estar indexada o no tener metadata de traits).
        </p>
      ) : null}

      <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 class="inline-flex items-center text-lg font-semibold text-white">
          NFTs en esta colección
          <HelpTooltip text="Listado paginado y ordenado por token ID para facilitar la exploración." />
        </h2>
        <p class="text-xs text-slate-500">
          {rowsSorted.length > 0 ? `${fmtInt(rowsSorted.length)} en esta página` : "Sin resultados en esta página"}
        </p>
      </div>
      {!v.list.ok && !v.missingKey ? (
        <p class="text-sm text-rose-400/90 mb-4">{v.list.error}</p>
      ) : null}

      {rows.length === 0 && v.list.ok ? (
        <p class="text-sm text-slate-500 rounded-xl border border-[#043234]/80 bg-[#001318]/40 p-8 text-center">
          Sin ítems en esta página (la colección puede estar vacía o sin indexar aún).
        </p>
      ) : (
        <ul class="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {rowsSorted.map((n, i) => {
            const tid = String(n.token_id ?? n.tokenId ?? i);
            const img = nftImage(n);
            const nm = n.normalized_metadata as { name?: string } | undefined;
            const title = String(nm?.name ?? n.name ?? n.symbol ?? `Token #${tid}`);
            const floorUsd = n.floor_price_usd ?? n.floorPriceUsd;
            const rarityTone = rarityToneFromRank(n.rarity_rank);
            const traitPreview = nftTraitsPreview(n);
            const itemHref = `/${L}/nfts/${v.contract}/${encodeURIComponent(tid)}/?${chainQs}`;
            return (
              <li key={`${v.contract}-${tid}-${i}`}>
                <Link
                  href={itemHref}
                  class="group flex h-full flex-col overflow-hidden rounded-2xl border border-[#0a5256]/90 bg-gradient-to-b from-[#00171c] via-[#001116] to-[#000d11] p-0 shadow-[0_16px_46px_rgba(0,0,0,0.5)] ring-1 ring-white/[0.05] transition duration-300 hover:-translate-y-1 hover:border-[#04E6E6]/45 hover:shadow-[0_26px_64px_rgba(4,230,230,0.12)]"
                >
                  <div class="relative">
                    {img ? (
                      <img
                        src={img}
                        alt=""
                        class="aspect-square w-full object-cover transition duration-500 group-hover:scale-[1.035]"
                        width={280}
                        height={280}
                        loading="lazy"
                      />
                    ) : (
                      <div class="flex aspect-square w-full items-center justify-center bg-[#043234]/40 text-xs text-slate-500">
                        Sin imagen
                      </div>
                    )}
                    <div class="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/20" />
                    <div class="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full border border-[#04E6E6]/30 bg-[#001318]/85 px-2 py-0.5 text-[10px] font-medium text-[#b6ffff] backdrop-blur-sm">
                      #{tid}
                    </div>
                    <div class="absolute bottom-2.5 right-2.5 rounded-full border border-[#0d5f63]/70 bg-[#001318]/90 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-300 backdrop-blur-sm">
                      {String(v.chain).toUpperCase()}
                    </div>
                  </div>

                  <div class="flex h-full flex-col gap-2 p-3">
                    <div class="flex items-start justify-between gap-2">
                      <h3 class="line-clamp-2 text-sm font-semibold leading-snug text-white">{title}</h3>
                      {rarityTone ? (
                        <span class={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${rarityTone.className}`}>
                          {rarityTone.label}
                        </span>
                      ) : null}
                    </div>

                    {traitPreview.length > 0 ? (
                      <div class="space-y-1">
                        {traitPreview.map((t, idx) => (
                          <p key={`${tid}-trait-${idx}`} class="line-clamp-1 text-[10px] text-slate-400">
                            {t}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <p class="text-[10px] text-slate-500">Sin traits visibles en metadata.</p>
                    )}

                    <div class="mt-1 grid grid-cols-2 gap-1.5 text-[11px]">
                      <div class="rounded-lg border border-[#0c4b4f]/75 bg-[#001318]/70 px-2 py-1.5">
                        <p class="text-[10px] uppercase tracking-wide text-slate-500">Floor</p>
                        <p class="mt-0.5 tabular-nums text-[#7ff6f6]">
                          {floorUsd != null
                            ? `$${formatTokenUsdPrice(floorUsd as string | number | null | undefined)}`
                            : "—"}
                        </p>
                      </div>
                      <div class="rounded-lg border border-[#0c4b4f]/75 bg-[#001318]/70 px-2 py-1.5">
                        <p class="text-[10px] uppercase tracking-wide text-slate-500">Metadata</p>
                        <p class="mt-0.5 text-slate-300">
                          {n.normalized_metadata != null || n.normalizedMetadata != null ? "Enriched" : "Base"}
                        </p>
                      </div>
                    </div>

                    <div class="mt-auto flex items-center justify-between border-t border-[#0a4246]/70 pt-2 text-[11px]">
                      <span class="text-slate-500">Vista NFT</span>
                      <span class="font-medium text-[#04E6E6] group-hover:text-[#79ffff]">Abrir detalle →</span>
                    </div>
                  </div>
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
