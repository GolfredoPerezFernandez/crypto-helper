import {
    component$,
    Slot,
    useSignal,
    $,
    useStyles$,
    useContextProvider,
    useComputed$,
    useTask$,
    useVisibleTask$,
} from '@builder.io/qwik';
import { Link, routeLoader$, useLocation, useNavigate } from '@builder.io/qwik-city';
import { NavLink } from '~/components/nav-link';
import {
    LuHome,
    LuWallet,
    LuCoins,
    LuMenu,
    LuX,
    LuLoader2,
    LuRadar,
    LuLogIn,
    LuUserPlus,
    LuAlertTriangle,
    LuCopy,
    LuSettings,
    LuBell,
    LuLogOut,
    LuZap,
} from '@qwikest/icons/lucide';
import { verifyAuth } from '~/utils/auth';
import { getUserProAccess } from '~/server/crypto-ghost/user-access';
import { useWallet } from '~/hooks/useWallet';
import { DemoModeContext } from '~/contexts/demo';
import { LanguageSwitcher } from '~/components/ui/language-switcher/language-switcher';
// @ts-ignore
import { useSpeakContext, inlineTranslate, useSpeak } from 'qwik-speak';
import { WalletSelectionModal } from '~/components/wallet/WalletSelectionModal';
import { ProUpgradeModal } from '~/components/billing/pro-upgrade-modal';
import { AiChatFab } from '~/components/ai-chat-fab/ai-chat-fab';
import { logoutUser } from '~/server/auth-logout';
import { MarketplaceConfigContext } from '~/contexts/config';
import { DashboardShell, type DashboardAccessState } from './dashboard/layout';
export { useDashboardAuth } from './dashboard/layout';

// ---------------- CONFIG LOADER ----------------
export const useMarketplaceConfigLoader = routeLoader$(async (requestEvent) => {
    return {
        nftAddress: requestEvent.env.get('PUBLIC_NFT_ADDRESS') || '',
        saleMarketAddress: requestEvent.env.get('PUBLIC_SALE_MARKET_ADDRESS') || '',
        rentalMarketAddress: requestEvent.env.get('PUBLIC_RENTAL_MARKET_ADDRESS') || '',
        powerMarketAddress: requestEvent.env.get('PUBLIC_POWER_MARKET_ADDRESS') || '',
        paymentTokenAddress: requestEvent.env.get('PUBLIC_KNRT_TOKEN_ADDRESS') || '',
        rpcUrl: requestEvent.env.get('PUBLIC_RPC_URL') || '',
        fallbackRpcUrl: requestEvent.env.get('PUBLIC_FALLBACK_RPC_URL') || '',
    };
});

// ---------------- AUTH LOADER ----------------
export const useLayoutAuthLoader = routeLoader$(async (requestEvent) => {
    try {
        const isAuthenticated = await verifyAuth(requestEvent);
        if (!isAuthenticated) {
            return { isAuthenticated: false as const, hasPro: false as const };
        }
        const pro = await getUserProAccess(requestEvent);
        return {
            isAuthenticated: true as const,
            hasPro: pro.hasPro,
            sessionEmail: pro.email,
            sessionAuthProvider: pro.authProvider,
        };
    } catch {
        return { isAuthenticated: false as const, hasPro: false as const };
    }
});

// ---------------- MAIN LAYOUT ----------------
export default component$(() => {
    const auth = useLayoutAuthLoader();
    const location = useLocation();
    const speakState = useSpeakContext();

    // Synchronize speakState.locale with [locale] param during SPA navigation
    useTask$(({ track }) => {
        const lang = track(() => location.params.locale);
        if (lang) {
            console.log(`[Layout SPA] Synchronizing locale: ${lang}`);
            const newLocale = speakState.config.supportedLocales.find(
                (l: any) => l.lang.toLowerCase() === lang.toLowerCase()
            );
            if (newLocale && newLocale.lang !== speakState.locale.lang) {
                console.log(`[Layout SPA] Updating speakState to: ${newLocale.lang}`);
                // Update the speakState (which is a store)
                Object.assign(speakState.locale, newLocale);
            }
        }
    });

    // Ensure 'app' asset is loaded for the fixed parts of the layout
    useSpeak({ runtimeAssets: ['app'] });

    const isMobileMenuOpen = useSignal(false);
    const demoEnabled = useSignal(false);

    /** Set by Qwik City as soon as SPA navigation starts (before route loaders finish). */
    const isSpaNavigating = useComputed$(() => {
        const loc = location as { isNavigating?: boolean };
        return loc.isNavigating === true;
    });
    const usePrimarySidebarShell = useComputed$(() => {
        const p = location.url.pathname.toLowerCase();
        if (p.includes('/dashboard/')) return false;
        if (/\/(login|register|privacy|terms)\//.test(p)) return false;
        return true;
    });
    const shellSession = useComputed$<DashboardAccessState>(() => ({
        hasPro: auth.value?.hasPro === true,
        isSubscriber: auth.value?.hasPro === true,
        isAdmin: false,
        showSyncDebug: false,
        canTriggerFullMarketSync: false,
    }));

    const L = location.params.locale || 'en-us';

    const config = useMarketplaceConfigLoader();

    useContextProvider(MarketplaceConfigContext, {
        nftAddress: config.value.nftAddress,
        saleMarketAddress: config.value.saleMarketAddress,
        rentalMarketAddress: config.value.rentalMarketAddress,
        powerMarketAddress: config.value.powerMarketAddress,
        paymentTokenAddress: config.value.paymentTokenAddress,
        rpcUrl: config.value.rpcUrl,
        fallbackRpcUrl: config.value.fallbackRpcUrl,
    });

    useContextProvider(DemoModeContext, {
        enabled: demoEnabled,
        toggle: $(() => {
            demoEnabled.value = !demoEnabled.value;
        }),
    });

    // Close mobile menu on route change (useTask runs when pathname updates; no visible-task delay)
    useTask$(({ track }) => {
        track(() => location.url.pathname);
        isMobileMenuOpen.value = false;
    });

    useStyles$(`
    /* Custom scrollbar for webkit */
    ::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    ::-webkit-scrollbar-track {
      background: transparent;
    }
    ::-webkit-scrollbar-thumb {
      background: #043234;
      border-radius: 3px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: rgba(4, 230, 230, 0.45);
    }
    
    @keyframes loading-bar {
      0% {
        transform: translateX(-100%);
        width: 50%;
      }
      50% {
        transform: translateX(0%);
        width: 80%;
      }
      100% {
        transform: translateX(100%);
        width: 50%;
      }
    }
    
    .animate-loading-bar {
      animation: loading-bar 1s ease-in-out infinite;
    }
  `);

    /* -------------------------------------------------------------
       CONNECT BUTTON LOGIC
    ------------------------------------------------------------- */
    const {
        wallet,
        connectWallet,
        isConnecting,
        addBaseNetwork,
        openWalletModal,
        closeModal,
        disconnectWallet,
    } = useWallet();

    const nav = useNavigate();
    const isModalOpening = useSignal(false);
    const accountMenuOpen = useSignal(false);
    const proUpgradeOpen = useSignal(false);

    useVisibleTask$(({ cleanup }) => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            if (accountMenuOpen.value) accountMenuOpen.value = false;
            if (proUpgradeOpen.value) proUpgradeOpen.value = false;
        };
        document.addEventListener('keydown', onKey);
        cleanup(() => document.removeEventListener('keydown', onKey));
    });

    const closeAccountMenu = $(() => {
        accountMenuOpen.value = false;
    });

    const closeProUpgrade = $(() => {
        proUpgradeOpen.value = false;
    });

    const handleConnect = $(async () => {
        if (wallet.connected) {
            accountMenuOpen.value = true;
            return;
        }
        isModalOpening.value = true;
        // Open modal instead of directly connecting
        openWalletModal();
        setTimeout(() => {
            isModalOpening.value = false;
        }, 600);
    });

    const goProfileSettings = $(async () => {
        accountMenuOpen.value = false;
        await nav(`/${L}/profile/`);
    });

    const goNotificationSettings = $(async () => {
        accountMenuOpen.value = false;
        await nav(`/${L}/notifications-settings/`);
    });

    const handleDisconnectWallet = $(async () => {
        accountMenuOpen.value = false;
        try {
            const loggedOut = await logoutUser();
            if (!loggedOut.success && loggedOut.message) {
                console.warn('[logout]', loggedOut.message);
            }
        } catch (e) {
            console.warn('[logout] request failed', e);
        }
        await disconnectWallet();
        if (typeof window !== 'undefined') {
            localStorage.removeItem('knrt_managed_wallet');
            localStorage.removeItem('knrt_wallet_type');
            window.location.href = `/${L}/`;
        }
    });

    const handleSelectMetaMask = $(async () => {
        closeModal();
        await connectWallet();
    });

    const copyWalletAddress = $((e: Event) => {
        e.stopPropagation();
        const addr = String(wallet.address || '').trim();
        if (!addr || typeof navigator === 'undefined') return;
        void (async () => {
            try {
                await navigator.clipboard.writeText(addr);
            } catch {
                try {
                    const ta = document.createElement('textarea');
                    ta.value = addr;
                    ta.style.position = 'fixed';
                    ta.style.left = '-9999px';
                    document.body.appendChild(ta);
                    ta.select();
                    document.execCommand('copy');
                    document.body.removeChild(ta);
                } catch {
                    /* ignore */
                }
            }
        })();
    });

    const shortDetails = (addr: string) => {
        if (!addr) return '';
        return `${addr.slice(0, 5)}...${addr.slice(-4)}`;
    };

    const t_connect = useComputed$(() => inlineTranslate()('app.header.connect@@Connect'));
    const t_connecting = useComputed$(() => inlineTranslate()('app.header.connecting@@Connecting...'));
    const t_menu = useComputed$(() => inlineTranslate()('app.header.menu@@Menu'));
    const t_wrongNetwork = useComputed$(() => inlineTranslate()('app.header.wrongNetwork@@Wrong Network. Switch to Base.'));
    const t_switch = useComputed$(() => inlineTranslate()('app.header.switch@@Switch'));
    const t_footerPrivacy = useComputed$(() => inlineTranslate()('app.footer.privacy@@Privacy'));
    const t_footerTerms = useComputed$(() => inlineTranslate()('app.footer.terms@@Terms'));
    const t_walletMenuTitle = useComputed$(() => inlineTranslate()('app.header.walletMenuTitle@@Account'));
    const t_walletMenuSubtitle = useComputed$(() =>
        inlineTranslate()('app.header.walletMenuSubtitle@@Profile, settings, or disconnect this wallet.'),
    );
    const t_walletMenuProfile = useComputed$(() =>
        inlineTranslate()('app.header.walletMenuProfile@@Profile & settings'),
    );
    const t_walletMenuNotifications = useComputed$(() =>
        inlineTranslate()('app.header.walletMenuNotifications@@Notification settings'),
    );
    const t_walletMenuDisconnect = useComputed$(() =>
        inlineTranslate()('app.header.walletMenuDisconnect@@Disconnect wallet'),
    );
    const t_walletMenuClose = useComputed$(() => inlineTranslate()('app.header.walletMenuClose@@Close'));
    const t_walletNoAppSession = useComputed$(() =>
        inlineTranslate()(
            'app.header.walletNoAppSession@@Not signed in — open Login or approve the signature on this page.',
        ),
    );
    const t_cryptoBrand = useComputed$(() => inlineTranslate()('app.footer.cryptoBrand@@Crypto Helper'));
    const t_homeNav = useComputed$(() => inlineTranslate()('app.footer.homeNav@@Home'));
    const t_dashboardNav = useComputed$(() => inlineTranslate()('app.footer.dashboardNav@@Dashboard'));
    const t_loginNav = useComputed$(() => inlineTranslate()('app.footer.loginNav@@Login'));
    const t_registerNav = useComputed$(() => inlineTranslate()('app.footer.registerNav@@Register'));
    const t_copyAddressAria = useComputed$(() =>
        inlineTranslate()('app.footer.copyAddressAria@@Copy wallet address'),
    );
    const t_walletShort = useComputed$(() => inlineTranslate()('app.footer.walletShort@@Wallet'));
    const t_cryptoTagline = useComputed$(() =>
        inlineTranslate()(
            'app.footer.cryptoTagline@@Markets, live signals and wallets — one clear dashboard.',
        ),
    );
    const t_appNavSection = useComputed$(() => inlineTranslate()('app.footer.appNavSection@@App'));
    const t_apiNavSection = useComputed$(() => inlineTranslate()('app.footer.apiNavSection@@API'));
    const t_healthLink = useComputed$(() => inlineTranslate()('app.footer.healthLink@@Health'));
    const t_rightsReserved = useComputed$(() =>
        inlineTranslate()('app.footer.rightsReserved@@All rights reserved.'),
    );
    const t_upgradeNav = useComputed$(() => inlineTranslate()('app.proUpgrade.nav@@Upgrade Pro'));

    return (
        <div key={location.params.locale} class="relative flex min-h-screen flex-col bg-[#000D0E] font-sans text-slate-100 antialiased selection:bg-[#04E6E6]/30 selection:text-white">

            <div class="pointer-events-none fixed inset-0 overflow-hidden -z-10">
                <div class="absolute -top-40 right-0 h-[380px] w-[380px] rounded-full bg-[#04E6E6]/06 blur-[100px]" />
                <div class="absolute bottom-0 left-[-15%] h-[320px] w-[420px] rounded-full bg-teal-600/08 blur-[90px]" />
            </div>

            {/* Wallet Selection Modal */}
            {wallet.isModalOpen && (
                <WalletSelectionModal
                    onClose$={closeModal}
                    onSelectMetaMask$={handleSelectMetaMask}
                />
            )}

            {proUpgradeOpen.value ? <ProUpgradeModal onClose$={closeProUpgrade} /> : null}

            {accountMenuOpen.value && wallet.connected ? (
                <div
                    class="fixed inset-0 z-[200] flex items-end justify-center p-4 sm:items-center"
                    role="presentation"
                >
                    <button
                        type="button"
                        class="absolute inset-0 bg-black/65 backdrop-blur-[2px]"
                        aria-label={t_walletMenuClose.value}
                        onClick$={closeAccountMenu}
                    />
                    <div
                        class="relative z-10 w-full max-w-sm rounded-2xl border border-[#043234] bg-[#001a1c] p-5 shadow-2xl shadow-black/50"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="wallet-menu-title"
                        onClick$={$((e: Event) => e.stopPropagation())}
                    >
                        <h2 id="wallet-menu-title" class="text-lg font-semibold text-white">
                            {t_walletMenuTitle.value}
                        </h2>
                        <p class="mt-1 text-xs text-slate-500">{t_walletMenuSubtitle.value}</p>
                        <div class="mt-4 space-y-2">
                            <button
                                type="button"
                                onClick$={goProfileSettings}
                                class="flex w-full items-center gap-3 rounded-xl border border-[#043234] bg-[#000D0E]/60 px-4 py-3 text-left text-sm font-medium text-slate-200 transition hover:border-[#04E6E6]/45 hover:bg-[#043234]/40"
                            >
                                <LuSettings class="h-5 w-5 shrink-0 text-[#04E6E6]" />
                                {t_walletMenuProfile.value}
                            </button>
                            {auth.value?.isAuthenticated ? (
                                <button
                                    type="button"
                                    onClick$={goNotificationSettings}
                                    class="flex w-full items-center gap-3 rounded-xl border border-[#043234] bg-[#000D0E]/60 px-4 py-3 text-left text-sm font-medium text-slate-200 transition hover:border-[#04E6E6]/45 hover:bg-[#043234]/40"
                                >
                                    <LuBell class="h-5 w-5 shrink-0 text-[#04E6E6]" />
                                    {t_walletMenuNotifications.value}
                                </button>
                            ) : null}
                            {auth.value?.isAuthenticated && auth.value?.hasPro === false ? (
                                <button
                                    type="button"
                                    onClick$={$(() => {
                                        accountMenuOpen.value = false;
                                        proUpgradeOpen.value = true;
                                    })}
                                    class="flex w-full items-center gap-3 rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-left text-sm font-medium text-amber-200 transition hover:border-amber-400/50 hover:bg-amber-500/20"
                                >
                                    <LuZap class="h-5 w-5 shrink-0 text-amber-300" />
                                    {t_upgradeNav.value}
                                </button>
                            ) : null}
                            <button
                                type="button"
                                onClick$={handleDisconnectWallet}
                                class="flex w-full items-center gap-3 rounded-xl border border-rose-500/35 bg-rose-950/20 px-4 py-3 text-left text-sm font-medium text-rose-200 transition hover:border-rose-400/50 hover:bg-rose-950/35"
                            >
                                <LuLogOut class="h-5 w-5 shrink-0" />
                                {t_walletMenuDisconnect.value}
                            </button>
                        </div>
                        <button
                            type="button"
                            onClick$={closeAccountMenu}
                            class="mt-4 w-full rounded-xl py-2.5 text-sm font-medium text-slate-500 transition hover:bg-[#043234]/30 hover:text-slate-300"
                        >
                            {t_walletMenuClose.value}
                        </button>
                    </div>
                </div>
            ) : null}

            <header style={{ viewTransitionName: "cg-chrome-header" }}
                class="cg-vt-chrome sticky top-0 z-50 w-full border-b border-[#043234] bg-[#001a1c]/92 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.35)] transition-all duration-300"
            >
                <div class="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                    {/* Logo + Brand */}
                    <div class="flex min-w-0 flex-1 items-center gap-2">
                        <NavLink href={`/${L}/`} class="flex min-w-0 items-center gap-2 transition-transform hover:scale-[1.02]">
                            <div class="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-[#04E6E6] to-teal-600 shadow-lg shadow-[#04E6E6]/25">
                                <LuRadar class="h-5 w-5 text-[#001a1c]" />
                                <div class="absolute inset-0 bg-gradient-to-tr from-white/25 to-transparent" />
                            </div>
                            <span class="truncate text-lg font-bold tracking-tight text-white">{t_cryptoBrand.value}</span>
                        </NavLink>

                        <nav class="hidden min-w-0 md:ml-6 md:flex md:items-center md:gap-0.5">
                            <NavLink
                                href={`/${L}/`}
                                activeClass="bg-[#043234] text-[#04E6E6]"
                                class="group relative flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 transition-all hover:bg-[#043234]/70 hover:text-white"
                            >
                                <LuHome class="h-4 w-4 text-slate-500 group-hover:text-[#04E6E6] group-[.active]:text-[#04E6E6]" />
                                {t_homeNav.value}
                            </NavLink>

                            <NavLink
                                    href={`/${L}/home/`}
                                activeClass="bg-[#043234] text-[#04E6E6]"
                                class="group relative flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 transition-all hover:bg-[#043234]/70 hover:text-white"
                            >
                                <LuCoins class="h-4 w-4 text-slate-500 group-hover:text-[#04E6E6] group-[.active]:text-[#04E6E6]" />
                                {t_dashboardNav.value}
                            </NavLink>

                            {!auth.value?.isAuthenticated ? (
                                <>
                                    <Link
                                        href={`/${L}/login/`}
                                        class="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-[#043234]/70 hover:text-white"
                                    >
                                        <LuLogIn class="h-4 w-4 text-slate-500" />
                                        {t_loginNav.value}
                                    </Link>
                                    <Link
                                        href={`/${L}/register/`}
                                        class="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-[#04E6E6] transition-colors hover:text-white"
                                    >
                                        <LuUserPlus class="h-4 w-4" />
                                        {t_registerNav.value}
                                    </Link>
                                </>
                            ) : null}
                        </nav>
                    </div>

                    <div class="flex shrink-0 items-center gap-2 sm:gap-3">
                        {auth.value?.isAuthenticated && auth.value?.hasPro === false ? (
                            <button
                                type="button"
                                onClick$={() => {
                                    proUpgradeOpen.value = true;
                                }}
                                class="hidden items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-xs font-semibold text-amber-200 transition hover:border-amber-400/60 hover:bg-amber-500/20 sm:inline-flex"
                            >
                                <LuZap class="h-3.5 w-3.5 shrink-0 text-amber-300" />
                                <span class="max-w-[9rem] truncate">{t_upgradeNav.value}</span>
                            </button>
                        ) : null}
                        <LanguageSwitcher />

                        {isConnecting.value || isModalOpening.value ? (
                        <button
                            onClick$={handleConnect}
                            disabled={isConnecting.value || isModalOpening.value}
                            class="inline-flex items-center justify-center overflow-hidden rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#04E6E6] focus:ring-offset-2 focus:ring-offset-[#001a1c] sm:px-4 bg-[#04E6E6] text-[#001a1c] shadow-lg shadow-[#04E6E6]/20 hover:scale-[1.02] hover:brightness-110"
                        >
                            <LuLoader2 class="mr-2 h-4 w-4 animate-spin" />
                            <span class="hidden sm:inline">{t_connecting.value}</span>
                        </button>
                        ) : wallet.connected ? (
                        <div
                            role="button"
                            tabIndex={0}
                            onClick$={handleConnect}
                            onKeyDown$={$((ev: KeyboardEvent) => {
                                if (ev.key === 'Enter' || ev.key === ' ') {
                                    ev.preventDefault();
                                    handleConnect();
                                }
                            })}
                            title={
                                auth.value?.isAuthenticated &&
                                auth.value.sessionEmail &&
                                !String(auth.value.sessionEmail)
                                    .toLowerCase()
                                    .endsWith('@crypto-ghost.internal')
                                    ? auth.value.sessionEmail
                                    : undefined
                            }
                            class="inline-flex cursor-pointer flex-col items-center justify-center gap-0.5 overflow-hidden rounded-lg border border-[#043234] bg-[#043234]/50 px-2 py-1.5 text-sm font-semibold text-slate-200 transition-all duration-300 hover:border-[#04E6E6]/40 hover:bg-[#043234] focus:outline-none focus:ring-2 focus:ring-[#04E6E6] focus:ring-offset-2 focus:ring-offset-[#001a1c] sm:px-3"
                        >
                            <div class="flex w-full min-w-0 max-w-[11rem] items-center justify-center gap-1 sm:max-w-[15rem]">
                                <span class="min-w-0 truncate text-center font-mono text-xs leading-tight">
                                    {shortDetails(wallet.address || '')}
                                </span>
                                <button
                                    type="button"
                                    class="shrink-0 rounded p-0.5 text-slate-400 transition hover:bg-[#04E6E6]/15 hover:text-[#04E6E6] focus:outline-none focus-visible:ring-1 focus-visible:ring-[#04E6E6]"
                                    aria-label={t_copyAddressAria.value}
                                    title={t_copyAddressAria.value}
                                    onClick$={copyWalletAddress}
                                >
                                    <LuCopy class="h-3.5 w-3.5" />
                                </button>
                            </div>
                            {auth.value?.isAuthenticated &&
                            auth.value.sessionEmail &&
                            !String(auth.value.sessionEmail)
                                .toLowerCase()
                                .endsWith('@crypto-ghost.internal') ? (
                                <span class="max-w-[9rem] truncate text-center text-[10px] font-normal leading-tight text-slate-400 sm:max-w-[13rem]">
                                    {auth.value.sessionEmail}
                                </span>
                            ) : !auth.value?.isAuthenticated && wallet.connected ? (
                                <span class="max-w-[14rem] px-0.5 text-center text-[9px] font-normal leading-tight text-amber-400/95 sm:max-w-[18rem]">
                                    {t_walletNoAppSession.value}
                                </span>
                            ) : null}
                        </div>
                        ) : (
                        <button
                            onClick$={handleConnect}
                            disabled={isConnecting.value || isModalOpening.value}
                            class="inline-flex items-center justify-center overflow-hidden rounded-lg px-3 py-2 text-sm font-semibold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#04E6E6] focus:ring-offset-2 focus:ring-offset-[#001a1c] sm:px-4 bg-[#04E6E6] text-[#001a1c] shadow-lg shadow-[#04E6E6]/20 hover:scale-[1.02] hover:brightness-110"
                        >
                            <LuWallet class="mr-2 h-4 w-4" />
                            <span class="hidden sm:inline">{t_connect.value}</span>
                            <span class="sm:hidden">{t_walletShort.value}</span>
                        </button>
                        )}

                        <button
                            type="button"
                            onClick$={() => (isMobileMenuOpen.value = !isMobileMenuOpen.value)}
                            class="inline-flex items-center justify-center rounded-lg p-2 text-slate-400 hover:bg-[#043234] hover:text-[#04E6E6] focus:outline-none focus:ring-2 focus:ring-[#04E6E6] md:hidden"
                            aria-label="Toggle menu"
                        >
                            {isMobileMenuOpen.value ? <LuX class="h-6 w-6" /> : <LuMenu class="h-6 w-6" />}
                        </button>
                    </div>
                </div>

                {/* Network Warning */}
                {wallet.connected && wallet.isCorrectNetwork === false && (
                    <div class="flex items-center justify-center gap-2 border-b border-amber-900/40 bg-amber-950/60 px-4 py-2 text-xs font-medium text-amber-200 backdrop-blur-sm">
                        <LuAlertTriangle class="h-4 w-4 text-amber-400" />
                        {t_wrongNetwork.value}
                        <button
                            onClick$={() => addBaseNetwork()}
                            class="ml-2 underline hover:text-[#04E6E6]"
                        >
                            {t_switch.value}
                        </button>
                    </div>
                )}

                {/* Route Navigation Loading Bar */}
                {isSpaNavigating.value && (
                    <div class="absolute bottom-0 left-0 w-full h-1 overflow-hidden bg-[#043234]/80">
                        <div class="h-full bg-gradient-to-r from-[#04E6E6] via-teal-300 to-[#04E6E6] animate-loading-bar" />
                    </div>
                )}
            </header>

            {isMobileMenuOpen.value ? (
                <div class="border-b border-[#043234] bg-[#001a1c]/98 px-4 py-3 shadow-lg shadow-black/30 backdrop-blur-md md:hidden">
                    <nav class="flex flex-col gap-0.5">
                        <div class="pb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">{t_menu.value}</div>
                        <NavLink
                            href={`/${L}/`}
                            activeClass="bg-[#043234] text-[#04E6E6]"
                            class="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-base font-medium text-slate-300 hover:bg-[#043234]/60 hover:text-white"
                        >
                            <span class="flex h-9 w-9 items-center justify-center rounded-lg bg-[#043234]/80 text-slate-400 group-[.active]:text-[#04E6E6]">
                                <LuHome class="h-5 w-5" />
                            </span>
                            {t_homeNav.value}
                        </NavLink>
                        <NavLink
                                href={`/${L}/home/`}
                            activeClass="bg-[#043234] text-[#04E6E6]"
                            class="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-base font-medium text-slate-300 hover:bg-[#043234]/60 hover:text-white"
                        >
                            <span class="flex h-9 w-9 items-center justify-center rounded-lg bg-[#043234]/80 text-slate-400 group-[.active]:text-[#04E6E6]">
                                <LuCoins class="h-5 w-5" />
                            </span>
                            {t_dashboardNav.value}
                        </NavLink>
                        {auth.value?.isAuthenticated && auth.value?.hasPro === false ? (
                            <button
                                type="button"
                                onClick$={() => {
                                    proUpgradeOpen.value = true;
                                    isMobileMenuOpen.value = false;
                                }}
                                class="flex w-full items-center gap-3 rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2.5 text-left text-base font-medium text-amber-200 hover:bg-amber-500/15 sm:hidden"
                            >
                                <span class="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/20 text-amber-300">
                                    <LuZap class="h-5 w-5" />
                                </span>
                                {t_upgradeNav.value}
                            </button>
                        ) : null}
                        {!auth.value?.isAuthenticated ? (
                            <>
                                <Link
                                    href={`/${L}/login/`}
                                    class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-base font-medium text-slate-300 hover:bg-[#043234]/60 hover:text-white"
                                >
                                    <span class="flex h-9 w-9 items-center justify-center rounded-lg bg-[#043234]/80 text-slate-400">
                                        <LuLogIn class="h-5 w-5" />
                                    </span>
                                    {t_loginNav.value}
                                </Link>
                                <Link
                                    href={`/${L}/register/`}
                                    class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-base font-medium text-[#04E6E6] hover:bg-[#043234]/60 hover:text-white"
                                >
                                    <span class="flex h-9 w-9 items-center justify-center rounded-lg bg-[#043234]/80 text-[#04E6E6]">
                                        <LuUserPlus class="h-5 w-5" />
                                    </span>
                                    {t_registerNav.value}
                                </Link>
                            </>
                        ) : null}
                    </nav>
                </div>
            ) : null}

            {/* MAIN CONTENT SLOT */}
            <main class="flex-1">
                {usePrimarySidebarShell.value ? (
                    <DashboardShell session={shellSession.value}>
                        <Slot />
                    </DashboardShell>
                ) : (
                    <div
                        style={{ viewTransitionName: "cg-main-stage" }}
                        class="relative isolate cg-vt-main-stage"
                    >
                        {isSpaNavigating.value && (
                            <div class="fixed top-0 left-0 z-[60] h-1 w-full animate-pulse bg-gradient-to-r from-[#04E6E6] via-teal-300 to-[#04E6E6]" />
                        )}
                        <Slot />
                    </div>
                )}
            </main>

            <AiChatFab
                locale={L}
                isAuthenticated={auth.value.isAuthenticated}
                hasPro={auth.value.hasPro}
                onOpenPro$={$(() => {
                    proUpgradeOpen.value = true;
                })}
            />

            {!usePrimarySidebarShell.value ? (
            <footer
                style={{ viewTransitionName: "cg-chrome-footer" }}
                class="cg-vt-chrome border-t border-[#043234] bg-[#000D0E]/95 pt-14 pb-8 backdrop-blur-sm"
            >
                <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div class="grid gap-10 md:grid-cols-2 lg:grid-cols-3">
                        <div class="space-y-3">
                            <div class="flex items-center gap-2">
                                <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#04E6E6] to-teal-600 text-[#001a1c] shadow-md shadow-[#04E6E6]/20">
                                    <LuRadar class="h-5 w-5" />
                                </div>
                                <span class="text-xl font-bold text-white">{t_cryptoBrand.value}</span>
                            </div>
                            <p class="max-w-sm text-sm leading-relaxed text-slate-400">{t_cryptoTagline.value}</p>
                        </div>

                        <div>
                            <h3 class="text-xs font-semibold uppercase tracking-wider text-slate-500">{t_appNavSection.value}</h3>
                            <ul class="mt-4 space-y-2.5">
                                <li>
                                    <Link href={`/${L}/`} class="text-sm text-slate-400 transition hover:text-[#04E6E6]">{t_homeNav.value}</Link>
                                </li>
                                <li>
                                    <Link href={`/${L}/home/`} class="text-sm text-slate-400 transition hover:text-[#04E6E6]">{t_dashboardNav.value}</Link>
                                </li>
                                {!auth.value?.isAuthenticated ? (
                                    <>
                                        <li>
                                            <Link href={`/${L}/login/`} class="text-sm text-slate-400 transition hover:text-[#04E6E6]">{t_loginNav.value}</Link>
                                        </li>
                                        <li>
                                            <Link href={`/${L}/register/`} class="text-sm text-slate-400 transition hover:text-[#04E6E6]">{t_registerNav.value}</Link>
                                        </li>
                                    </>
                                ) : null}
                            </ul>
                        </div>

                        <div>
                            <h3 class="text-xs font-semibold uppercase tracking-wider text-slate-500">{t_apiNavSection.value}</h3>
                            <ul class="mt-4 space-y-2.5">
                                <li>
                                    <a href="/api/crypto/health" class="text-sm text-slate-400 transition hover:text-[#04E6E6]">{t_healthLink.value}</a>
                                </li>
                            </ul>
                        </div>
                    </div>

                    <div class="mt-12 flex flex-col items-center justify-between gap-4 border-t border-[#043234] pt-8 sm:flex-row">
                        <p class="text-xs text-slate-500">
                            &copy; {new Date().getFullYear()} {t_cryptoBrand.value}. {t_rightsReserved.value}
                        </p>
                        <div class="flex gap-6">
                            <Link href={`/${L}/privacy/`} class="text-xs text-slate-500 transition hover:text-[#04E6E6]">{t_footerPrivacy.value}</Link>
                            <Link href={`/${L}/terms/`} class="text-xs text-slate-500 transition hover:text-[#04E6E6]">{t_footerTerms.value}</Link>
                        </div>
                    </div>
                </div>
            </footer>
            ) : null}
        </div>
    );
});
