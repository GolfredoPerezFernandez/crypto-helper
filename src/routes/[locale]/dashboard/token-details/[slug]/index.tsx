import { component$ } from "@builder.io/qwik";
import { Link, routeLoader$, useLocation } from "@builder.io/qwik-city";
import { TokenLogoImg } from "~/components/crypto-dashboard/token-logo";
import { TradingViewAdvancedChart } from "~/components/crypto/tradingview-advanced-chart";
import { CATEGORY_DASHBOARD_PATH } from "~/server/crypto-ghost/market-category-constants";
import { formatTokenUsdPrice, formatUsdLiquidity } from "~/utils/format-market";
import {
  buildTradingViewSymbolCandidates,
  dexScreenerEmbedUrl,
  dexScreenerPathForNetwork,
} from "~/utils/tradingview-symbol";
import { moralisChainFromNetworkLabel } from "~/server/crypto-ghost/moralis-chain";
import { EvmAddrLinks } from "~/components/crypto-dashboard/evm-dash-links";

const isEvmAddress = (s: string) => /^0x[a-fA-F0-9]{40}$/.test(s);

export const useTokenDetailsBySlugLoader = routeLoader$(async (ev) => {
  const slug = decodeURIComponent(ev.params.slug || "").trim();
  if (!slug) throw ev.error(404, { message: "Missing slug" });
  const { getMarketTokenByAddressLoose, getMarketTokenBySlugLoose } = await import(
    "~/server/crypto-ghost/market-queries",
  );
  const row = isEvmAddress(slug)
    ? await getMarketTokenByAddressLoose(slug)
    : await getMarketTokenBySlugLoose(slug);
  if (!row) throw ev.error(404, { message: "Token no encontrado — ejecuta la sincronización o vuelve más tarde." });
  return row;
});

export default component$(() => {
  const row = useTokenDetailsBySlugLoader();
  const loc = useLocation();
  const L = loc.params.locale || "en-us";
  const t = row.value as Record<string, unknown>;
  const cat = String(t.category || "");
  const segment = CATEGORY_DASHBOARD_PATH[cat] || "home";
  const tvSymbols = buildTradingViewSymbolCandidates(String(t.symbol ?? ""), String(t.network ?? ""));
  const dexUrl = dexScreenerPathForNetwork(String(t.network), String(t.address));
  const dexEmbedUrl = dexScreenerEmbedUrl(String(t.network), String(t.address));

  return (
    <div class="max-w-5xl">
      <Link href={`/${L}/dashboard/${segment}/`} class="text-sm text-[#04E6E6] hover:underline mb-4 inline-block">
        ← Back ({cat})
      </Link>
      <p class="text-gray-400 text-sm mb-2">
        URL amigable por slug. Misma ficha que por ID (holders, traders, gráfico):{" "}
        <Link class="text-[#04E6E6] font-semibold underline" href={`/${L}/dashboard/token/${String(t.id)}/`}>
          /dashboard/token/{String(t.id)}/
        </Link>
      </p>
      <div class="rounded-xl border border-[#043234] bg-[#001a1c] p-6 flex flex-col gap-4 sm:flex-row sm:items-start">
        <TokenLogoImg src={String(t.logo ?? "")} symbol={String(t.symbol)} size={72} class="self-start" />
        <div class="min-w-0 flex-1">
        <h1 class="text-2xl font-bold text-[#04E6E6]">
          {String(t.name)} <span class="text-gray-500">({String(t.symbol)})</span>
        </h1>
        <p class="text-sm text-gray-500 mt-2 font-mono flex flex-wrap items-center gap-x-2 gap-y-1">
          <span>{String(t.slug)}</span>
          <span class="text-gray-600">·</span>
          {/^0x[a-fA-F0-9]{40}$/.test(String(t.address ?? "")) ? (
            <EvmAddrLinks
              locale={L}
              moralisChain={moralisChainFromNetworkLabel(String(t.network))}
              address={String(t.address).toLowerCase()}
              variant="token"
            />
          ) : (
            <span class="text-gray-600">{String(t.address)}</span>
          )}
        </p>
        <dl class="mt-6 grid gap-3 text-sm">
          <div>
            <dt class="text-gray-500">Price</dt>
            <dd class="text-white">${formatTokenUsdPrice(t.price)}</dd>
          </div>
          <div>
            <dt class="text-gray-500">Volume</dt>
            <dd>{formatUsdLiquidity(t.volume)}</dd>
          </div>
        </dl>
        </div>
      </div>

      <section class="mt-8">
        <div class="flex flex-wrap items-end justify-between gap-3 mb-3">
          <div>
            <h2 class="text-lg font-semibold text-[#04E6E6]">Price chart</h2>
            <p class="text-xs text-gray-500 mt-1">
              First pair: <span class="font-mono text-gray-400">{tvSymbols[0]}</span>
              {tvSymbols.length > 1 ? " — use the CEX selector or chart search if invalid." : " — use chart search if invalid."}
            </p>
          </div>
          {dexUrl ? (
            <a
              href={dexUrl}
              target="_blank"
              rel="noreferrer"
              class="text-xs text-[#04E6E6] hover:underline shrink-0"
            >
              Dexscreener ↗
            </a>
          ) : null}
        </div>
        <TradingViewAdvancedChart
          key={`tv-slug-${String(t.id)}`}
          symbols={tvSymbols}
          dexUrl={dexUrl}
          dexEmbedUrl={dexEmbedUrl}
          height={560}
        />
      </section>
    </div>
  );
});
