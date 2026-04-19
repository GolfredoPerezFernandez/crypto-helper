import { component$, useComputed$ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";
import { Link, useLocation } from "@builder.io/qwik-city";
// @ts-ignore qwik-speak types
import { inlineTranslate } from "qwik-speak";
import { LuArrowRight, LuCoins, LuImage, LuLayers, LuWallet } from "@qwikest/icons/lucide";

export const head: DocumentHead = {
  title: "Solana | Dashboard",
};

export default component$(() => {
  const loc = useLocation();
  const L = loc.params.locale || "en-us";
  const base = `/${L}/dashboard/solana`;

  const copy = useComputed$(() => {
    const tr = inlineTranslate();
    return {
      eyebrow: tr("dashboard.solanaHubEyebrow@@Solana"),
      title: tr("dashboard.solanaHubTitle@@Solana overview"),
      intro: tr(
        "dashboard.solanaHubIntro@@Explore wallets, tokens, NFTs, and prices on Solana from the dashboard. Data loads when you open each section.",
      ),
      wallet: tr("dashboard.walletApi@@Wallet"),
      walletDesc: tr(
        "dashboard.solanaHubWalletDesc@@Native balance, token portfolio, NFTs, and recent activity.",
      ),
      token: tr("dashboard.tokenApi@@Token"),
      tokenDesc: tr("dashboard.solanaHubTokenDesc@@Metadata, prices, pairs, metrics, and charts."),
      nft: tr("dashboard.nftApi@@NFT"),
      nftDesc: tr("dashboard.solanaHubNftDesc@@Collections and metadata on Solana."),
      price: tr("dashboard.priceApi@@Prices"),
      priceDesc: tr("dashboard.solanaHubPriceDesc@@Quotes and price references."),
    };
  });

  const cards = useComputed$(() => {
    const c = copy.value;
    return [
      { href: `${base}/wallet/`, title: c.wallet, desc: c.walletDesc, icon: LuWallet },
      { href: `${base}/token/`, title: c.token, desc: c.tokenDesc, icon: LuCoins },
      { href: `${base}/nft/`, title: c.nft, desc: c.nftDesc, icon: LuImage },
      { href: `${base}/price/`, title: c.price, desc: c.priceDesc, icon: LuLayers },
    ] as const;
  });

  return (
    <div class="max-w-4xl space-y-8">
      <div>
        <p class="text-xs uppercase tracking-wider text-[#04E6E6]/80 mb-2">{copy.value.eyebrow}</p>
        <h1 class="text-2xl md:text-3xl font-bold text-white tracking-tight">{copy.value.title}</h1>
        <p class="mt-3 text-sm text-slate-400 leading-relaxed">{copy.value.intro}</p>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        {cards.value.map((c) => (
          <div
            key={c.href}
            class="rounded-xl border border-[#043234] bg-[#001a1c]/80 p-5 transition hover:border-[#04E6E6]/40 hover:bg-[#043234]/20"
          >
            <Link href={c.href} class="group block">
              <div class="flex items-start justify-between gap-3">
                <div class="flex items-center gap-3 min-w-0">
                  <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#04E6E6]/10 text-[#04E6E6]">
                    <c.icon class="h-5 w-5" />
                  </span>
                  <div class="min-w-0">
                    <h2 class="font-semibold text-white group-hover:text-[#04E6E6] transition-colors">{c.title}</h2>
                    <p class="text-xs text-slate-500 mt-1 leading-relaxed">{c.desc}</p>
                  </div>
                </div>
                <LuArrowRight class="h-5 w-5 shrink-0 text-slate-600 group-hover:text-[#04E6E6] transition-colors" />
              </div>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
});
