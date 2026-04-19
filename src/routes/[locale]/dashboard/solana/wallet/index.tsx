import { $, component$, useComputed$, useSignal } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";
import { Link, useLocation, useNavigate } from "@builder.io/qwik-city";
import { LuChevronLeft } from "@qwikest/icons/lucide";
// @ts-ignore qwik-speak types
import { inlineTranslate } from "qwik-speak";
import { isSolanaWalletAddress } from "~/server/crypto-ghost/wallet-snapshot";

export const head: DocumentHead = {
  title: "Solana wallet | Dashboard",
};

export default component$(() => {
  const loc = useLocation();
  const nav = useNavigate();
  const L = loc.params.locale || "en-us";
  const solBase = `/${L}/dashboard/solana`;

  const addr = useSignal("");
  const network = useSignal<"mainnet" | "devnet">("mainnet");

  const trimmed = useComputed$(() => addr.value.trim());
  const valid = useComputed$(() => isSolanaWalletAddress(trimmed.value));

  const copy = useComputed$(() => {
    const tr = inlineTranslate();
    return {
      back: tr("dashboard.solanaBackToHub@@Back to Solana"),
      title: tr("dashboard.solanaWalletLandingTitle@@Solana wallet"),
      intro: tr(
        "dashboard.solanaWalletLandingIntro@@Enter a Solana public address to view balance, tokens, NFTs, and recent swaps in the dashboard.",
      ),
      open: tr("dashboard.solanaOpenInPanel@@Open in dashboard"),
    };
  });

  const openLiveWallet = $(() => {
    if (!isSolanaWalletAddress(addr.value.trim())) return;
    const a = addr.value.trim();
    const n = network.value;
    void nav(`${solBase}/wallet/${encodeURIComponent(a)}/?network=${n}`);
  });

  return (
    <div class="max-w-3xl space-y-8">
      <Link href={`${solBase}/`} class="inline-flex items-center gap-1 text-xs text-[#04E6E6] hover:underline">
        <LuChevronLeft class="h-3 w-3" />
        {copy.value.back}
      </Link>

      <div>
        <h1 class="text-2xl font-bold text-white">{copy.value.title}</h1>
        <p class="mt-2 text-sm text-slate-400">{copy.value.intro}</p>
      </div>

      <section
        id="open-wallet"
        class="rounded-xl border border-[#04E6E6]/25 bg-[#001a1c]/80 p-4 space-y-3"
        aria-label={copy.value.title}
      >
        <h2 class="text-sm font-semibold text-white sr-only">{copy.value.title}</h2>
        <div class="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            placeholder="Solana address (base58)"
            class="flex-1 rounded-lg border border-[#043234] bg-[#000D0E] px-3 py-2 text-sm text-white placeholder:text-slate-600 font-mono"
            value={addr.value}
            onInput$={(e) => {
              addr.value = (e.target as HTMLInputElement).value;
            }}
          />
          <select
            class="rounded-lg border border-[#043234] bg-[#000D0E] px-3 py-2 text-sm text-white"
            value={network.value}
            onChange$={(e) => {
              network.value = (e.target as HTMLSelectElement).value as "mainnet" | "devnet";
            }}
          >
            <option value="mainnet">mainnet</option>
            <option value="devnet">devnet</option>
          </select>
          <button
            type="button"
            disabled={!valid.value}
            onClick$={openLiveWallet}
            class="rounded-lg bg-[#04E6E6]/20 border border-[#04E6E6]/50 px-4 py-2 text-sm text-[#04E6E6] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#04E6E6]/30"
          >
            {copy.value.open}
          </button>
        </div>
      </section>
    </div>
  );
});
