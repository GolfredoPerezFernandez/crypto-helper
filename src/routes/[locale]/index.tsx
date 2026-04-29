import { component$, $ } from "@builder.io/qwik";
import type { DocumentHead } from "@builder.io/qwik-city";
import { Link, useLocation } from "@builder.io/qwik-city";
import {
  LuActivity,
  LuArrowRight,
  LuBarChart3,
  LuBell,
  LuBitcoin,
  LuBookOpen,
  LuDownload,
  LuLayers,
  LuRadar,
  LuSmartphone,
  LuSparkles,
  LuWallet,
  LuWaves,
  LuZap,
} from "@qwikest/icons/lucide";
import { inlineTranslate, useSpeak } from "qwik-speak";
import { PWAInstallButton, useIsStandalone } from "~/components/pwa-install-button";
import en from "~/i18n/en/index";
import es from "~/i18n/es/index";

const MODULE_ORDER = [
  { key: "markets", href: "dashboard/volume-coins/", icon: LuBarChart3 },
  { key: "whales", href: "dashboard/whales-signals/", icon: LuWaves },
  { key: "smart", href: "dashboard/traders-signals/", icon: LuRadar },
  { key: "watchlist", href: "dashboard/top-traders/", icon: LuWallet },
  { key: "nfts", href: "dashboard/nfts/", icon: LuLayers },
  { key: "usdt", href: "dashboard/smart-signals/", icon: LuBell },
] as const;

/** User-facing Qwik benefits only (no infra/vendor jargon on the landing). */
const STACK_ORDER = [
  { key: "blazing", icon: LuZap },
  { key: "resumable", icon: LuSparkles },
  { key: "fluid", icon: LuLayers },
] as const;

export default component$(() => {
  useSpeak({ assets: ["home"] });
  const t = inlineTranslate();
  const isStandalone = useIsStandalone();
  const loc = useLocation();
  const L = loc.params.locale || "en-us";
  const base = `/${L}`;

  return (
    <div class="min-h-screen bg-[#000D0E] text-slate-100 antialiased selection:bg-[#04E6E6]/30 selection:text-white">
      <div class="pointer-events-none fixed inset-0 overflow-hidden">
        {/* Animated Blobs */}
        <div class="animate-float animate-glow absolute -top-40 right-0 h-[500px] w-[500px] rounded-full bg-[#04E6E6]/10 blur-[100px]" />
        <div class="animate-float animate-glow absolute bottom-[-10%] left-[-15%] h-[450px] w-[550px] rounded-full bg-teal-600/15 blur-[110px]" style="animation-delay: -5s; animation-duration: 25s;" />
        <div class="animate-pulse-slow absolute top-[20%] left-[10%] h-[300px] w-[300px] rounded-full bg-[#04E6E6]/05 blur-[80px]" style="animation-delay: -2s;" />
        
        {/* Animated Grid */}
        <div
          class="animate-grid-scan absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage: `linear-gradient(rgba(4, 230, 230, 0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(4, 230, 230, 0.3) 1px, transparent 1px)`,
            backgroundSize: "48px 48px",
          }}
        />

        {/* Flickering Cells / Data Points */}
        <div class="absolute inset-0">
            <div class="absolute top-[10%] left-[20%] h-12 w-12 border border-[#04E6E6]/20 bg-[#04E6E6]/05 animate-pulse" style="animation-duration: 3s;" />
            <div class="absolute top-[45%] left-[65%] h-12 w-12 border border-[#04E6E6]/20 bg-[#04E6E6]/05 animate-pulse" style="animation-duration: 4s; animation-delay: 1s;" />
            <div class="absolute top-[75%] left-[35%] h-12 w-12 border border-[#04E6E6]/20 bg-[#04E6E6]/05 animate-pulse" style="animation-duration: 5s; animation-delay: 2s;" />
            <div class="absolute top-[30%] right-[15%] h-12 w-12 border border-[#04E6E6]/20 bg-[#04E6E6]/05 animate-pulse" style="animation-duration: 3.5s; animation-delay: 0.5s;" />
            
            {/* Random small glow points */}
            <div class="absolute top-[15%] right-[25%] h-1 w-1 bg-[#04E6E6] shadow-[0_0_10px_#04E6E6] animate-ping" />
            <div class="absolute bottom-[25%] left-[45%] h-1 w-1 bg-[#04E6E6] shadow-[0_0_10px_#04E6E6] animate-ping" style="animation-delay: 1.5s;" />
        </div>

        {/* Moving Scanline */}
        <div class="scanline" />
      </div>

      <div class="relative mx-auto max-w-6xl px-4 pb-24 pt-16 sm:px-6 lg:px-8 lg:pt-24">
        <div class="mx-auto max-w-3xl text-center" style={{ viewTransitionName: "cg-hero" }}>
          <div class="mb-6 inline-flex items-center gap-2 rounded-full border border-[#043234] bg-[#001a1c]/90 px-3 py-1 text-xs text-[#04E6E6]/90 shadow-lg shadow-black/20 backdrop-blur-sm">
            <LuSparkles class="h-3.5 w-3.5" />
            {t("home.cryptoHelper.badge@@Crypto Helper · blazing fast · Qwik")}
          </div>
          <h1 class="text-4xl font-bold tracking-tight text-white sm:text-6xl sm:leading-[1.05]">
            {t("home.cryptoHelper.hero.line1@@Your crypto command center,")}
            <span class="mt-1 block bg-gradient-to-r from-[#04E6E6] via-cyan-200 to-teal-300 bg-clip-text text-transparent">
              {t("home.cryptoHelper.hero.line2@@clear and fast.")}
            </span>
          </h1>
          <p class="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-400 sm:text-lg">
            {t(
              "home.cryptoHelper.hero.lead@@One app: markets, signals, bubbles and wallets — with smooth Qwik navigation.",
            )}
          </p>
          <div class="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <Link
              href={`${base}/register/`}
              class="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#04E6E6] px-8 py-3.5 text-sm font-semibold text-[#001a1c] shadow-lg shadow-[#04E6E6]/20 transition hover:scale-[1.02] hover:brightness-110 sm:w-auto"
            >
              {t("home.cryptoHelper.cta.register@@Create account")}
              <LuArrowRight class="h-4 w-4 transition group-hover:translate-x-0.5" />
            </Link>
            <Link
              href={`${base}/login/`}
              class="inline-flex w-full items-center justify-center rounded-xl border border-[#043234] bg-[#001a1c]/80 px-8 py-3.5 text-sm font-semibold text-slate-200 backdrop-blur transition hover:border-[#04E6E6]/50 hover:text-white sm:w-auto"
            >
              {t("home.cryptoHelper.cta.login@@Sign in")}
            </Link>
            <Link
              href={`${base}/dashboard/home/`}
              class="inline-flex w-full items-center justify-center rounded-xl px-4 py-3.5 text-sm font-medium text-[#04E6E6] underline-offset-4 hover:underline sm:w-auto"
            >
              {t("home.cryptoHelper.cta.dashboard@@Open dashboard")}
            </Link>
          </div>
        </div>

        <div class="mx-auto mt-16 grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-3">
          {(
            [
              { k: "a", stat: "signals" as const, icon: LuActivity },
              { k: "b", stat: "markets" as const, icon: LuBitcoin },
              { k: "c", stat: "onchain" as const, icon: LuRadar },
            ] as const
          ).map((s) => (
            <div
              key={s.k}
              class="home-stat-card flex items-center gap-3 rounded-2xl border border-[#043234] bg-[#001a1c]/80 p-4 backdrop-blur-md transition hover:border-[#04E6E6]/35"
              style={{ viewTransitionName: `cg-stat-${s.k}` }}
            >
              <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#043234]/80 text-[#04E6E6]">
                <s.icon class="h-5 w-5" />
              </span>
              <div>
                <div class="text-xs font-medium uppercase tracking-wide text-slate-500">
                  {t(`home.cryptoHelper.stats.${s.stat}.label@@—`)}
                </div>
                <div class="text-lg font-semibold text-white">{t(`home.cryptoHelper.stats.${s.stat}.value@@—`)}</div>
              </div>
            </div>
          ))}
        </div>

        <h2 class="relative mt-24 text-center text-2xl font-bold text-white sm:text-3xl">
          {t("home.cryptoHelper.modulesSection.title@@Everything essential")}
        </h2>
        <p class="relative mx-auto mt-3 max-w-2xl text-center text-sm text-slate-400">
          {t(
            "home.cryptoHelper.modulesSection.subtitle@@Each card links to the dashboard. Transitions keep the same shell.",
          )}
        </p>

        <div class="relative mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MODULE_ORDER.map((f) => {
            const Icon = f.icon;
            const title = t(`home.cryptoHelper.modules.${f.key}.title@@`);
            const desc = t(`home.cryptoHelper.modules.${f.key}.desc@@`);
            const tag = t(`home.cryptoHelper.modules.${f.key}.tag@@`);
            return (
              <Link
                key={f.key}
                href={`${base}/${f.href}`}
                class="home-feature-card group flex flex-col rounded-2xl border border-[#043234] bg-[#001a1c]/70 p-5 shadow-xl shadow-black/30 backdrop-blur-sm transition duration-300 hover:-translate-y-0.5 hover:border-[#04E6E6]/40 hover:shadow-[#04E6E6]/10"
                style={{ viewTransitionName: `cg-mod-${f.key}` }}
              >
                <div class="mb-4 flex items-start justify-between gap-2">
                  <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-[#043234] text-[#04E6E6] transition group-hover:bg-[#04E6E6]/15">
                    <Icon class="h-5 w-5" />
                  </span>
                  <span class="rounded-md border border-[#043234] px-2 py-0.5 text-[10px] font-medium text-[#04E6E6]/90">
                    {tag}
                  </span>
                </div>
                <h3 class="text-lg font-semibold text-white">{title}</h3>
                <p class="mt-2 flex-1 text-sm leading-relaxed text-slate-400">{desc}</p>
                <span class="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#04E6E6]">
                  {t("home.cryptoHelper.open@@Open")}
                  <LuArrowRight class="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                </span>
              </Link>
            );
          })}
        </div>

        <section
          class="relative mt-24 rounded-2xl border border-[#043234] bg-[#001a1c]/50 p-6 sm:p-10"
          aria-labelledby="stack-heading"
        >
          <div class="mx-auto max-w-2xl text-center">
            <h2 id="stack-heading" class="text-xl font-bold text-white sm:text-2xl">
              {t("home.cryptoHelper.stackSection.title@@Fast by design")}
            </h2>
            <p class="mt-2 text-sm text-slate-400">
              {t(
                "home.cryptoHelper.stackSection.subtitle@@Qwik keeps interactions instant — less JavaScript on the wire, more time for your charts.",
              )}
            </p>
          </div>
          <div class="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {STACK_ORDER.map((s) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.key}
                  class="rounded-xl border border-[#043234]/80 bg-[#000D0E]/60 p-4 transition hover:border-[#04E6E6]/25"
                >
                  <div class="flex items-center gap-2 text-[#04E6E6]">
                    <Icon class="h-5 w-5 shrink-0" />
                    <h3 class="text-sm font-semibold text-white">
                      {t(`home.cryptoHelper.stack.${s.key}.title@@`)}
                    </h3>
                  </div>
                  <p class="mt-2 text-xs leading-relaxed text-slate-400">
                    {t(`home.cryptoHelper.stack.${s.key}.desc@@`)}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <section
          class="relative mt-12 flex flex-col gap-4 rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-950/20 to-[#001a1c] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8"
          aria-labelledby="pro-heading"
        >
          <div class="flex items-start gap-3">
            <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300">
              <LuZap class="h-6 w-6" />
            </span>
            <div>
              <h2 id="pro-heading" class="text-lg font-bold text-white">
                {t("home.cryptoHelper.proSection.title@@Pro")}
              </h2>
              <p class="mt-1 text-sm text-slate-400">{t("home.cryptoHelper.proSection.desc@@")}</p>
              <p class="mt-2 text-xs text-slate-500">{t("home.cryptoHelper.proSection.note@@")}</p>
            </div>
          </div>
          <Link
            href={`${base}/login/`}
            class="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-5 py-2.5 text-sm font-semibold text-amber-100 transition hover:bg-amber-500/20"
          >
            <LuBookOpen class="h-4 w-4" />
            {t("home.cryptoHelper.cta.login@@Sign in")}
          </Link>
        </section>

        {!isStandalone.value ? (
          <section
            class="relative mt-20 overflow-hidden rounded-2xl border border-[#043234] bg-gradient-to-br from-[#001a1c] via-[#000D0E] to-[#043234]/40"
            aria-label={t("home.cryptoHelper.pwa.title@@Install")}
            style={{ viewTransitionName: "cg-pwa-banner" }}
          >
            <div class="absolute inset-0 opacity-[0.07] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjIiIGZpbGw9IiMwNEU2RTYiLz48L3N2Zz4=')]" />
            <div class="relative z-10 flex flex-col items-center justify-between gap-8 px-6 py-10 md:flex-row md:px-10">
              <div class="max-w-xl space-y-3 text-center md:text-left">
                <h3 class="flex items-center justify-center gap-2 text-2xl font-bold text-white md:justify-start sm:text-3xl">
                  <LuSmartphone class="h-8 w-8 shrink-0 text-[#04E6E6]" />
                  {t("home.cryptoHelper.pwa.title@@Install Crypto Helper")}
                </h3>
                <p class="text-sm leading-relaxed text-slate-400 sm:text-base">{t("home.cryptoHelper.pwa.body@@")}</p>
              </div>
              <div class="flex shrink-0 flex-col items-center gap-2">
                <button
                  type="button"
                  onClick$={$(() => document.getElementById("cg-pwa-install-trigger")?.click())}
                  class="inline-flex items-center gap-2 rounded-xl bg-[#04E6E6] px-8 py-4 text-base font-bold text-[#001a1c] shadow-lg shadow-[#04E6E6]/20 transition hover:brightness-110"
                >
                  <LuDownload class="h-6 w-6" />
                  {t("home.cryptoHelper.pwa.install@@Install now")}
                </button>
                <span class="max-w-[220px] text-center text-[10px] leading-tight text-slate-500">
                  {t("home.cryptoHelper.pwa.hint@@")}
                </span>
              </div>
            </div>
          </section>
        ) : null}
      </div>
      <PWAInstallButton />
    </div>
  );
});

export const head: DocumentHead = ({ params }) => {
  const L = params.locale || "en-us";
  const meta = L.toLowerCase().startsWith("es") ? es.home.cryptoHelper.meta : en.home.cryptoHelper.meta;
  return {
    title: meta.title,
    meta: [{ name: "description", content: meta.description }],
  };
};
