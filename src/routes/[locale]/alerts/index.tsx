import { component$ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";
import { Link, routeLoader$, useLocation } from "@builder.io/qwik-city";
import { LiveDexSignalFeed } from "~/components/crypto-dashboard/live-dex-signal-feed";
import { LiveSignalsPushSettings } from "~/components/push/live-signals-push-settings";
import { PriceAlertsSettings } from "~/components/push/price-alerts-settings";
import { queryTraderSignals, queryWhaleSignals } from "~/server/crypto-helper/market-queries";
import { useDashboardAuth } from "../layout";

export const head: DocumentHead = {
  title: "Alerts & notifications | Crypto Helper",
  meta: [
    {
      name: "description",
      content:
        "Wallet DEX alerts (whales and smart money), Web Push preferences, and Pro USD price alerts for tokens — one place.",
    },
  ],
};

export const useAlertsLoader = routeLoader$(async () => {
  const [whales, traders] = await Promise.all([queryWhaleSignals(100), queryTraderSignals(100)]);
  return { whales, traders };
});

export default component$(() => {
  const dash = useDashboardAuth();
  const hasPro = dash.value.hasPro;
  const loaded = useAlertsLoader();
  const loc = useLocation();
  const L = loc.params.locale || "en-us";
  const base = `/${L}/alerts/`;
  const feed = loc.url.searchParams.get("feed") === "traders" ? "traders" : "whales";
  const whalesInitial = (loaded.value?.whales ?? []) as Record<string, unknown>[];
  const tradersInitial = (loaded.value?.traders ?? []) as Record<string, unknown>[];

  return (
    <div class="max-w-[1600px] space-y-10">
      <header class="space-y-2">
        <h1 class="text-2xl font-bold text-white sm:text-3xl">Alerts &amp; notifications</h1>
        <p class="max-w-3xl text-sm leading-relaxed text-slate-400">
          <strong class="text-slate-300">Wallet alerts</strong> stream large DEX movements (whales) and trader /
          smart-money style activity. <strong class="text-slate-300">Token alerts</strong> (Pro) are USD price
          thresholds checked after each market sync. Enable <strong class="text-slate-300">Web Push</strong> below
          so the same pipeline can notify this device. Later we can surface a single combined feed of token + wallet
          events from this page.
        </p>
      </header>

      <section class="space-y-4 rounded-xl border border-[#043234]/80 bg-[#001318]/60 p-4 md:p-6">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h2 class="text-lg font-semibold text-[#04E6E6]">Live wallet signals</h2>
          {!hasPro ? (
            <span class="text-[11px] font-semibold uppercase tracking-wide text-amber-300/90">Pro</span>
          ) : null}
        </div>
        {!hasPro ? (
          <div class="rounded-lg border border-amber-500/35 bg-amber-950/20 px-4 py-3 text-sm text-amber-100/90">
            Live DEX streams are a <strong class="text-amber-200">Pro</strong> feature. You can still configure Web
            Push here; upgrade to watch whales and trader signals in real time.
            <Link
              href={`/${L}/home/?pro=required`}
              class="ml-2 font-semibold text-[#04E6E6] underline-offset-2 hover:underline"
            >
              View Pro benefits
            </Link>
          </div>
        ) : (
          <>
            <p class="text-xs text-slate-500">
              Same SSE feeds as before — pick a tab. Pushes use your preferences in Web Push.
            </p>
            <div class="flex flex-wrap gap-2">
              <Link
                href={`${base}?feed=whales`}
                class={
                  feed === "whales"
                    ? "rounded-lg border border-[#04E6E6]/50 bg-[#04E6E6]/15 px-3 py-2 text-sm font-semibold text-white"
                    : "rounded-lg border border-[#043234] bg-[#000D0E]/80 px-3 py-2 text-sm font-medium text-slate-400 hover:border-[#04E6E6]/30 hover:text-slate-200"
                }
              >
                Whale wallets
              </Link>
              <Link
                href={`${base}?feed=traders`}
                class={
                  feed === "traders"
                    ? "rounded-lg border border-[#04E6E6]/50 bg-[#04E6E6]/15 px-3 py-2 text-sm font-semibold text-white"
                    : "rounded-lg border border-[#043234] bg-[#000D0E]/80 px-3 py-2 text-sm font-medium text-slate-400 hover:border-[#04E6E6]/30 hover:text-slate-200"
                }
              >
                Smart money / traders
              </Link>
            </div>
            {feed === "whales" ? (
              <LiveDexSignalFeed
                title="Whale signals"
                subtitle="Alertas de ballenas en tiempo casi real."
                locale={L}
                initialItems={whalesInitial}
                streamPath="/api/stream/whales"
                eventName="new-message"
              />
            ) : (
              <LiveDexSignalFeed
                title="Trader signals"
                subtitle="Señales de traders y smart money en tiempo casi real."
                locale={L}
                initialItems={tradersInitial}
                streamPath="/api/stream/traders"
                eventName="new-message"
              />
            )}
          </>
        )}
      </section>

      <section class="space-y-3">
        <h2 class="text-lg font-semibold text-white">Web Push</h2>
        <p class="text-sm text-slate-400">
          Works on Android, Windows, desktop Chrome/Edge, and iOS 16.4+ after Add to Home Screen. Turn on push, then
          choose whale, trader, smart, and price channels.
        </p>
        <LiveSignalsPushSettings />
      </section>

      {hasPro ? (
        <section class="space-y-3">
          <h2 class="text-lg font-semibold text-white">Token price alerts (Pro)</h2>
          <p class="text-sm text-slate-400">
            USD thresholds per token (by token id in this app). Evaluated after each market sync — combines with wallet
            alerts in your notification tray when push is enabled.
          </p>
          <PriceAlertsSettings />
        </section>
      ) : (
        <p class="text-sm text-slate-500 max-w-lg">
          <span class="text-slate-400">Pro:</span> subscribe to set USD thresholds per token and get push when cached
          price crosses them after a market sync.
        </p>
      )}
    </div>
  );
});
