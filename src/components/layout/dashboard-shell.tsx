import { component$, Slot, useSignal, $, useComputed$ } from "@builder.io/qwik";
import { Link, useLocation } from "@builder.io/qwik-city";
// @ts-ignore qwik-speak types
import { inlineTranslate } from "qwik-speak";
import {
  LuBarChart3,
  LuBell,
  LuBot,
  LuChevronLeft,
  LuChevronRight,
  LuCoins,
  LuImage,
  LuLayers,
  LuLayoutGrid,
  LuRadar,
  LuSparkles,
  LuWallet,
  LuZap,
} from "@qwikest/icons/lucide";
export type DashboardAccessState = {
  hasPro: boolean;
  isSubscriber: boolean;
  isAdmin: boolean;
  showSyncDebug: boolean;
  canTriggerFullMarketSync: boolean;
};

export const DashboardShell = component$((props: { session: DashboardAccessState }) => {
  const loc = useLocation();
  const L = loc.params.locale || "en-us";
  const base = `/${L}`;
  const sol = `${base}/solana`;
  const hasPro = props.session.hasPro;

  const sidebarCollapsed = useSignal(false);
  const tokensOpen = useSignal(true);
  const tradersOpen = useSignal(true);
  const solWalletOpen = useSignal(true);
  const solTokenOpen = useSignal(true);
  const solPriceOpen = useSignal(true);
  const smartMoneyOpen = useSignal(true);
  const mobileNavOpen = useSignal(false);

  // `dashboard` is already in `speak-config.ts` assets + runtimeAssets — skip useSpeak here to avoid duplicate-runtimeAssets warnings.
  const d = useComputed$(() => {
    const tr = inlineTranslate();
    return {
      brand: tr("dashboard.brand@@Crypto Helper"),
      subtitle: tr("dashboard.subtitle@@Mercado y datos on-chain"),
      subtitleDebug: tr("dashboard.subtitleDebug@@Mercado y datos on-chain"),
      chainLabel: tr("dashboard.chainLabel@@Chain"),
      chainAria: tr("dashboard.chainAria@@Chain: EVM or Solana"),
      evm: tr("dashboard.evm@@EVM"),
      solana: tr("dashboard.solana@@Solana"),
      sidebarExpand: tr("dashboard.sidebarExpand@@Expand sidebar"),
      sidebarCollapse: tr("dashboard.sidebarCollapse@@Collapse sidebar"),
      overview: tr("dashboard.overview@@Overview"),
      cryptoBubbles: tr("dashboard.cryptoBubbles@@Crypto bubbles"),
      tokens: tr("dashboard.tokens@@Tokens"),
      tokensCollapsedTitle: tr("dashboard.tokensCollapsedTitle@@Tokens · Top volume"),
      topVolume: tr("dashboard.topVolume@@Top volume"),
      trending: tr("dashboard.trending@@Trending"),
      newListings: tr("dashboard.newListings@@New listings"),
      meme: tr("dashboard.meme@@Meme"),
      aiBigData: tr("dashboard.aiBigData@@AI & big data"),
      gaming: tr("dashboard.gaming@@Gaming"),
      mineable: tr("dashboard.mineable@@Mineable"),
      mostVisited: tr("dashboard.mostVisited@@Most visited"),
      allTokens: tr("dashboard.allTokens@@All tokens"),
      traders: tr("dashboard.traders@@Traders"),
      tradersCollapsedTitle: tr("dashboard.tradersCollapsedTitle@@Traders · Most profitable"),
      mostProfitable: tr("dashboard.mostProfitable@@Most profitable"),
      bySwaps: tr("dashboard.bySwaps@@By swaps (Icarus)"),
      topWhales: tr("dashboard.topWhales@@Top whales (watchlist)"),
      nfts: tr("dashboard.nfts@@NFTs"),
      block: tr("dashboard.block@@Block"),
      signalNotifications: tr("dashboard.signalNotifications@@Signal notifications"),
      /** Unified /alerts — push prefs + live whale/trader streams */
      alertsHub: tr("dashboard.alertsHub@@Alerts & notifications"),
      push: tr("dashboard.push@@Push"),
      dbInsight: tr("dashboard.dbInsight@@Asistente IA"),
      liveSignals: tr("dashboard.liveSignals@@Live signals"),
      liveSignalsProSuffix: tr("dashboard.liveSignalsProSuffix@@· Pro"),
      smartMoney: tr("dashboard.smartMoney@@Smart money"),
      whaleAlerts: tr("dashboard.whaleAlerts@@Whale alerts"),
      netflows: tr("dashboard.netflows@@Netflows"),
      holdings: tr("dashboard.holdings@@Holdings"),
      historicalHoldings: tr("dashboard.historicalHoldings@@Historical holdings"),
      dexTrades: tr("dashboard.dexTrades@@DEX trades"),
      perpTrades: tr("dashboard.perpTrades@@Perp trades"),
      jupiterDcas: tr("dashboard.jupiterDcas@@Jupiter DCAs"),
      sse: tr("dashboard.sse@@SSE"),
      proOnlyTitle: tr("dashboard.proOnlyTitle@@Pro subscribers only — see plans on Overview"),
      proBadge: tr("dashboard.proBadge@@Pro"),
      solanaNavTitle: tr("dashboard.solanaNavTitle@@Solana"),
      solanaOverview: tr("dashboard.solanaOverview@@Overview"),
      walletApi: tr("dashboard.walletApi@@Wallet"),
      solanaWalletPanel: tr("dashboard.solanaWalletPanel@@Wallet (live)"),
      solanaTokenPanel: tr("dashboard.solanaTokenPanel@@Token (live)"),
      nativeBalance: tr("dashboard.nativeBalance@@Native balance"),
      portfolio: tr("dashboard.portfolio@@Portfolio"),
      tokenBalances: tr("dashboard.tokenBalances@@Token balances"),
      nftBalances: tr("dashboard.nftBalances@@NFT balances"),
      swaps: tr("dashboard.swaps@@Swaps"),
      tokenApi: tr("dashboard.tokenApi@@Token"),
      metadataInfo: tr("dashboard.metadataInfo@@Metadata & info"),
      prices: tr("dashboard.prices@@Prices"),
      holders: tr("dashboard.holders@@Holders"),
      swapsPairs: tr("dashboard.swapsPairs@@Swaps & pairs"),
      marketMetrics: tr("dashboard.marketMetrics@@Market metrics"),
      searchDiscovery: tr("dashboard.searchDiscovery@@Search & discovery"),
      advancedSignals: tr("dashboard.advancedSignals@@Advanced signals"),
      nftApi: tr("dashboard.nftApi@@NFT"),
      priceApi: tr("dashboard.priceApi@@Prices"),
      tokenPrice: tr("dashboard.tokenPrice@@Token price"),
      tokenPriceBatch: tr("dashboard.tokenPriceBatch@@Token price (batch)"),
      priceChartsNote: tr("dashboard.priceChartsNote@@Charts (TradingView)"),
    };
  });

  const collapsed = sidebarCollapsed.value;
  const lbl = collapsed ? "max-md:inline md:hidden" : "";

  const navClass =
    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition hover:bg-[#043234] text-gray-200 hover:text-[#04E6E6]";
  const navClassMdCollapsed = collapsed ? "md:justify-center md:px-2 md:gap-0" : "";
  const navClassLocked =
    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-500 opacity-85 hover:opacity-100 border border-transparent hover:border-amber-500/30";
  const navClassLockedMdCollapsed = collapsed ? "md:justify-center md:px-2 md:gap-0" : "";
  const subClass =
    "block rounded-lg pl-3 pr-2 py-1.5 text-xs transition hover:bg-[#043234]/60 text-gray-300 hover:text-[#04E6E6]";
  const iconClass = "h-[18px] w-[18px] shrink-0 opacity-90";

  const active = (path: string) =>
    loc.url.pathname.includes(path) ? "bg-[#043234] text-[#04E6E6]" : "";

  const toggleSidebar = $(() => {
    sidebarCollapsed.value = !sidebarCollapsed.value;
  });
  const toggleTokens = $(() => {
    tokensOpen.value = !tokensOpen.value;
  });
  const toggleTraders = $(() => {
    tradersOpen.value = !tradersOpen.value;
  });
  const toggleSolWallet = $(() => {
    solWalletOpen.value = !solWalletOpen.value;
  });
  const toggleSolToken = $(() => {
    solTokenOpen.value = !solTokenOpen.value;
  });
  const toggleSolPrice = $(() => {
    solPriceOpen.value = !solPriceOpen.value;
  });
  const toggleSmartMoney = $(() => {
    smartMoneyOpen.value = !smartMoneyOpen.value;
  });
  const toggleMobileNav = $(() => {
    mobileNavOpen.value = !mobileNavOpen.value;
  });

  return (
    <div class="min-h-screen bg-[#000D0E] text-white flex flex-col md:flex-row">
      <aside
        style={{ viewTransitionName: "cg-dash-sidebar" }}
        class={[
          "cg-vt-dash-sidebar w-full shrink-0 border-b md:border-b-0 md:border-r border-[#043234] md:sticky md:top-16 md:self-start md:h-[calc(100vh-4rem)] md:overflow-y-auto md:transition-[width] md:duration-200 md:ease-out",
          collapsed ? "p-4 md:w-[3.25rem] md:px-1.5 md:py-4" : "p-4 md:w-64",
        ].join(" ")}
      >
        <div
          class={[
            "flex items-start gap-2",
            collapsed ? "md:flex-col md:items-center" : "justify-between",
          ].join(" ")}
        >
          <div class={collapsed ? "min-w-0 md:text-center md:w-full" : "min-w-0"}>
            <Link
              href={`/${L}/`}
              class="text-[#04E6E6] font-bold text-lg tracking-tight inline-flex items-center gap-1.5"
              title={d.value.brand}
            >
              <LuSparkles class={collapsed ? `${iconClass} hidden md:inline` : "hidden"} />
              <span class={collapsed ? "max-md:inline md:hidden" : ""}>{d.value.brand}</span>
            </Link>
            <p class={["text-xs text-gray-500 mt-1", collapsed ? "max-md:block md:hidden" : ""].join(" ")}>
              {d.value.subtitle}
            </p>
          </div>
          <button
            type="button"
            onClick$={toggleSidebar}
            class="hidden md:inline-flex shrink-0 rounded-lg border border-[#043234] p-2 text-[#04E6E6] hover:bg-[#043234]/50 transition-colors"
            aria-label={collapsed ? d.value.sidebarExpand : d.value.sidebarCollapse}
            title={collapsed ? d.value.sidebarExpand : d.value.sidebarCollapse}
          >
            {collapsed ? (
              <LuChevronRight class="h-4 w-4" />
            ) : (
              <LuChevronLeft class="h-4 w-4" />
            )}
          </button>
          <button
            type="button"
            onClick$={toggleMobileNav}
            class="inline-flex md:hidden shrink-0 rounded-lg border border-[#043234] p-2 text-[#04E6E6] hover:bg-[#043234]/50 transition-colors"
            aria-label={mobileNavOpen.value ? "Close menu" : "Open menu"}
            title={mobileNavOpen.value ? "Close menu" : "Open menu"}
          >
            {mobileNavOpen.value ? (
              <LuChevronLeft class="h-4 w-4" />
            ) : (
              <LuChevronRight class="h-4 w-4" />
            )}
          </button>
        </div>

        <nav class={["mt-4 flex flex-col gap-0.5", mobileNavOpen.value ? "block" : "hidden md:flex"].join(" ")}>
          {false ? (
            collapsed ? (
              <Link
                class={`${navClass} ${navClassMdCollapsed} ${active("/solana")}`}
                href={`${sol}/`}
                title={d.value.solanaNavTitle}
              >
                <LuZap class={iconClass} />
                <span class={lbl}>{d.value.solana}</span>
              </Link>
            ) : (
              <>
                <p class="text-[10px] uppercase tracking-wider text-[#04E6E6]/70 mb-1 px-2">{d.value.solana}</p>
                <Link
                  class={`${navClass} ${navClassMdCollapsed} ${active("/solana")}`}
                  href={`${sol}/`}
                  title={d.value.solanaOverview}
                >
                  <LuZap class={iconClass} />
                  <span class={lbl}>{d.value.solanaOverview}</span>
                </Link>

                <button
                  type="button"
                  class={`${navClass} w-full text-left justify-between ${navClassMdCollapsed}`}
                  onClick$={toggleSolWallet}
                >
                  <span class="flex items-center gap-2 min-w-0">
                    <LuWallet class={iconClass} />
                    <span>{d.value.walletApi}</span>
                  </span>
                  <span class="text-gray-500 text-xs shrink-0">{solWalletOpen.value ? "−" : "+"}</span>
                </button>
                {solWalletOpen.value ? (
                  <div class="ml-2 border-l border-[#043234] flex flex-col gap-0.5 mb-1">
                    <Link class={`${subClass}`} href={`${sol}/wallet/#open-wallet`}>
                      {d.value.solanaWalletPanel}
                    </Link>
                    <Link class={`${subClass}`} href={`${sol}/wallet/#native-balance`}>
                      {d.value.nativeBalance}
                    </Link>
                    <Link class={`${subClass}`} href={`${sol}/wallet/#portfolio`}>
                      {d.value.portfolio}
                    </Link>
                    <Link class={`${subClass}`} href={`${sol}/wallet/#token-balances`}>
                      {d.value.tokenBalances}
                    </Link>
                    <Link class={`${subClass}`} href={`${sol}/wallet/#nft-balances`}>
                      {d.value.nftBalances}
                    </Link>
                    <Link class={`${subClass}`} href={`${sol}/wallet/#swaps`}>
                      {d.value.swaps}
                    </Link>
                  </div>
                ) : null}

                <button
                  type="button"
                  class={`${navClass} w-full text-left justify-between ${navClassMdCollapsed}`}
                  onClick$={toggleSolToken}
                >
                  <span class="flex items-center gap-2 min-w-0">
                    <LuCoins class={iconClass} />
                    <span>{d.value.tokenApi}</span>
                  </span>
                  <span class="text-gray-500 text-xs shrink-0">{solTokenOpen.value ? "−" : "+"}</span>
                </button>
                {solTokenOpen.value ? (
                  <div class="ml-2 border-l border-[#043234] flex flex-col gap-0.5 mb-1">
                    <Link class={`${subClass}`} href={`${sol}/token/#open-token`}>
                      {d.value.solanaTokenPanel}
                    </Link>
                    <Link class={`${subClass}`} href={`${sol}/token/#metadata`}>
                      {d.value.metadataInfo}
                    </Link>
                    <Link class={`${subClass}`} href={`${sol}/token/#prices`}>
                      {d.value.prices}
                    </Link>
                    <Link class={`${subClass}`} href={`${sol}/token/#holders`}>
                      {d.value.holders}
                    </Link>
                    <Link class={`${subClass}`} href={`${sol}/token/#swaps-pairs`}>
                      {d.value.swapsPairs}
                    </Link>
                    <Link class={`${subClass}`} href={`${sol}/token/#market-metrics`}>
                      {d.value.marketMetrics}
                    </Link>
                    <Link class={`${subClass}`} href={`${sol}/token/#search-discovery`}>
                      {d.value.searchDiscovery}
                    </Link>
                    <Link class={`${subClass}`} href={`${sol}/token/#advanced-signals`}>
                      {d.value.advancedSignals}
                    </Link>
                  </div>
                ) : null}

                <Link
                  class={`${navClass} ${navClassMdCollapsed} ${active("/solana/nft")}`}
                  href={`${sol}/nft/`}
                  title={d.value.nftApi}
                >
                  <LuImage class={iconClass} />
                  <span class={lbl}>{d.value.nftApi}</span>
                </Link>

                <button
                  type="button"
                  class={`${navClass} w-full text-left justify-between ${navClassMdCollapsed}`}
                  onClick$={toggleSolPrice}
                >
                  <span class="flex items-center gap-2 min-w-0">
                    <LuLayers class={iconClass} />
                    <span>{d.value.priceApi}</span>
                  </span>
                  <span class="text-gray-500 text-xs shrink-0">{solPriceOpen.value ? "−" : "+"}</span>
                </button>
                {solPriceOpen.value ? (
                  <div class="ml-2 border-l border-[#043234] flex flex-col gap-0.5 mb-1">
                    <Link class={`${subClass}`} href={`${sol}/price/#token-price`}>
                      {d.value.tokenPrice}
                    </Link>
                    <Link class={`${subClass}`} href={`${sol}/price/#token-price-batch`}>
                      {d.value.tokenPriceBatch}
                    </Link>
                    <Link class={`${subClass}`} href={`${sol}/price/#charts`}>
                      {d.value.priceChartsNote}
                    </Link>
                  </div>
                ) : null}
              </>
            )
          ) : (
            <>
              {!collapsed ? (
                <p class="text-[10px] uppercase tracking-wider text-[#04E6E6]/70 mb-1 px-2">{d.value.evm}</p>
              ) : null}
              <div class={collapsed ? "" : "border-l border-[#04E6E6]/25 pl-2 ml-0.5 space-y-0.5"}>
          <Link
            class={`${navClass} ${navClassMdCollapsed} ${active("/overview")} ${active("/home")}`}
            href={`${base}/home/`}
            title={d.value.overview}
          >
            <LuLayoutGrid class={iconClass} />
            <span class={lbl}>{d.value.overview}</span>
          </Link>
          <Link
            class={`${navClass} ${navClassMdCollapsed} ${active("/bubbles")}`}
            href={`${base}/bubbles/`}
            title={d.value.cryptoBubbles}
          >
            <LuBarChart3 class={iconClass} />
            <span class={lbl}>{d.value.cryptoBubbles}</span>
          </Link>

          {collapsed ? (
            <Link
              class={`${navClass} ${navClassMdCollapsed} ${active("/volume-coins")} ${active("/trending-coins")} ${active("/earlybird-coins")} ${active("/meme-coins")} ${active("/ai-coins")} ${active("/gaming-coins")} ${active("/mineable-coins")} ${active("/most-visit-coins")} ${active("/tokens")}`}
              href={`${base}/volume-coins/`}
              title={d.value.tokensCollapsedTitle}
            >
              <LuCoins class={iconClass} />
              <span class={lbl}>{d.value.tokens}</span>
            </Link>
          ) : (
            <>
              <button
                type="button"
                class={`${navClass} w-full text-left justify-between ${navClassMdCollapsed}`}
                onClick$={toggleTokens}
              >
                <span class="flex items-center gap-2 min-w-0">
                  <LuCoins class={iconClass} />
                  <span>{d.value.tokens}</span>
                </span>
                <span class="text-gray-500 text-xs shrink-0">{tokensOpen.value ? "−" : "+"}</span>
              </button>
              {tokensOpen.value ? (
                <div class="ml-2 border-l border-[#043234] flex flex-col gap-0.5 mb-1">
                  <Link class={`${subClass} ${active("/volume-coins")}`} href={`${base}/volume-coins/`}>
                    {d.value.topVolume}
                  </Link>
                  <Link class={`${subClass} ${active("/trending-coins")}`} href={`${base}/trending-coins/`}>
                    {d.value.trending}
                  </Link>
                  <Link class={`${subClass} ${active("/earlybird-coins")}`} href={`${base}/earlybird-coins/`}>
                    {d.value.newListings}
                  </Link>
                  <Link class={`${subClass} ${active("/meme-coins")}`} href={`${base}/meme-coins/`}>
                    {d.value.meme}
                  </Link>
                  <Link class={`${subClass} ${active("/ai-coins")}`} href={`${base}/ai-coins/`}>
                    {d.value.aiBigData}
                  </Link>
                  <Link class={`${subClass} ${active("/gaming-coins")}`} href={`${base}/gaming-coins/`}>
                    {d.value.gaming}
                  </Link>
                  <Link class={`${subClass} ${active("/mineable-coins")}`} href={`${base}/mineable-coins/`}>
                    {d.value.mineable}
                  </Link>
                  <Link class={`${subClass} ${active("/most-visit-coins")}`} href={`${base}/most-visit-coins/`}>
                    {d.value.mostVisited}
                  </Link>
                  <Link class={`${subClass} ${active("/tokens")}`} href={`${base}/tokens/`}>
                    {d.value.allTokens}
                  </Link>
                </div>
              ) : null}
            </>
          )}

          {collapsed ? (
            <Link
              class={`${navClass} ${navClassMdCollapsed} ${active("/top-traders")} ${active("/top-traders-swaps")} ${active("/top-traders-whales")}`}
              href={`${base}/top-traders/`}
              title={d.value.tradersCollapsedTitle}
            >
              <LuRadar class={iconClass} />
              <span class={lbl}>{d.value.traders}</span>
            </Link>
          ) : (
            <>
              <button
                type="button"
                class={`${navClass} w-full text-left justify-between ${navClassMdCollapsed}`}
                onClick$={toggleTraders}
              >
                <span class="flex items-center gap-2 min-w-0">
                  <LuRadar class={iconClass} />
                  <span>{d.value.traders}</span>
                </span>
                <span class="text-gray-500 text-xs shrink-0">{tradersOpen.value ? "−" : "+"}</span>
              </button>
              {tradersOpen.value ? (
                <div class="ml-2 border-l border-[#043234] flex flex-col gap-0.5 mb-1">
                  <Link class={`${subClass} ${active("/top-traders")}`} href={`${base}/top-traders/`}>
                    {d.value.mostProfitable}
                  </Link>
                  <Link class={`${subClass} ${active("/top-traders-swaps")}`} href={`${base}/top-traders-swaps/`}>
                    {d.value.bySwaps}
                  </Link>
                  <Link class={`${subClass} ${active("/top-traders-whales")}`} href={`${base}/top-traders-whales/`}>
                    {d.value.topWhales}
                  </Link>
                </div>
              ) : null}
            </>
          )}

          {hasPro ? (
            collapsed ? (
              <Link
                class={`${navClass} ${navClassMdCollapsed} flex-wrap ${active("/smart-money")}`}
                href={`${base}/smart-money/`}
                title={d.value.smartMoney}
              >
                <LuSparkles class={iconClass} />
                <span class={lbl}>{d.value.smartMoney}</span>
              </Link>
            ) : (
              <>
                <button
                  type="button"
                  class={`${navClass} w-full text-left justify-between ${navClassMdCollapsed}`}
                  onClick$={toggleSmartMoney}
                >
                  <span class="flex items-center gap-2 min-w-0">
                    <LuSparkles class={iconClass} />
                    <span>{d.value.smartMoney}</span>
                  </span>
                  <span class="text-gray-500 text-xs shrink-0">{smartMoneyOpen.value ? "−" : "+"}</span>
                </button>
                {smartMoneyOpen.value ? (
                  <div class="ml-2 border-l border-[#043234] flex flex-col gap-0.5 mb-1">
                    <Link class={`${subClass} ${active("/smart-money")}`} href={`${base}/smart-money/?tab=netflow`}>
                      {d.value.netflows}
                    </Link>
                    <Link class={`${subClass}`} href={`${base}/smart-money/?tab=holdings`}>
                      {d.value.holdings}
                    </Link>
                    <Link class={`${subClass}`} href={`${base}/smart-money/?tab=historical-holdings`}>
                      {d.value.historicalHoldings}
                    </Link>
                    <Link class={`${subClass}`} href={`${base}/smart-money/?tab=dex-trades`}>
                      {d.value.dexTrades}
                    </Link>
                    <Link class={`${subClass}`} href={`${base}/smart-money/?tab=perp-trades`}>
                      {d.value.perpTrades}
                    </Link>
                    <Link class={`${subClass}`} href={`${base}/smart-money/?tab=dcas`}>
                      {d.value.jupiterDcas}
                    </Link>
                  </div>
                ) : null}
              </>
            )
          ) : (
            <Link
              class={`${navClassLocked} ${navClassLockedMdCollapsed} flex-wrap`}
              href={`${base}/home/?pro=required`}
              title={d.value.proOnlyTitle}
            >
              <LuSparkles class={iconClass} />
              <span class={lbl}>{d.value.smartMoney}</span>
              <span
                class={`text-[10px] px-1.5 py-px rounded bg-[#04E6E6]/20 text-[#04E6E6] shrink-0 ${lbl}`}
              >
                {d.value.sse}
              </span>
            </Link>
          )}

          <Link class={`${navClass} ${navClassMdCollapsed} ${active("/nfts")}`} href={`${base}/nfts/`} title={d.value.nfts}>
            <LuImage class={iconClass} />
            <span class={lbl}>{d.value.nfts}</span>
          </Link>
          <Link class={`${navClass} ${navClassMdCollapsed} ${active("/block")}`} href={`${base}/block/`} title={d.value.block}>
            <LuLayers class={iconClass} />
            <span class={lbl}>{d.value.block}</span>
          </Link>

          <Link
            class={`${navClass} ${navClassMdCollapsed} flex-wrap ${active("/alerts")}`}
            href={`${base}/alerts/`}
            title={`${d.value.alertsHub} · ${d.value.push} / ${d.value.sse}`}
          >
            <LuBell class={iconClass} />
            <span class={lbl}>{d.value.alertsHub}</span>
            <span
              class={`text-[10px] px-1.5 py-px rounded bg-[#04E6E6]/20 text-[#04E6E6] shrink-0 ${lbl}`}
            >
              {d.value.push}
            </span>
            <span
              class={`text-[10px] px-1.5 py-px rounded bg-[#04E6E6]/15 text-[#04E6E6]/90 shrink-0 ${lbl}`}
            >
              {d.value.sse}
            </span>
          </Link>
          {hasPro ? (
            <Link
              class={`${navClass} ${navClassMdCollapsed} flex-wrap ${active("/db-insight")}`}
              href={`${base}/db-insight/`}
              title={`${d.value.dbInsight} (Pro)`}
            >
              <LuBot class={iconClass} />
              <span class={lbl}>{d.value.dbInsight}</span>
              <span class={`text-[10px] px-1.5 py-px rounded bg-amber-500/25 text-amber-300 shrink-0 ${lbl}`}>
                {d.value.proBadge}
              </span>
            </Link>
          ) : (
            <Link
              class={`${navClassLocked} ${navClassLockedMdCollapsed} flex-wrap`}
              href={`${base}/home/?pro=required`}
              title={d.value.proOnlyTitle}
            >
              <LuBot class={iconClass} />
              <span class={lbl}>{d.value.dbInsight}</span>
              <span class={`text-[10px] px-1.5 py-px rounded bg-amber-500/25 text-amber-300 shrink-0 ${lbl}`}>
                {d.value.proBadge}
              </span>
            </Link>
          )}

              </div>
            </>
          )}
        </nav>
      </aside>
      <main
        style={{ viewTransitionName: "cg-dash-stage" }}
        class="cg-vt-dash-stage flex-1 min-h-[calc(100vh-4rem)] p-4 md:p-8 border-t md:border-t-0 border-[#043234]/50 flex flex-col"
      >
        <Slot />
        <footer class="mt-auto pt-10 rounded-2xl border border-[#043234] bg-gradient-to-r from-[#001318] via-[#001a1c] to-[#001318] px-5 py-4">
          <div class="flex flex-col items-center justify-center gap-2 text-center">
            <div>
              <p class="text-sm font-semibold text-[#04E6E6]">Crypto Helper</p>
              <p class="text-xs text-slate-400">Mercado, señales y análisis en tiempo real.</p>
            </div>
            <div class="flex items-center justify-center gap-4 text-xs">
              <Link href={`/${L}/privacy/`} class="text-slate-400 transition hover:text-[#04E6E6]">
                Privacy
              </Link>
              <Link href={`/${L}/terms/`} class="text-slate-400 transition hover:text-[#04E6E6]">
                Terms
              </Link>
              <span class="text-slate-500">© {new Date().getFullYear()}</span>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
});
